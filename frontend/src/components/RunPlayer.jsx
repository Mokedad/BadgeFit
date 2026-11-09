// BadgeFit guided run (lib/police/runs.js): full screen, one segment at a time. A timed segment
// counts down and moves on by itself; a distance segment (a 100 m rep) waits for a tap on Done.
// Each change beeps, vibrates and says the next step aloud, so the phone can stay in a pocket
// or an armband. The screen is kept awake while it runs. English only, like the BadgeFit hub.
import { useEffect, useRef, useState } from 'react'
import { ZONES, hrFor, runMinutes } from '../lib/police/runs.js'
import { NumberField } from './ui.jsx'
import { say, say as sayAloud } from '../lib/police/voice.js'
import { checkInMinutes, checkInLine, statLines, intenseLine } from '../lib/police/run-coach.js'
import { todayISO } from '../lib/format.js'
import '../police.css'

const fmt = sec => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const KIND = { warm: 'Warm-up', work: 'Go', rest: 'Recover', cool: 'Cool-down' }

function cue(audio, text, kind) {
  try {
    if (audio.current) {
      const ctx = audio.current, now = ctx.currentTime
      const tones = kind === 'work' ? [880, 1175] : [660]
      tones.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain()
        o.frequency.value = f; o.connect(g); g.connect(ctx.destination)
        g.gain.setValueAtTime(0.0001, now + i * 0.18)
        g.gain.exponentialRampToValueAtTime(0.4, now + i * 0.18 + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16)
        o.start(now + i * 0.18); o.stop(now + i * 0.18 + 0.17)
      })
    }
  } catch { /* no audio */ }
  try { navigator.vibrate?.(kind === 'work' ? [200, 100, 200] : [300]) } catch { /* no vibration */ }
  if (text) say(text, { music: true }).catch(() => {}) // Jarvis's voice, over your music (lib/police/voice.js)
}

