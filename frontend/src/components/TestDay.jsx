// Test day (BadgeFit): the whole PCT in one go, in its order, on the phone. Each standard shows
// how it is done and takes its score (a stopwatch for the prone bridge and the Illinois run, a
// tap counter for push-ups, the beep trainer for the beep test), then a rest counts down before
// the next. At the end: what passed, the biggest gap, and one tap to save it all. Use it for a
// baseline now and a mock PCT a week out. Logic: lib/police/test-day.js. English only.
import { useEffect, useRef, useState } from 'react'
import { TEST_ORDER, REST_SEC, scorable, testDaySummary, testDayLine } from '../lib/police/test-day.js'
import { standardById, evaluate, fmtResult, DEFAULT_BEEP_TARGET, DEFAULT_BEEP_GOAL } from '../lib/police/standards.js'
import { say, primeSpeech, stopSpeaking } from '../lib/police/voice.js'
import { NumberField, TextField } from './ui.jsx'
import BeepTrainer from './BeepTrainer.jsx'
import '../police.css'

const fmt = sec => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

function Stopwatch({ onStop, decimals = 0 }) {
  const [t0, setT0] = useState(null), [now, setNow] = useState(0)
  useEffect(() => { if (t0 == null) return; const i = setInterval(() => setNow(performance.now()), 100); return () => clearInterval(i) }, [t0])
  const el = t0 == null ? 0 : (now - t0) / 1000
  return <div className="td-sw">
    <div className="rp-time td-time">{el.toFixed(decimals)}<small>s</small></div>
    {t0 == null
      ? <button className="pf-go" onClick={() => { primeSpeech(); const n = performance.now(); setT0(n); setNow(n) }}>▶ Start clock</button>
      : <button className="bt-out" onClick={() => { const v = Number(((performance.now() - t0) / 1000).toFixed(decimals)); setT0(null); onStop(v) }}>■ Stop</button>}
  </div>
}

function ScoreInput({ id, value, onChange, onBeep }) {
  if (id === 'grip') return <div className="pf-2">
    <label>Left (kg)<NumberField value={value?.left ?? null} nullable onChange={x => onChange({ left: x, right: value?.right ?? null })} /></label>
    <label>Right (kg)<NumberField value={value?.right ?? null} nullable onChange={x => onChange({ left: value?.left ?? null, right: x })} /></label>
  </div>
  if (id === 'beep') return <>
    <button className="pf-go" onClick={onBeep}>📣 Run the beep test</button>
    <label>Or type it (level.shuttle)<TextField value={value ?? ''} inputMode="decimal" placeholder="7.2" onChange={e => onChange(e.target.value)} /></label>
  </>
  if (id === 'pushups') return <>
    <button className="td-tap" onClick={() => onChange((Number(value) || 0) + 1)}>{Number(value) || 0}<small>tap each rep</small></button>
    <label>Reps<NumberField value={value ?? null} nullable decimal={false} onChange={onChange} /></label>
  </>
  if (id === 'bridge') return <><Stopwatch onStop={onChange} /><label>Seconds held<NumberField value={value ?? null} nullable decimal={false} onChange={onChange} /></label></>
  if (id === 'illinois') return <><Stopwatch decimals={1} onStop={onChange} /><label>Seconds<NumberField value={value ?? null} nullable onChange={onChange} /></label></>
  return <label>Centimetres<NumberField value={value ?? null} nullable decimal={false} onChange={onChange} /></label>
}

