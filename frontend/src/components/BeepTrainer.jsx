// The beep test, on the phone (BadgeFit): set two lines 20 m apart, tap Start, and run to the
// beeps. One beep ends a shuttle, three end a level, and Hayden calls each new level. Tap
// "I'm out" when you miss the line: the score is the last shuttle completed, and it can go
// straight into the PCT tab. Timing: lib/police/beep-run.js, from the same level table the
// standard is scored with. The screen stays awake while it runs. English only.
import Icon from './Icon.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { beepSchedule, positionAt, scoreAt, timeTo } from '../lib/police/beep-run.js'
import { evaluate, DEFAULT_BEEP_TARGET, DEFAULT_BEEP_GOAL } from '../lib/police/standards.js'
import { tonePlayer } from '../lib/police/tones.js'
import { say, primeSpeech, preloadSpeech, stopSpeaking } from '../lib/police/voice.js'
import '../police.css'

const fmt = sec => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const COUNT = 5

export default function BeepTrainer({ target = DEFAULT_BEEP_TARGET, goal = DEFAULT_BEEP_GOAL, onClose, onSave }) {
  const schedule = useMemo(() => beepSchedule(), [])
  const [phase, setPhase] = useState('setup') // setup | count | run | out
  const [now, setNow] = useState(0)
  const [score, setScore] = useState('')
  const t0 = useRef(0), next = useRef(0), timer = useRef(null), countdown = useRef(null), wake = useRef(null), said = useRef(new Set())
  const tones = useRef(null)
  const goalLevel = Number(String(goal).split('.')[0]) || 7

  useEffect(() => {
    // Hayden's level calls, fetched while you set up so they play on the beep.
    for (let l = 2; l <= Math.min(21, goalLevel + 4); l++) preloadSpeech(`Level ${l}`)
    preloadSpeech('That is the pass mark. Keep going.'); preloadSpeech('Goal reached. Everything now is a bonus.')
    return () => { clearInterval(timer.current); clearInterval(countdown.current); try { wake.current?.release() } catch { /* gone */ } stopSpeaking() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const passT = timeTo(schedule, target), goalT = timeTo(schedule, goal)

  const tick = () => {
    const el = (performance.now() - t0.current) / 1000
    while (next.current < schedule.length && schedule[next.current].t <= el) {
      const b = schedule[next.current++]
      if (b.newLevel) { tones.current.level.play(); try { navigator.vibrate?.([150, 80, 150, 80, 150]) } catch { /* none */ } if (b.level < 21) say(`Level ${b.level + 1}`) }
      else { tones.current.shuttle.play(); try { navigator.vibrate?.(120) } catch { /* none */ } }
      if (passT && Math.abs(b.t - passT) < 0.01 && !said.current.has('pass')) { said.current.add('pass'); setTimeout(() => say('That is the pass mark. Keep going.'), 900) }
      if (goalT && Math.abs(b.t - goalT) < 0.01 && !said.current.has('goal')) { said.current.add('goal'); setTimeout(() => say('Goal reached. Everything now is a bonus.'), 900) }
    }
    setNow(el)
    if (next.current >= schedule.length) stop()
  }

  const start = () => {
    tones.current = { shuttle: tonePlayer({ freq: 880, ms: 260 }), level: tonePlayer({ freq: 988, ms: 160, tones: 3, gapMs: 90 }), count: tonePlayer({ freq: 660, ms: 140 }) }
    Object.values(tones.current).forEach(p => p.unlock())
    primeSpeech()
    try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ }
    t0.current = performance.now() + COUNT * 1000
    next.current = 0
    setPhase('count')
    say('Get ready. Level 1.')
    let n = COUNT
    countdown.current = setInterval(() => {
      n--
      if (n > 0 && n <= 3) tones.current.count.play()
      if (n <= 0) { clearInterval(countdown.current); tones.current.shuttle.play(); setPhase('run') }
    }, 1000)
    timer.current = setInterval(() => setNow((performance.now() - t0.current) / 1000), 100)
  }

  useEffect(() => {
    if (phase !== 'run') return
    clearInterval(timer.current)
    timer.current = setInterval(tick, 50)
    return () => clearInterval(timer.current)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function stop() {
    clearInterval(timer.current)
    const el = (performance.now() - t0.current) / 1000
    const s = scoreAt(schedule, el)
    setScore(s)
    setPhase('out')
    try { wake.current?.release() } catch { /* gone */ }
    const p = s && evaluate('beep', s, target), g = s && evaluate('beep', s, goal)
    say(!s ? 'No shuttles done. Have a breather and go again.' : g?.pass ? `Level ${s}. Goal smashed. That is a comfortable pass.` : p?.pass ? `Level ${s}. That is a pass. Now we build the margin.` : `Level ${s}. Not there yet, but now we know the gap. We close it.`)
  }

  const pos = phase === 'run' ? positionAt(schedule, now) : null
  const p = score && evaluate('beep', score, target), g = score && evaluate('beep', score, goal)

  return <div className={'rp bt ' + (phase === 'run' ? 'rp-work' : 'rp-warm')} role="dialog" aria-label="Beep test">
    <div className="rp-top">
      <button className="rp-x" onClick={() => { if (phase === 'run' && !confirm('Stop the beep test?')) return; clearInterval(timer.current); clearInterval(countdown.current); onClose() }} aria-label="Close">✕</button>
      <span>Beep test</span>
      <span>{phase === 'run' ? fmt(now) : ''}</span>
    </div>

    {phase === 'setup' && <div className="rp-body">
      <div className="rp-emoji"><Icon name="speaker" /></div>
      <h2>Beep test</h2>
      <ol className="rp-steps">
        <li>Mark two lines <b>20 m</b> apart on a flat, grippy surface (a court is perfect).</li>
        <li>Warm up 10 minutes: easy jog, a few strides.</li>
        <li>One beep: be at the other line. Three beeps: next level, a bit faster.</li>
        <li>Miss a line, catch up on the next one. Miss two in a row: tap <b>I'm out</b>.</li>
      </ol>
      <p className="rp-sub">Pass mark <b>{target}</b> (about {fmt(passT || 0)} in) · your goal <b>{goal}</b>.</p>
      <p className="rp-hint">Volume up. The screen stays on while it runs.</p>
      <button className="pf-go bt-start" onClick={start}>▶ Start</button>
    </div>}

    {phase === 'count' && <div className="rp-body">
      <div className="rp-kind">Get ready</div>
      <div className="rp-time">{Math.max(1, Math.ceil(-now))}</div>
      <p className="rp-sub">Stand behind the line.</p>
    </div>}

    {phase === 'run' && pos && !pos.finished && <div className="rp-body">
      <div className="rp-kind">Level {pos.level}</div>
      <div className="rp-time">{pos.level}.{pos.shuttle}</div>
      <div className="bt-bar" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, (1 - pos.shuttleLeft / pos.shuttleTotal) * 100))}%` }} /></div>
      <p className="rp-sub">{passT && now < passT ? `Pass mark ${target} in ${fmt(passT - now)}` : goalT && now < goalT ? `Pass mark done. Goal ${goal} in ${fmt(goalT - now)}` : 'Past your goal. Every shuttle is a bonus.'}</p>
      <button className="bt-out" onClick={stop}>I'm out</button>
    </div>}

    {phase === 'out' && <div className="rp-body">
      <div className="rp-emoji"><Icon name={g?.pass ? 'trophy' : p?.pass ? 'checkCircle' : 'arm'} /></div>
      <h2>{score ? `Level ${score}` : 'No shuttles yet'}</h2>
      {score && <p className="rp-sub">{g?.pass ? `Goal ${goal} reached: a comfortable pass.` : p?.pass ? `Pass mark ${target} reached. Goal ${goal} next.` : `${p?.pct || 0}% of the pass mark ${target}. Keep at the intervals.`}</p>}
      {score && onSave && <button className="pf-go" onClick={() => onSave(score)}>Save to PCT</button>}
      <button className="pf-link bt-again" onClick={() => { setScore(''); setNow(0); said.current = new Set(); setPhase('setup') }}>Run it again</button>
    </div>}
  </div>
}