export default function RunPlayer({ run, age, onClose, onLog, runLog = [] }) {
  const segs = run.segments
  const [idx, setIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [done, setDone] = useState(false)
  const [rpe, setRpe] = useState(null)
  const [km, setKm] = useState(null)
  const segStart = useRef(0), pausedAt = useRef(0), runStart = useRef(0), audio = useRef(null), wake = useRef(null)
  // Jarvis the coach (lib/police/run-coach.js): check-ins at 2, 5, 7, 10 min then every 5, a lift
  // when a hard part starts, each shown for a moment on screen too. Nothing said twice.
  const [bubble, setBubble] = useState(null)
  const said = useRef(new Set()), checked = useRef(new Set()), seed = useRef(Date.now())
  const planned = runMinutes(run)
  const stats = useRef(null)
  const coach = (text, kind = 'work') => {
    if (!text) return
    said.current.add(text)
    setBubble({ text, at: Date.now() })
    sayAloud(text, { music: true }).catch(() => {}) // the voice, not the step-text `say` below
    try { navigator.vibrate?.(kind === 'work' ? [80, 60, 80] : 60) } catch { /* none */ }
  }
  const seg = segs[idx]
  const elapsed = started ? ((paused ? pausedAt.current : now) - segStart.current) / 1000 : 0
  const left = seg?.sec != null ? seg.sec - elapsed : null
  const hr = seg ? hrFor(seg.effort, age) : null

  const say = s => `${KIND[s.kind]}. ${s.label}${s.sec ? ', ' + (s.sec >= 60 ? Math.round(s.sec / 60) + ' minutes' : s.sec + ' seconds') : ''}.`
  const go = i => {
    if (i >= segs.length) { setDone(true); cue(audio, 'Session complete. Great work.', 'cool'); return }
    setIdx(i); segStart.current = Date.now(); setNow(Date.now())
    // A hard part starting gets Jarvis's lift on top of the step itself.
    const lift = segs[i].kind === 'work' && i > 0 ? ' ' + intenseLine(run.cat, seed.current + i) : ''
    cue(audio, say(segs[i]) + lift, segs[i].kind)
    if (lift) setBubble({ text: lift.trim(), at: Date.now() })
  }
  const start = () => {
    try { audio.current = new (window.AudioContext || window.webkitAudioContext)() } catch { audio.current = null }
    try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ }
    runStart.current = Date.now(); setStarted(true); go(0)
  }
  const togglePause = () => {
    if (paused) { segStart.current += Date.now() - pausedAt.current; runStart.current += Date.now() - pausedAt.current; setPaused(false) }
    else { pausedAt.current = Date.now(); setPaused(true) }
  }

  useEffect(() => {
    if (!started || paused || done) return
    const t = setInterval(() => {
      const n = Date.now(); setNow(n)
      if (seg?.sec != null && (n - segStart.current) / 1000 >= seg.sec) go(idx + 1)
      // The check-ins, by minutes run (a pause moves runStart, so it does not count).
      const min = (n - runStart.current) / 60000
      const due = checkInMinutes(planned).find(m => min >= m && !checked.current.has(m))
      if (due != null) {
        checked.current.add(due)
        if (!stats.current) stats.current = statLines({ run, runLog, today: todayISO(), minutesSoFar: 0 })
        // Not on top of a step change: a step that just started has said its piece.
        if ((n - segStart.current) / 1000 > 4) coach(checkInLine({ cat: run.cat, minute: due, seed: seed.current, stats: stats.current, said: said.current, totalMin: planned }), 'check')
      }
      if (bubble && n - bubble.at > 6000) setBubble(null)
    }, 250)
    return () => clearInterval(t)
  }, [started, paused, done, idx, bubble]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { try { wake.current?.release() } catch { /* gone */ } try { audio.current?.close() } catch { /* gone */ } try { window.speechSynthesis?.cancel() } catch { /* none */ } }, [])

  const totalMin = Math.max(1, Math.round((Date.now() - runStart.current) / 60000))
  const next = segs[idx + 1]

  if (done) return <div className="rp rp-done" role="dialog" aria-label="Run complete">
    <div className="rp-top"><button className="rp-x" onClick={onClose} aria-label="Close">✕</button></div>
    <div className="rp-body">
      <div className="rp-emoji" aria-hidden="true">🏁</div>
      <h2>{run.name}: done</h2>
      <p className="rp-sub">{totalMin} min. Every one of these is a level on test day.</p>
      <p className="rp-q">How hard was it?</p>
      <div className="rp-rpe">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <button key={n} className={rpe === n ? 'on' : ''} onClick={() => setRpe(n)} aria-pressed={rpe === n}>{n}</button>)}</div>
      <p className="rp-hint">1 very easy · 5 steady · 8 hard · 10 everything</p>
      <label className="rp-km">Distance (km, optional)<NumberField value={km} nullable onChange={setKm} /></label>
      <button className="rp-main" onClick={() => onLog({ run: run.id, min: totalMin, km: km || null, rpe })}>Save run</button>
    </div>
  </div>

  return <div className={'rp rp-' + (seg?.kind || 'warm') + (paused ? ' paused' : '')} role="dialog" aria-label={run.name}>
    <div className="rp-top">
      <button className="rp-x" onClick={onClose} aria-label="End run">✕</button>
      <span>{run.name}</span>
      <span>{started ? fmt((now - runStart.current) / 1000) : `~${runMinutes(run)} min`}</span>
    </div>
    <div className="rp-prog"><span style={{ width: (started ? (idx / segs.length) * 100 : 0) + '%' }} /></div>
    {!started ? <div className="rp-body">
      <div className="rp-emoji" aria-hidden="true">🏃</div>
      <h2>{run.name}</h2>
      <p className="rp-sub">{run.why}</p>
      <ol className="rp-steps">{segs.filter(s => !s.round || s.round === 1).slice(0, 10).map((s, i) => <li key={i}><b>{KIND[s.kind]}</b> {s.label}{s.of ? ` ×${s.of}` : ''}</li>)}</ol>
      <p className="rp-hint">🎵 Start Spotify or YouTube first, then tap Start. Jarvis talks over your music: each change, and a check-in at 2, 5, 7 and 10 minutes.</p>
      <button className="rp-main" onClick={start}>▶ Start</button>
    </div> : <div className="rp-body">
      <div className="rp-kind">{KIND[seg.kind]}{seg.of ? ` · ${seg.round} of ${seg.of}` : ''}</div>
      <div className="rp-label">{seg.label}</div>
      <div className="rp-time" aria-live="off">{left != null ? fmt(left) : fmt(elapsed)}</div>
      {seg.dist && <button className="rp-main" onClick={() => go(idx + 1)}>✓ Done {seg.dist} m</button>}
      <div className="rp-zone">{ZONES[seg.effort]?.name}{hr ? ` · ${hr.lo}-${hr.hi} bpm` : ''}<br /><small>{ZONES[seg.effort]?.feel}</small></div>
      {bubble && <div className="rp-bubble" role="status"><span className="pf-orb" aria-hidden="true" />{bubble.text}</div>}
      {next && <div className="rp-next">Next: <b>{KIND[next.kind]}</b> {next.label}{next.sec ? ` · ${fmt(next.sec)}` : ''}</div>}
      <div className="rp-ctl">
        <button onClick={() => idx > 0 && go(idx - 1)} aria-label="Previous step" disabled={idx === 0}>⏮</button>
        <button className="rp-pause" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>{paused ? '▶' : '⏸'}</button>
        <button onClick={() => go(idx + 1)} aria-label="Next step">⏭</button>
      </div>
    </div>}
  </div>
}