export default function TestDay({ target = DEFAULT_BEEP_TARGET, goal = DEFAULT_BEEP_GOAL, testName = 'PCT', onClose, onSave }) {
  const [step, setStep] = useState(-1) // -1 intro, 0..5 a standard, 6 the read-out
  const [resting, setResting] = useState(null) // { until } between standards
  const [vals, setVals] = useState({})
  const [beep, setBeep] = useState(false)
  const [, tick] = useState(0)
  const wake = useRef(null)
  useEffect(() => () => { try { wake.current?.release() } catch { /* gone */ } stopSpeaking() }, [])
  useEffect(() => { if (!resting) return; const i = setInterval(() => tick(x => x + 1), 500); return () => clearInterval(i) }, [resting])
  useEffect(() => { if (resting && Date.now() >= resting.until) { setResting(null); say(`Rest is up. ${standardById(TEST_ORDER[step]).name}. Let us go.`) } })

  const id = TEST_ORDER[step]
  const std = id && standardById(id)
  const v = id ? vals[id] : null
  const ev = id && v != null ? evaluate(id, v, target) : null
  const setV = x => setVals(o => ({ ...o, [id]: x }))

  const begin = () => {
    primeSpeech()
    try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ }
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
      <span>🧪 Test day{step >= 0 && step < TEST_ORDER.length ? ` · ${step + 1} of ${TEST_ORDER.length}` : ''}</span>
      <span />
    </div>
    {step >= 0 && step < TEST_ORDER.length && <div className="rp-prog"><span style={{ width: `${(step / TEST_ORDER.length) * 100}%` }} /></div>}

    {step === -1 && <div className="rp-body">
      <div className="rp-emoji">🧪</div>
      <h2>Test day</h2>
      <p className="rp-sub">All six standards in the {testName} order, with 5 minutes rest between. Do it now for a baseline, and again about a week before your {testName}.</p>
      <ol className="rp-steps">{TEST_ORDER.map(x => <li key={x}>{standardById(x).icon} {standardById(x).name}</li>)}</ol>
      <p className="rp-hint">You need: a 20 m space, cones for the Illinois run, a wall for the jump, and a grip dynamometer if you have one. Skip anything you cannot test.</p>
      <button className="pf-go bt-start" onClick={begin}>▶ Start</button>
    </div>}

    {std && resting && <div className="rp-body">
      <div className="rp-kind">Rest</div>
      <div className="rp-time">{fmt((resting.until - Date.now()) / 1000)}</div>
      <p className="rp-sub">Next: {std.icon} <b>{std.name}</b>. Walk around, sip water, shake it out.</p>
      <button className="pf-link bt-again" onClick={() => setResting(null)}>Skip the rest</button>
    </div>}

    {std && !resting && <div className="rp-body td-step">
      <div className="rp-emoji">{std.icon}</div>
      <h2>{std.name}</h2>
      <p className="rp-sub">{std.how}</p>
      <p className="rp-hint">{id === 'beep' ? `Pass ${target} · goal ${goal}` : `${std.better === 'lower' ? 'At most' : 'At least'} ${std.min} ${std.unit}${std.perHand ? ' each hand' : ''}`}</p>
      <div className="td-in pf"><ScoreInput id={id} value={v} onChange={setV} onBeep={() => setBeep(true)} /></div>
      {ev && <p className={'td-ev ' + (ev.pass ? 'pass' : 'fail')}>{ev.pass ? '✅ Pass' : `${ev.pct}% of the mark`}</p>}
      <button className="pf-go bt-start" onClick={next} disabled={v != null && !scorable(id, v, target)}>{v != null && scorable(id, v, target) ? 'Next ▶' : 'Skip this one ▶'}</button>
    </div>}

    {sum && <div className="rp-body">
      <div className="rp-emoji">{sum.passed === sum.total ? '🏆' : '📋'}</div>
      <h2>{sum.passed} of {sum.tested} passed</h2>
      <div className="td-sum">{sum.rows.map(r => <div key={r.std.id} className="td-row">
        <span>{r.std.icon} {r.std.name}</span>
        <b className={r.ev ? (r.ev.pass ? 'pass' : 'fail') : ''}>{r.ev ? `${fmtResult(r.std.id, r.v)} ${r.ev.pass ? '✅' : '❌'}` : 'skipped'}</b>
      </div>)}</div>
      {sum.weakest && <p className="rp-sub">Biggest gap: <b>{sum.weakest.std.name}</b>. Hayden will put the work there.</p>}
      {sum.tested > 0 && <button className="pf-go bt-start" onClick={() => onSave(vals)}>💾 Save all to PCT</button>}
      <button className="pf-link bt-again" onClick={onClose}>Close without saving</button>
    </div>}
  </div>
}
