// BadgeFit guided run (lib/police/runs.js): full screen, one segment at a time. A timed segment
// counts down and moves on by itself; a distance segment (a 100 m rep) waits for a tap on Done.
// Each change beeps, vibrates and says the next step aloud, so the phone can stay in a pocket
// or an armband. The screen is kept awake while it runs. English only, like the BadgeFit hub.
import { useEffect, useRef, useState } from 'react'
import { ZONES, hrFor, runMinutes } from '../lib/police/runs.js'
import { NumberField } from './ui.jsx'
import { say } from '../lib/police/voice.js'
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
  if (text) say(text).catch(() => {}) // Jarvis's Australian voice (lib/police/voice.js)
}

export default function RunPlayer({ run, age, onClose, onLog }) {
  const segs = run.segments
  const [idx, setIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [done, setDone] = useState(false)
  const [rpe, setRpe] = useState(null)
  const [km, setKm] = useState(null)
  const segStart = useRef(0), pausedAt = useRef(0), runStart = useRef(0), audio = useRef(null), wake = useRef(null)
  const seg = segs[idx]
  const elapsed = started ? ((paused ? pausedAt.current : now) - segStart.current) / 1000 : 0
  const left = seg?.sec != null ? seg.sec - elapsed : null
  const hr = seg ? hrFor(seg.effort, age) : null

  const say = s => `${KIND[s.kind]}. ${s.label}${s.sec ? ', ' + (s.sec >= 60 ? Math.round(s.sec / 60) + ' minutes' : s.sec + ' seconds') : ''}.`
  const go = i => {
    if (i >= segs.length) { setDone(true); cue(audio, 'Session complete. Great work.', 'cool'); return }
    setIdx(i); segStart.current = Date.now(); setNow(Date.now())
    cue(audio, say(segs[i]), segs[i].kind)
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
    }, 250)
    return () => clearInterval(t)
  }, [started, paused, done, idx]) // eslint-disable-line react-hooks/exhaustive-deps
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
      <p className="rp-hint">Beeps, vibration and a voice tell you each change. Keep the screen on, music on top is fine.</p>
      <button className="rp-main" onClick={start}>▶ Start</button>
    </div> : <div className="rp-body">
      <div className="rp-kind">{KIND[seg.kind]}{seg.of ? ` · ${seg.round} of ${seg.of}` : ''}</div>
      <div className="rp-label">{seg.label}</div>
      <div className="rp-time" aria-live="off">{left != null ? fmt(left) : fmt(elapsed)}</div>
      {seg.dist && <button className="rp-main" onClick={() => go(idx + 1)}>✓ Done {seg.dist} m</button>}
      <div className="rp-zone">{ZONES[seg.effort]?.name}{hr ? ` · ${hr.lo}-${hr.hi} bpm` : ''}<br /><small>{ZONES[seg.effort]?.feel}</small></div>
      {next && <div className="rp-next">Next: <b>{KIND[next.kind]}</b> {next.label}{next.sec ? ` · ${fmt(next.sec)}` : ''}</div>}
      <div className="rp-ctl">
        <button onClick={() => idx > 0 && go(idx - 1)} aria-label="Previous step" disabled={idx === 0}>⏮</button>
        <button className="rp-pause" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>{paused ? '▶' : '⏸'}</button>
        <button onClick={() => go(idx + 1)} aria-label="Next step">⏭</button>
      </div>
    </div>}
  </div>
}
