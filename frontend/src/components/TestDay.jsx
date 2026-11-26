// Test day (BadgeFit): the whole PCT in one go, in its order, on the phone. Each standard shows
// how it is done and takes its score (a 90 s hold for the prone bridge, push-ups to a beat, a
// stopwatch with 3-2-1 for the Illinois run, the phone feeling the jump, the beep trainer saving
// its own level; grip needs a dynamometer), then a rest counts down before
// the next. At the end: what passed, the biggest gap, and one tap to save it all. Use it for a
// baseline now and a mock PCT a week out. Logic: lib/police/test-day.js. English only.
import { screenOn } from '../lib/wakelock.js'
import Icon from './Icon.jsx'
import { iconFor } from '../lib/police/emoji-icon.js'
import { useEffect, useRef, useState } from 'react'
import { TEST_ORDER, REST_SEC, scorable, testDaySummary, testDayLine } from '../lib/police/test-day.js'
import { standardById, evaluate, fmtResult, DEFAULT_BEEP_TARGET, DEFAULT_BEEP_GOAL } from '../lib/police/standards.js'
import { say, primeSpeech, stopSpeaking } from '../lib/police/voice.js'
import { NumberField } from './ui.jsx'
import { tonePlayer } from '../lib/police/tones.js'
import { cadenceAt } from '../lib/police/pushup-cadence.js'
import { airTime, jumpCm, gOf } from '../lib/police/jump-meter.js'
import BeepTrainer from './BeepTrainer.jsx'
import '../police.css'

const fmt = sec => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

// Three short tones the test screens share, made on the tap that starts (so the phone lets them play).
const makeTones = () => {
  const t = { go: tonePlayer({ freq: 880, ms: 260 }), count: tonePlayer({ freq: 660, ms: 140 }), low: tonePlayer({ freq: 520, ms: 180 }), high: tonePlayer({ freq: 990, ms: 180 }) }
  Object.values(t).forEach(p => p.unlock())
  return t
}
const COUNT_IN = 3

