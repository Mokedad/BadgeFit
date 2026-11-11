// BadgeFit guided run (lib/police/runs.js): full screen, one segment at a time. A timed segment
// counts down and moves on by itself; a distance segment (a 100 m rep) waits for a tap on Done.
// Each change beeps, vibrates and says the next step aloud, so the phone can stay in a pocket
// or an armband. The screen is kept awake while it runs. English only, like the BadgeFit hub.
import { useEffect, useRef, useState } from 'react'
import { ZONES, hrFor, runMinutes, segSeconds, seekRun, runSecondsAt } from '../lib/police/runs.js'
import { NumberField } from './ui.jsx'
import { say, say as sayAloud } from '../lib/police/voice.js'
import { checkInMinutes, checkInLine, statLines, intenseLine } from '../lib/police/run-coach.js'
import { runResult } from '../lib/police/run-result.js'
import { todayISO } from '../lib/format.js'
import '../police.css'

const fmt = sec => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const KIND = { warm: 'Warm-up', work: 'Go', rest: 'Recover', cool: 'Cool-down' }

function cue(audio, text, kind, music = false) {
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
  // The natural Gemini voice; in music mode the phone's own voice, which talks over Spotify.
  if (text) say(text, { music }).catch(() => {})
}

export default function RunPlayer({ run, age, onClose, onLog, onUpdate, onUnlog, runLog = [], musicMode = false, minimized = false, onMinimize, onRestore }) {
  const segs = run.segments
  const [idx, setIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [done, setDone] = useState(false)
  const [result, setResult] = useState(null) // runResult(): what was run, saved the moment it ends
  const savedId = useRef(null)
  const track = useRef(null), dragging = useRef(false)
  const [km, setKm] = useState(null)
  const segStart = useRef(0), pausedAt = useRef(0), runStart = useRef(0), audio = useRef(null), wake = useRef(null)
  // Hayden the coach (lib/police/run-coach.js): check-ins at 2, 5, 7, 10 min then every 5, a lift
  // when a hard part starts, each shown for a moment on screen too. Nothing said twice.
  const [bubble, setBubble] = useState(null)
  const said = useRef(new Set()), checked = useRef(new Set()), seed = useRef(Date.now())
  const planned = runMinutes(run)
  const stats = useRef(null)
  const coach = (text, kind = 'work') => {
    if (!text) return
    said.current.add(text)
    setBubble({ text, at: Date.now() })
    sayAloud(text, { music: musicMode }).catch(() => {}) // the voice, not the step-text `say` below
    try { navigator.vibrate?.(kind === 'work' ? [80, 60, 80] : 60) } catch { /* none */ }
  }
  const seg = segs[idx]
  const elapsed = started ? ((paused ? pausedAt.current : now) - segStart.current) / 1000 : 0
  const left = seg?.sec != null ? seg.sec - elapsed : null
  const hr = seg ? hrFor(seg.effort, age) : null

  const say = s => `${KIND[s.kind]}. ${s.label}${s.sec ? ', ' + (s.sec >= 60 ? Math.round(s.sec / 60) + ' minutes' : s.sec + ' seconds') : ''}.`
  const go = i => {
    if (i >= segs.length) { cue(audio, '', 'cool', musicMode); finish(true); return }
    setIdx(i); segStart.current = Date.now(); setNow(Date.now())
    // A hard part starting gets Hayden's lift on top of the step itself.
    const lift = segs[i].kind === 'work' && i > 0 ? ' ' + intenseLine(run.cat, seed.current + i) : ''
    cue(audio, say(segs[i]) + lift, segs[i].kind, musicMode)
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
      if (seg?.sec != null && (n - segStart.current) / 1000 >= seg.sec) {
        // Back from another app (the phone stops the page meanwhile): jump to where the run is
        // now, past every timed step that went by, with one call instead of one for each.
        const sk = seekRun(run, (n - runStart.current) / 1000)
        const timedBetween = segs.slice(idx, sk.idx).every(x => x.sec != null)
        const total = segs.reduce((a, x) => a + segSeconds(x), 0)
        if (timedBetween && segs.every(x => x.sec != null) && (n - runStart.current) / 1000 >= total) { cue(audio, '', 'cool', musicMode); finish(true); return }
        if (timedBetween && sk.idx > idx && sk.offset > 2) {
          setIdx(sk.idx); segStart.current = n - sk.offset * 1000
          for (const mm of checkInMinutes(planned)) if (mm < (n - runStart.current) / 60000) checked.current.add(mm)
          cue(audio, say(segs[sk.idx]), segs[sk.idx].kind, musicMode)
          return
        }
        go(idx + 1)
      }
      // The check-ins, by minutes run (a pause moves runStart, so it does not count).
      const min = (n - runStart.current) / 60000
      // Back after a while away: the check-ins missed meanwhile are passed over, and only the
      // latest is said, if it is still fresh (within a minute).
      const dues = checkInMinutes(planned).filter(m => min >= m && !checked.current.has(m))
      for (const m of dues) checked.current.add(m)
      const due = dues.length && min - dues[dues.length - 1] < 1 ? dues[dues.length - 1] : null
      if (due != null) {
        if (!stats.current) stats.current = statLines({ run, runLog, today: todayISO(), minutesSoFar: 0 })
        // Not on top of a step change: a step that just started has said its piece.
        if ((n - segStart.current) / 1000 > 4) coach(checkInLine({ cat: run.cat, minute: due, seed: seed.current, stats: stats.current, said: said.current, totalMin: planned }), 'check')
      }
      if (bubble && n - bubble.at > 6000) setBubble(null)
    }, 250)
    return () => clearInterval(t)
  }, [started, paused, done, idx, bubble]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { try { wake.current?.release() } catch { /* gone */ } try { audio.current?.close() } catch { /* gone */ } try { window.speechSynthesis?.cancel() } catch { /* none */ } }, [])

  const next = segs[idx + 1]

  // The timeline: seconds into the whole run, for the runner on the track and for dragging him.
  const totalSec = segs.reduce((a, x) => a + segSeconds(x), 0)
  const inSeg = started ? Math.max(0, ((paused ? pausedAt.current : now) - segStart.current) / 1000) : 0
  const atSec = started ? Math.min(totalSec, runSecondsAt(run, idx, Math.min(inSeg, segSeconds(seg || {}) || inSeg))) : 0
  const pct = totalSec ? (atSec / totalSec) * 100 : 0
  const dragTo = e => {
    const r = track.current?.getBoundingClientRect()
    if (!r) return
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * totalSec
    const at = seekRun(run, t)
    const base = paused ? pausedAt.current : Date.now()
    dragging.current = true
    if (at.idx !== idx) setIdx(at.idx)
    segStart.current = base - at.offset * 1000
    runStart.current = base - t * 1000
    // The check-ins already passed are not said in a rush after a jump forward.
    checkInMinutes(planned).forEach(m => { if (m <= t / 60) checked.current.add(m) })
    setNow(Date.now())
  }
  const endDrag = () => {
    if (!dragging.current) return
    dragging.current = false
    try { navigator.vibrate?.(30) } catch { /* none */ }
    if (seg && !paused) cue(audio, `${KIND[seg.kind]}. ${seg.label}.`, seg.kind, musicMode)
  }

  // Leaving mid-run keeps it running in a bar at the bottom, like music (⏸ pauses, ✕ ends). The
  // clock is wall time, so it carries on while you look at Home or another app.
  const leave = () => {
    if (!started || done || !onMinimize) { onClose(); return }
    onMinimize()
  }
  // The end, finished or stopped early: saved at once, so it counts in the stats whatever happens
  // next, then the congratulations (lib/police/run-result.js).
  const finish = completed => {
    const ranSec = ((paused ? pausedAt.current : Date.now()) - runStart.current) / 1000
    const res = runResult({ run, ranSec, completed, runLog, today: todayISO(), seed: seed.current })
    if (!paused) { pausedAt.current = Date.now(); setPaused(true) }
    setResult(res)
    setDone(true)
    savedId.current = onLog({ run: run.id, min: res.min, planned: res.planned, completed, pct: res.pct })
    try { wake.current?.release() } catch { /* gone */ }
    sayAloud(res.line, { music: musicMode }).catch(() => {})
    try { navigator.vibrate?.([100, 60, 100, 60, 200]) } catch { /* none */ }
    onRestore?.()
  }
  const end = () => {
    const ranMin = (((paused ? pausedAt.current : Date.now()) - runStart.current) / 60000)
    if (ranMin < 1) { if (confirm('End this run? Under a minute is not saved.')) onClose(); return }
    if (!confirm('End the run here? What you have done is saved.')) return
    finish(false)
  }
  const note = patch => { if (savedId.current) onUpdate?.(savedId.current, patch) }
  // Ended by mistake (Skip at the last step, End): back to the run where it stopped, paused, and
  // the save undone, so the run is saved once, when it really ends.
  const back = () => {
    if (savedId.current) onUnlog?.(savedId.current)
    savedId.current = null
    setResult(null); setKm(null)
    // A step whose time had run out starts again, or ▶ would end the run at once.
    if (seg?.sec != null && (pausedAt.current - segStart.current) / 1000 >= seg.sec - 1) segStart.current = pausedAt.current
    setDone(false)
    try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ }
  }

  if (minimized && !done) {
    const t = started ? fmt(((paused ? pausedAt.current : now) - runStart.current) / 1000) : ''
    return <div className="rp-mini" role="region" aria-label={run.name}>
      <button className="rp-mini-m" onClick={onRestore} aria-label="Open the run">
        <span aria-hidden="true">🏃</span>
        <span><b>{run.name}</b><small>{paused ? `Paused · ${t}` : `${seg ? KIND[seg.kind] : ''} · ${left != null ? fmt(left) : t}`}</small></span>
      </button>
      <button className="rp-mini-b" onClick={togglePause} aria-label={paused ? 'Resume run' : 'Pause run'}>{paused ? '▶' : '⏸'}</button>
      <button className="rp-mini-b" onClick={end} aria-label="End run">✕</button>
    </div>
  }

  if (done && result) return <div className="rp rp-done" role="dialog" aria-label="Run complete">
    <div className="rp-top"><button className="rp-x" onClick={back} aria-label="Back to the run" title="Back to the run">←</button></div>
    <div className="rp-body">
      <div className="rp-party" aria-hidden="true">{['🥳', '🎉', '🏃', '💪', '🎉', '🥳'].map((e, i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>{e}</span>)}</div>
      <h2>{result.headline}</h2>
      <p className="rp-sub">{result.completed ? `${run.name}, all of it.` : `You did ${result.min} of ${result.planned} minutes. It counts.`} <b>Saved ✅</b></p>
      <div className="rp-stats">
        <div><b>{result.min}</b><span>minutes</span></div>
        <div><b>{result.pct}%</b><span>of the run</span></div>
        <div><b>{result.weekRuns}</b><span>runs this week</span></div>
        <div><b>{result.weekMin}</b><span>min this week</span></div>
      </div>
      <label className="rp-km">Distance (km, optional)<NumberField value={km} nullable onChange={v => { setKm(v); note({ km: v || null }) }} /></label>
      <button className="rp-main" onClick={onClose}>Done 🥳</button>
    </div>
  </div>


  return <div className={'rp rp-' + (seg?.kind || 'warm') + (paused ? ' paused' : '')} role="dialog" aria-label={run.name}>
    <div className="rp-top">
      <button className="rp-x" onClick={leave} aria-label={started ? 'Minimise, the run keeps going' : 'Close'} title={started ? 'Minimise, the run keeps going' : 'Close'}>{started ? '⌄' : '✕'}</button>
      <span>{run.name}</span>
      <span>{started ? fmt((now - runStart.current) / 1000) : `~${runMinutes(run)} min`}</span>
    </div>
    {/* The runner crosses the track as the run goes, start to finish; drag him to move the time. */}
    <div className={'rp-track' + (started ? ' live' : '')} ref={track}
      onPointerDown={started ? e => { e.currentTarget.setPointerCapture?.(e.pointerId); dragTo(e) } : undefined}
      onPointerMove={started ? e => { if (e.buttons || e.pointerType === 'touch') dragTo(e) } : undefined}
      onPointerUp={started ? endDrag : undefined} onPointerCancel={started ? endDrag : undefined}
      role={started ? 'slider' : undefined} aria-label="Run progress" aria-valuemin={0} aria-valuemax={totalSec} aria-valuenow={Math.round(atSec)}>
      <span className="rp-track-fill" style={{ width: pct + '%' }} />
      <span className="rp-runner" style={{ left: pct + '%' }} aria-hidden="true">🏃</span>
      <span className="rp-flag" aria-hidden="true">🏁</span>
    </div>
    {!started ? <div className="rp-body">
      <div className="rp-emoji" aria-hidden="true">🏃</div>
      <h2>{run.name}</h2>
      <p className="rp-sub">{run.why}</p>
      <ol className="rp-steps">{segs.filter(s => !s.round || s.round === 1).slice(0, 10).map((s, i) => <li key={i}><b>{KIND[s.kind]}</b> {s.label}{s.of ? ` ×${s.of}` : ''}</li>)}</ol>
      <p className="rp-hint">{musicMode ? '🎵 Music mode: start Spotify or YouTube first, then tap Start. Hayden talks over your music.' : '🎧 Hayden talks you through each change, with a check-in at 2, 5, 7 and 10 minutes. Playing music? Turn on Music mode on the Hayden card.'}</p>
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
        <span><button className="rp-pause" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>{paused ? '▶' : '⏸'}</button><small>{paused ? 'Resume' : 'Pause'}</small></span>
        <span><button onClick={() => go(idx + 1)} aria-label={idx >= segs.length - 1 ? 'Finish the run' : 'Skip this step'}>⏭</button><small>{idx >= segs.length - 1 ? 'Finish' : 'Skip'}</small></span>
      </div>
      <button className="rp-end" onClick={end}>■ End run here</button>
    </div>}
  </div>
}