/** A stopwatch with 3, 2, 1, go, and the mark to beat drawn under it (the Illinois run: 20 s). */
function Stopwatch({ onStop, decimals = 0, mark = null }) {
  const [t0, setT0] = useState(null), [now, setNow] = useState(0)
  const tones = useRef(null), beeped = useRef(0)
  useEffect(() => {
    if (t0 == null) return
    const i = setInterval(() => {
      const n = performance.now(), left = Math.ceil((t0 - n) / 1000)
      if (left > 0 && left !== beeped.current) { beeped.current = left; tones.current?.count.play() }
      if (left <= 0 && beeped.current !== 'go') { beeped.current = 'go'; tones.current?.go.play() }
      setNow(n)
    }, 50)
    return () => clearInterval(i)
  }, [t0])
  const el = t0 == null ? 0 : (now - t0) / 1000
  const start = () => { primeSpeech(); tones.current = makeTones(); beeped.current = 0; const n = performance.now(); setT0(n + COUNT_IN * 1000); setNow(n) }
  return <div className="td-sw">
    <div className={'rp-time td-time' + (mark && el > mark ? ' over' : '')}>{el < 0 ? Math.ceil(-el) : el.toFixed(decimals)}{el >= 0 && <small>s</small>}</div>
    {mark != null && <div className="td-mark" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, el / mark) * 100)}%` }} /><i>{mark} s</i></div>}
    {t0 == null
      ? <button className="pf-go" onClick={start}>▶ Start</button>
      : <button className="bt-out" disabled={el < 0} onClick={() => { const v = Number(el.toFixed(decimals)); setT0(null); onStop(v) }}>■ Stop</button>}
  </div>
}

/** The prone bridge: hold for 90 s. Hayden calls the time, and 90 stops by itself as a pass. */
function HoldTimer({ goal = 90, onStop }) {
  const [t0, setT0] = useState(null), [now, setNow] = useState(0)
  const said = useRef(new Set())
  const done = useRef(onStop); done.current = onStop
  useEffect(() => {
    if (t0 == null) return
    const i = setInterval(() => {
      const n = performance.now(), el = (n - t0) / 1000
      for (const [at, line] of [[30, '30 seconds'], [45, 'Halfway'], [60, '30 to go'], [80, '10 to go']]) if (el >= at && !said.current.has(at)) { said.current.add(at); say(line) }
      if (el >= goal) { clearInterval(i); setT0(null); say('Time. That is a pass.'); done.current(goal); return }
      setNow(n)
    }, 100)
    return () => clearInterval(i)
  }, [t0, goal])
  const el = t0 == null ? 0 : Math.min(goal, Math.max(0, (now - t0) / 1000))
  return <div className="td-sw">
    <div className="td-ring" style={{ '--p': `${(el / goal) * 100}%` }}><div className="rp-time td-time">{Math.floor(el)}<small>/ {goal} s</small></div></div>
    {t0 == null
      ? <button className="pf-go" onClick={() => { primeSpeech(); said.current = new Set(); const n = performance.now(); setT0(n); setNow(n); say(`Hold. ${goal} seconds.`) }}>▶ Start {goal} s</button>
      : <button className="bt-out" onClick={() => { const v = Math.floor((performance.now() - t0) / 1000); setT0(null); say(`${v} seconds.`); onStop(v) }}>■ Dropped</button>}
  </div>
}

/** Push-ups to the beat: down on the low beep, up on the high one, Hayden counts. 25 is a pass. */
function PushupCadence({ goal = 25, value, onChange }) {
  const [t0, setT0] = useState(null), [now, setNow] = useState(0)
  const tones = useRef(null), last = useRef(null)
  const set = useRef(onChange); set.current = onChange
  useEffect(() => {
    if (t0 == null) return
    const i = setInterval(() => {
      const n = performance.now(), c = cadenceAt(n - t0), key = c.reps + c.phase
      if (c.phase === 'ready') { const left = Math.ceil((t0 - n) / 1000); if (last.current !== 'r' + left) { last.current = 'r' + left; tones.current?.count.play() } }
      else if (key !== last.current) {
        last.current = key
        if (c.phase === 'down') { tones.current?.low.play(); if (c.reps > 0) { set.current(c.reps); say(String(c.reps)) } } else tones.current?.high.play()
      }
      if (c.reps >= goal) { clearInterval(i); setT0(null); set.current(goal); say(`${goal}. That is a pass.`); return }
      setNow(n)
    }, 40)
    return () => clearInterval(i)
  }, [t0, goal])
  const c = t0 == null ? null : cadenceAt(now - t0)
  const start = () => { primeSpeech(); tones.current = makeTones(); last.current = null; onChange(0); say('Down on the low beep, up on the high beep.'); const n = performance.now(); setT0(n + (COUNT_IN + 1) * 1000); setNow(n) }
  return <div className="td-sw">
    <div className="rp-time td-time">{Number(value) || 0}<small>/ {goal}</small></div>
    {c && <div className={'td-phase ' + c.phase}>{c.phase === 'ready' ? `Get ready · ${Math.max(1, Math.ceil(-(now - t0) / 1000))}` : c.phase === 'down' ? '▼ Down' : '▲ Up'}</div>}
    {t0 == null
      ? <button className="pf-go" onClick={start}>▶ Start to the beat</button>
      : <button className="bt-out" onClick={() => { const r = cadenceAt(performance.now() - t0).reps; setT0(null); onChange(r); say(`${r} push-ups.`) }}>■ Stop</button>}
  </div>
}

/** The vertical jump, estimated: the phone held to the chest feels the time in the air. */
function JumpMeter({ onResult }) {
  const [phase, setPhase] = useState('idle') // idle | ready | jump | done | none
  const samples = useRef([]), timers = useRef([]), handler = useRef(null)
  const stop = () => { if (handler.current) window.removeEventListener('devicemotion', handler.current); handler.current = null; timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => stop, [])
  const finish = () => {
    const got = samples.current.length > 20
    stop()
    if (!got) { setPhase('none'); return }
    const cm = jumpCm(airTime(samples.current))
    setPhase('done')
    if (cm) { onResult(cm); say(`About ${cm} centimetres.`) } else say('No jump felt. Try again.')
  }
  const start = async () => {
    primeSpeech()
    try {
      const DM = typeof window !== 'undefined' ? window.DeviceMotionEvent : undefined
      if (!DM) { setPhase('none'); return }
      if (typeof DM.requestPermission === 'function' && (await DM.requestPermission()) !== 'granted') { setPhase('none'); return }
    } catch { setPhase('none'); return }
    const tones = makeTones()
    samples.current = []
    handler.current = e => { samples.current.push({ t: performance.now(), g: gOf(e) }) }
    window.addEventListener('devicemotion', handler.current)
    setPhase('ready')
    say('Hold the phone flat to your chest with both hands. Jump on the beep.')
    timers.current.push(setTimeout(() => { tones.go.play(); setPhase('jump') }, 3500))
    timers.current.push(setTimeout(finish, 9000))
  }
  return <div className="td-sw">
    {phase === 'ready' && <div className="td-phase">Phone to your chest · wait for the beep</div>}
    {phase === 'jump' && <><div className="td-phase down">Jump!</div><button className="bt-out" onClick={finish}>Done</button></>}
    {phase === 'none' && <p className="rp-hint">This phone cannot feel the jump here. Measure on a wall and type it in.</p>}
    {(phase === 'idle' || phase === 'done') && <button className="pf-go" onClick={start}><Icon name="phoneScreen" /> {phase === 'done' ? 'Jump again' : 'Measure with the phone'}</button>}
    {phase === 'done' && <p className="rp-hint">An estimate from your time in the air. A wall test with arm swing reads a little higher: change it if you have one.</p>}
  </div>
}

function ScoreInput({ id, value, onChange, onBeep }) {
  if (id === 'grip') return <>
    <div className="pf-2">
      <label>Left (kg)<NumberField className="field" value={value?.left ?? null} nullable onChange={x => onChange({ left: x, right: value?.right ?? null })} /></label>
      <label>Right (kg)<NumberField className="field" value={value?.right ?? null} nullable onChange={x => onChange({ left: value?.left ?? null, right: x })} /></label>
    </div>
    <p className="rp-hint">Needs a grip dynamometer: a phone cannot feel how hard you squeeze.</p>
  </>
  if (id === 'beep') return <>
    <button className="pf-go" onClick={onBeep}>▶ Run the beep test</button>
    <p className="rp-hint">Your level goes in by itself when you stop.</p>
  </>
  if (id === 'pushups') return <>
    <PushupCadence value={value} onChange={onChange} />
    <label>Reps<NumberField className="field" value={value ?? null} nullable decimal={false} onChange={onChange} /></label>
  </>
  if (id === 'bridge') return <><HoldTimer onStop={onChange} /><label>Seconds held<NumberField className="field" value={value ?? null} nullable decimal={false} onChange={onChange} /></label></>
  if (id === 'illinois') return <><Stopwatch decimals={1} mark={standardById('illinois').min} onStop={onChange} /><label>Seconds<NumberField className="field" value={value ?? null} nullable onChange={onChange} /></label></>
  return <><JumpMeter onResult={onChange} /><label>Centimetres<NumberField className="field" value={value ?? null} nullable decimal={false} onChange={onChange} /></label></>
}

export default function TestDay({ target = DEFAULT_BEEP_TARGET, goal = DEFAULT_BEEP_GOAL, testName = 'PCT', onClose, onSave }) {
  const [step, setStep] = useState(-1) // -1 intro, 0..5 a standard, 6 the read-out
  const [resting, setResting] = useState(null) // { until } between standards
  const [vals, setVals] = useState({})
  const [beep, setBeep] = useState(false)
  const [, tick] = useState(0)
  const wake = useRef(null)
  useEffect(() => () => { try { wake.current?.release() } catch { /* gone */ } screenOn('test', false); stopSpeaking() }, [])
  useEffect(() => { if (!resting) return; const i = setInterval(() => tick(x => x + 1), 500); return () => clearInterval(i) }, [resting])
  useEffect(() => { if (resting && Date.now() >= resting.until) { setResting(null); say(`Rest is up. ${standardById(TEST_ORDER[step]).name}. Let us go.`) } })

  const id = TEST_ORDER[step]
  const std = id && standardById(id)
  const v = id ? vals[id] : null
  const ev = id && v != null ? evaluate(id, v, target) : null
  const setV = x => setVals(o => ({ ...o, [id]: x }))

  const begin = () => {
    primeSpeech()
    try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ } screenOn('test', true);
    setStep(0)
    say(`Test day. First, ${standardById(TEST_ORDER[0]).name.toLowerCase()}. ${standardById(TEST_ORDER[0]).how}`)
  }
  const next = () => {
    primeSpeech()
    const n = step + 1
    if (n >= TEST_ORDER.length) {
      setStep(n)
      say(testDayLine(testDaySummary(vals, target), testName))
      return
    }
    setStep(n)
    setResting({ until: Date.now() + REST_SEC * 1000 })
    say(`Good. Five minutes rest. Next up, ${standardById(TEST_ORDER[n]).name.toLowerCase()}.`)
  }

  const sum = step >= TEST_ORDER.length ? testDaySummary(vals, target) : null

  if (beep) return <BeepTrainer target={target} goal={goal} onClose={() => setBeep(false)} onSave={s => { setVals(o => ({ ...o, beep: s })); setBeep(false) }} />

  return <div className="rp td rp-warm" role="dialog" aria-label="Test day">
    <div className="rp-top">
      <button className="rp-x" onClick={() => { if (step >= 0 && step < TEST_ORDER.length && !confirm('Leave test day? Scores not saved are lost.')) return; onClose() }} aria-label="Close">✕</button>
      <span>Test day{step >= 0 && step < TEST_ORDER.length ? ` · ${step + 1} of ${TEST_ORDER.length}` : ''}</span>
      <span />
    </div>
    {step >= 0 && step < TEST_ORDER.length && <div className="rp-prog"><span style={{ width: `${(step / TEST_ORDER.length) * 100}%` }} /></div>}

    {step === -1 && <div className="rp-body">
      <div className="rp-emoji"><Icon name="clipboard" /></div>
      <h2>Test day</h2>
      <p className="rp-sub">All six standards in the {testName} order, with 5 minutes rest between. Do it now for a baseline, and again about a week before your {testName}.</p>
      <ol className="rp-steps">{TEST_ORDER.map(x => <li key={x}><Icon name={iconFor(standardById(x).icon)} /> {standardById(x).name}</li>)}</ol>
      <p className="rp-hint">You need: a 20 m space, cones for the Illinois run, a wall for the jump, and a grip dynamometer if you have one. Skip anything you cannot test.</p>
      <button className="pf-go bt-start" onClick={begin}>▶ Start</button>
    </div>}

    {std && resting && <div className="rp-body">
      <div className="rp-kind">Rest</div>
      <div className="rp-time">{fmt((resting.until - Date.now()) / 1000)}</div>
      <p className="rp-sub">Next: <Icon name={iconFor(std.icon)} /> <b>{std.name}</b>. Walk around, sip water, shake it out.</p>
      <button className="pf-link bt-again" onClick={() => setResting(null)}>Skip the rest</button>
    </div>}

    {std && !resting && <div className="rp-body td-step">
      <div className="rp-emoji"><Icon name={iconFor(std.icon)} /></div>
      <h2>{std.name}</h2>
      <p className="rp-sub">{std.how}</p>
      <p className="rp-hint">{id === 'beep' ? `Pass ${target} · goal ${goal}` : `${std.better === 'lower' ? 'At most' : 'At least'} ${std.min} ${std.unit}${std.perHand ? ' each hand' : ''}`}</p>
      <div className="td-in pf"><ScoreInput id={id} value={v} onChange={setV} onBeep={() => setBeep(true)} /></div>
      {ev && <p className={'td-ev ' + (ev.pass ? 'pass' : 'fail')}>{ev.pass ? 'Pass' : `${ev.pct}% of the mark`}</p>}
      <button className="pf-go bt-start" onClick={next} disabled={v != null && !scorable(id, v, target)}>{v != null && scorable(id, v, target) ? 'Next ▶' : 'Skip this one ▶'}</button>
    </div>}

    {sum && <div className="rp-body">
      <div className="rp-emoji"><Icon name={sum.passed === sum.total ? 'trophy' : 'clipboard'} /></div>
      <h2>{sum.passed} of {sum.tested} passed</h2>
      <div className="td-sum">{sum.rows.map(r => <div key={r.std.id} className="td-row">
        <span><Icon name={iconFor(r.std.icon)} /> {r.std.name}</span>
        <b className={r.ev ? (r.ev.pass ? 'pass' : 'fail') : ''}>{r.ev ? <>{fmtResult(r.std.id, r.v)} <Icon name={r.ev.pass ? 'check' : 'xmark'} /></> : 'skipped'}</b>
      </div>)}</div>
      {sum.weakest && <p className="rp-sub">Biggest gap: <b>{sum.weakest.std.name}</b>. Hayden will put the work there.</p>}
      {sum.tested > 0 && <button className="pf-go bt-start" onClick={() => onSave(vals)}>Save all to PCT</button>}
      <button className="pf-link bt-again" onClick={onClose}>Close without saving</button>
    </div>}
  </div>
}
