// BadgeFit guided run (lib/police/runs.js): full screen, one segment at a time. A timed segment
// counts down and moves on by itself; a distance segment (a 100 m rep) waits for a tap on Done.
// Each change beeps, vibrates and says the next step aloud, so the phone can stay in a pocket
// or an armband. The screen is kept awake while it runs. English only, like the BadgeFit hub.
import { screenOn } from '../lib/wakelock.js'
import { useStore } from '../store/useStore.js'
import { ShareIcons } from './ShareWin.jsx'
import { winText } from '../lib/police/cheer-text.js'
import { askProgress } from './HaydenBuddy.jsx'
import HaydenBot from './HaydenBot.jsx'
import Icon from './Icon.jsx'
import { createPortal } from 'react-dom'
import RunnerIcon, { FinishFlag } from './RunnerIcon.jsx'
import { HaydenToggle } from './HaydenBuddy.jsx'
import { HaydenMark } from './HaydenBot.jsx'
import { PaceButton, PaceLine, usePaceSound } from './PaceButton.jsx'
import { useUI } from '../store/useUI.js'
import { toSignIn } from '../lib/police/guest.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { pocketCues, pocketSchedule, pocketClear, pocketHanded, withClips } from '../lib/police/pocket.js'
import { shareSession } from '../lib/police/share-card.js'
import { ZONES, hrFor, runMinutes, segSeconds, seekRun, runSecondsAt, fitRun, runById } from '../lib/police/runs.js'
import { RunLength } from './RunLength.jsx'
import { NumberField } from './ui.jsx'
import { emptyTrack, addFix, paceOf, fmtPace, kmOf, livePace, thinRoute, routePath } from '../lib/police/gps.js'
import { say, say as sayAloud, preloadSpeech, clipFor } from '../lib/police/voice.js'
import { checkInMinutes, checkInLine, statLines, intenseLine } from '../lib/police/run-coach.js'
import { runResult } from '../lib/police/run-result.js'
import { todayISO } from '../lib/format.js'
import '../police.css'

const fmt = sec => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const KIND = { warm: 'Warm-up', work: 'Go', rest: 'Recover', cool: 'Cool-down' }

function cue(audio, text, kind, music = false) {
  // In a pocket with the phone saying the steps itself (lib/police/pocket.js): not twice.
  if (pocketHanded() && document.visibilityState === 'hidden') return
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

export default function RunPlayer({ daysLeft = null, run: given, age, onClose, onLog, onUpdate, onUnlog, runLog = [], musicMode = false, onMusic, gps = false, onGps, minimized = false, onMinimize, onRestore }) {
  // The time, yours to set before Start (components/RunLength.jsx): minutes, 'open' (the clock
  // counts up until Finish), or 'plan' (the plan's own). Nothing picked: the run as it came, with
  // any time chosen for the day on Plan already in it.
  const [lenPick, setLenPick] = useState(null)
  const base = runById(given.id) || given
  const run = useMemo(() => (lenPick == null ? given : lenPick === 'plan' ? base : fitRun(base, lenPick)), [given, lenPick]) // eslint-disable-line react-hooks/exhaustive-deps
  // On the run screen itself (a portal like the end choice): the run sits above the app's sheets.
  const [lenOpen, setLenOpen] = useState(false)
  const pickLength = () => setLenOpen(true)
  const lenBox = lenOpen && createPortal(<div className="rp-choice" role="dialog" aria-label="How long" onClick={() => setLenOpen(false)}>
    <div className="rp-len-box" onClick={e => e.stopPropagation()}>
      <RunLength close={() => setLenOpen(false)} minutes={runMinutes(run)} open={!!run.open} planned={runMinutes(base)} onPick={v => setLenPick(v == null ? 'plan' : v)} />
    </div>
  </div>, document.body)
  // Past the planned time: the run carries on, the clock counting up from the end (+1:20), until
  // Finish. Nothing ends on its own.
  const [over, setOver] = useState(false)
  const overAt = useRef(0)
  // Read through a ref: the timers' callbacks see a switch made mid-run.
  const musicRef = useRef(musicMode)
  musicRef.current = musicMode
  const segs = run.segments
  const [idx, setIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  // Lock mode: a black screen that ignores touches (a run in a pocket or a hand), kept on so
  // Hayden keeps talking (a web page goes quiet once the phone locks). Hold to unlock.
  const [locked, setLocked] = useState(false)
  const [hold, setHold] = useState(0)
  const [whyGone, setWhyGone] = useState(false)
  useEffect(() => { const id = setTimeout(() => setWhyGone(true), 10000); return () => clearTimeout(id) }, [])
  const holdT = useRef(null)
  const [now, setNow] = useState(Date.now())
  const [done, setDone] = useState(false)
  // The run ending shows its result, not a black screen; and the screen comes back on after a
  // trip away (the phone drops the keep-awake when the page is hidden).
  useEffect(() => { if (done) setLocked(false) }, [done]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible' && started && !done) { try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ } screenOn('run', true); } }
    document.addEventListener('visibilitychange', back)
    return () => { document.removeEventListener('visibilitychange', back); clearInterval(holdT.current) }
  }, [started, done]) // eslint-disable-line react-hooks/exhaustive-deps
  const [result, setResult] = useState(null) // runResult(): what was run, saved the moment it ends
  const savedId = useRef(null)
  const track = useRef(null), dragging = useRef(false)
  const [km, setKm] = useState(null)
  // GPS, the way a running app tracks a run (lib/police/gps.js): distance, pace, a split and a
  // word from Hayden each kilometre, and the route kept with the run. Off for a treadmill.
  const gpsTrack = useRef(emptyTrack()), gpsWatch = useRef(null), pausedRef = useRef(false)
  const [gpsM, setGpsM] = useState(0)
  const [gpsState, setGpsState] = useState('off') // off | wait | on | denied
  pausedRef.current = paused
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
    sayAloud(text, { music: musicRef.current }).catch(() => {}) // the voice, not the step-text `say` below
    try { navigator.vibrate?.(kind === 'work' ? [80, 60, 80] : 60) } catch { /* none */ }
  }
  const stopGps = () => { try { if (gpsWatch.current != null) navigator.geolocation.clearWatch(gpsWatch.current) } catch { /* gone */ } gpsWatch.current = null }
  const startGps = () => {
    if (gpsWatch.current != null || !navigator.geolocation) { if (!navigator.geolocation) setGpsState('denied'); return }
    setGpsState(s => (s === 'on' ? s : 'wait'))
    gpsWatch.current = navigator.geolocation.watchPosition(pos => {
      const tr = gpsTrack.current, before = tr.splits.length
      addFix(tr, { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, t: Date.now() }, { paused: pausedRef.current })
      setGpsState('on'); setGpsM(tr.m)
      // Each kilometre: Hayden calls it with the split, like a running watch.
      if (tr.splits.length > before) {
        const sp = tr.splits[tr.splits.length - 1]
        coach(`Kilometre ${sp.km}. ${Math.floor(sp.sec / 60)} minutes ${sp.sec % 60}.`, 'check')
      }
    }, err => { if (err?.code === 1) { setGpsState('denied'); stopGps() } }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 })
  }
  // On while the run is going and GPS is switched on (a switch mid-run starts or stops it).
  useEffect(() => {
    if (started && !done && gps) startGps(); else { stopGps(); if (!gps) setGpsState('off') }
    return stopGps
  }, [started, done, gps]) // eslint-disable-line react-hooks/exhaustive-deps
  const seg = segs[idx]
  const elapsed = started ? ((paused ? pausedAt.current : now) - segStart.current) / 1000 : 0
  const left = seg?.sec != null ? seg.sec - elapsed : null
  const hr = seg ? hrFor(seg.effort, age) : null
  // The pace sound (components/PaceButton.jsx): a tick to step on, set by Hayden for each part.
  const pace = usePaceSound({ seg, active: started && !paused && !done, audio })

  const say = s => `${KIND[s.kind]}. ${s.label}${s.sec ? ', ' + (s.sec >= 60 ? Math.round(s.sec / 60) + ' minutes' : s.sec + ' seconds') : ''}.`
  const toOver = () => {
    if (over) return
    overAt.current = Date.now(); setOver(true); setNow(Date.now())
    cue(audio, '', 'cool', musicRef.current)
    coach("That's your time. Keep going if you like, and tap Finish when you're done.", 'check')
  }
  const go = i => {
    if (i >= segs.length) { toOver(); return }
    setIdx(i); segStart.current = Date.now(); setNow(Date.now())
    // A hard part starting gets Hayden's lift on top of the step itself.
    const lift = segs[i].kind === 'work' && i > 0 ? ' ' + intenseLine(run.cat, seed.current + i) : ''
    cue(audio, say(segs[i]) + lift, segs[i].kind, musicRef.current)
    if (lift) setBubble({ text: lift.trim(), at: Date.now() })
  }
  const start = () => {
    try { audio.current = new (window.AudioContext || window.webkitAudioContext)() } catch { audio.current = null }
    try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ } screenOn('run', true);
    runStart.current = Date.now(); setStarted(true); go(0)
    // Hayden's voice for the steps ahead, fetched now, one after another: said without a wait
    // when each is due, and handed to the phone for when it is locked (lib/police/pocket.js).
    ;(async () => { for (const text of new Set(pocketCues(run, 0, 0, say).map(c => c.text))) await preloadSpeech(text).catch(() => {}) })()
  }
  const togglePause = () => {
    if (paused) { const gap = Date.now() - pausedAt.current; segStart.current += gap; runStart.current += gap; if (over) overAt.current += gap; setPaused(false) }
    else { pausedAt.current = Date.now(); setPaused(true) }
  }

  useEffect(() => {
    if (!started || paused || done) return
    const t = setInterval(() => {
      const n = Date.now(); setNow(n)
      if (!over && seg?.sec != null && (n - segStart.current) / 1000 >= seg.sec) {
        // Back from another app (the phone stops the page meanwhile): jump to where the run is
        // now, past every timed step that went by, with one call instead of one for each.
        const sk = seekRun(run, (n - runStart.current) / 1000)
        const timedBetween = segs.slice(idx, sk.idx).every(x => x.sec != null)
        const total = segs.reduce((a, x) => a + segSeconds(x), 0)
        if (timedBetween && segs.every(x => x.sec != null) && (n - runStart.current) / 1000 >= total) { toOver(); overAt.current = runStart.current + total * 1000; return }
        if (timedBetween && sk.idx > idx && sk.offset > 2) {
          setIdx(sk.idx); segStart.current = n - sk.offset * 1000
          for (const mm of checkInMinutes(planned)) if (mm < (n - runStart.current) / 60000) checked.current.add(mm)
          cue(audio, say(segs[sk.idx]), segs[sk.idx].kind, musicRef.current)
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
  }, [started, paused, done, idx, bubble, over]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { try { wake.current?.release() } catch { /* gone */ } screenOn('run', false); try { audio.current?.close() } catch { /* gone */ } try { window.speechSynthesis?.cancel() } catch { /* none */ } }, [])

  // Hayden in your pocket (the iPhone app): when the app leaves the screen mid-run, the phone is
  // handed the coming steps and says them itself; back on screen, the app speaks again.
  const pocket = useRef({})
  pocket.current = { idx, on: started && !paused && !done }
  useEffect(() => {
    const hand = () => {
      if (document.visibilityState !== 'hidden') { pocketClear(); return }
      const c = pocket.current
      // With Hayden's own voice for every step whose clip is ready (fetched at Start, below).
      if (c.on) withClips(pocketCues(run, c.idx, (Date.now() - segStart.current) / 1000, say), clipFor).then(pocketSchedule)
    }
    document.addEventListener('visibilitychange', hand)
    return () => { document.removeEventListener('visibilitychange', hand); pocketClear() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!pocket.current.on) pocketClear() }, [paused, done])

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
    if (seg && !paused) cue(audio, `${KIND[seg.kind]}. ${seg.label}.`, seg.kind, musicRef.current)
  }

  // Leaving mid-run keeps it running in a bar at the bottom, like music (⏸ pauses, ✕ ends). The
  // clock is wall time, so it carries on while you look at Home or another app.
  const leave = () => {
    if (!started || done || !onMinimize) { onClose(); return }
    onMinimize()
  }
  const keepAwake = () => { try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ } screenOn('run', true); }
  const lock = () => { setLocked(true); keepAwake(); try { navigator.vibrate?.(30) } catch { /* none */ } }
  const stopHold = () => { clearInterval(holdT.current); holdT.current = null; setHold(0) }
  const startHold = () => {
    stopHold()
    const t0 = Date.now()
    holdT.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1200)
      setHold(p)
      if (p >= 1) { stopHold(); setLocked(false); try { navigator.vibrate?.([30, 40, 30]) } catch { /* none */ } }
    }, 40)
  }
  // The end, finished or stopped early: saved at once, so it counts in the stats whatever happens
  // next, then the congratulations (lib/police/run-result.js).
  const finish = completed => {
    const ranSec = ((paused ? pausedAt.current : Date.now()) - runStart.current) / 1000
    const res = runResult({ run, ranSec, completed, runLog, today: todayISO(), seed: seed.current })
    if (!paused) { pausedAt.current = Date.now(); setPaused(true) }
    setResult(res)
    setDone(true)
    const tr = gpsTrack.current
    const got = tr.m >= 50 ? { km: kmOf(tr.m), pace: Math.round(paceOf(tr.m, ranSec) || 0) || undefined, splits: tr.splits.slice(0, 60), route: thinRoute(tr.pts) } : {}
    if (got.km) setKm(got.km)
    savedId.current = onLog({ run: run.id, min: res.min, planned: res.planned, completed, pct: res.pct, ...got })
    try { wake.current?.release() } catch { /* gone */ } screenOn('run', false);
    sayAloud(res.line, { music: musicRef.current }).catch(() => {})
    try { navigator.vibrate?.([100, 60, 100, 60, 200]) } catch { /* none */ }
    onRestore?.()
  }
  // Two ways out, the same in the run and in the bar: Finish (what was run is saved) or Cancel
  // run (nothing saved, the run stays today's to do). Tapping outside the choice keeps running.
  const [choice, setChoice] = useState(false)
  const end = () => setChoice(true)
  const finishHere = () => {
    setChoice(false)
    const ranMin = (((paused ? pausedAt.current : Date.now()) - runStart.current) / 60000)
    if (ranMin < 1) { onClose(); return } // under a minute: nothing worth saving
    // Past the planned time, or an open run: all of it was done.
    finish(over || !!run.open)
  }
  const cancelRun = () => { setChoice(false); try { wake.current?.release() } catch { /* gone */ } screenOn('run', false); onClose() }
  // On the page itself (a portal), above the run screen and Hayden floating over it.
  const choiceBox = choice && createPortal(<div className="rp-choice" role="dialog" aria-label="End the run" onClick={() => setChoice(false)}>
    <div className="rp-choice-box" onClick={e => e.stopPropagation()}>
      <button className="rp-choice-fin" onClick={finishHere}>Finish run<small>What you ran is saved</small></button>
      <button className="rp-choice-cancel" onClick={cancelRun}>Cancel run<small>Not saved, still to do today</small></button>
    </div>
  </div>, document.body)
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
    try { navigator.wakeLock?.request('screen').then(w => { wake.current = w }).catch(() => {}) } catch { /* not offered */ } screenOn('run', true);
  }

  if (minimized && !done) {
    const t = started ? fmt(((paused ? pausedAt.current : now) - runStart.current) / 1000) : ''
    return <div className="rp-mini" role="region" aria-label={run.name}>
      <button className="rp-mini-m" onClick={onRestore} aria-label="Open the run">
        <RunnerIcon size={28} />
        <span><b>{run.name}</b><small>{paused ? `Paused · ${t}` : over ? `Past your time · +${fmt((now - overAt.current) / 1000)}` : `${seg ? KIND[seg.kind] : ''} · ${left != null ? fmt(left) : t}`}</small></span>
      </button>
      <button className="rp-mini-b" onClick={togglePause} aria-label={paused ? 'Resume run' : 'Pause run'}><Icon name={paused ? 'play' : 'pause'} /></button>
      <button className="rp-mini-b" onClick={end} aria-label="Finish or cancel the run">✕</button>
      {choiceBox}
    </div>
  }

  if (done && result) return <div className="rp rp-done" role="dialog" aria-label="Run complete">
    {/* Back from the finished screen leaves the run as saved and goes Home. It does not undo the
        save or reopen the run (that lost the whole session when started again). */}
    <div className="rp-top"><button className="rp-x" onClick={() => { onClose(); location.hash = '#/home' }} aria-label="Back to Home" title="Back to Home">←</button></div>
    <div className="rp-body">
      <div className="rp-party" aria-hidden="true"><HaydenBot size={84} pose="cheer" eyes="happy" /></div>
      <h2>{result.headline}</h2>
      <p className="rp-sub">{result.completed ? `${run.name}, all of it.` : `You did ${result.min} of ${result.planned} minutes. It counts.`} <b>Saved <Icon name="check" /></b></p>
      <div className="rp-stats">
        <div><b>{result.min}</b><span>minutes</span></div>
        <div><b>{result.pct}%</b><span>of the run</span></div>
        <div><b>{result.weekRuns}</b><span>runs this week</span></div>
        <div><b>{result.weekMin}</b><span>min this week</span></div>
      </div>
      {gpsTrack.current.m >= 50 && <div className="rp-gpsdone">
        <div className="rp-stats rp-stats2">
          <div><b>{kmOf(gpsTrack.current.m)}</b><span>km</span></div>
          <div><b>{fmtPace(paceOf(gpsTrack.current.m, result.min * 60))}</b><span>min / km</span></div>
        </div>
        {routePath(thinRoute(gpsTrack.current.pts)) && <svg className="rp-route" viewBox="0 0 300 160" role="img" aria-label="Your route"><path d={routePath(thinRoute(gpsTrack.current.pts))} /></svg>}
        {gpsTrack.current.splits.length > 0 && <ol className="rp-splits">{gpsTrack.current.splits.map(sp => <li key={sp.km}><span>km {sp.km}</span><b>{fmtPace(sp.sec)}</b></li>)}</ol>}
      </div>}
      {gpsTrack.current.m < 50 && <label className="rp-km">km<NumberField value={km} nullable onChange={v => { setKm(v); note({ km: v || null }) }} /></label>}
      <div className="rp-done-acts">
        <ShareIcons shareKey={`day:${todayISO()}:${run.name}`} text={winText({ kind: 'workout', name: run.name })} onShare={() => shareSession({ title: run.name, minutes: result.min, km: km || (gpsTrack.current.m >= 50 ? gpsTrack.current.m / 1000 : null), daysToTest: daysLeft }, null)} />
      </div>
      <button className="rp-main" onClick={() => { onClose(); location.hash = '#/home'; askProgress() }}>Done</button>
    </div>
  </div>


  return <div className={'rp rp-' + (seg?.kind || 'warm') + (paused ? ' paused' : '')} role="dialog" aria-label={run.name}>
    <div className="rp-top">
      <button className="rp-x" onClick={leave} aria-label={started ? 'Minimise, the run keeps going' : 'Close'} title={started ? 'Minimise, the run keeps going' : 'Close'}>{started ? '⌄' : '✕'}</button>
      <span className="rp-gap" />
      {onMusic && <button type="button" className={'rp-music' + (musicMode ? ' on' : '')} onClick={() => onMusic(!musicMode)} aria-pressed={musicMode}
        title={musicMode ? 'Music mode on: Hayden talks over your music' : 'Music mode off'} aria-label={musicMode ? 'Music mode on' : 'Music mode off'}><Icon name="speaker" /></button>}
      {onGps && <button type="button" className={'rp-music' + (gps ? ' on' : '')} onClick={() => onGps(!gps)} aria-pressed={gps}
        title={gps ? 'GPS on: distance, pace and your route' : 'GPS off (treadmill)'} aria-label={gps ? 'GPS on' : 'GPS off'}><Icon name="mapPin" /></button>}
      <PaceButton pace={pace} started={started} onTip={text => (started ? setBubble({ text, at: Date.now() }) : useUI.getState().toast(text))}
        onSignUp={() => { onClose(); toSignIn(); location.hash = '#/home' }} />
      {started ? <span>{fmt(((paused ? pausedAt.current : now) - runStart.current) / 1000)}</span>
        : <button type="button" className="rp-len" onClick={pickLength} aria-label={`Run time: ${run.open ? 'open' : runMinutes(run) + ' minutes'}. Tap to change`}>
          {run.open ? <><Icon name="stopwatch" /> Open</> : `${runMinutes(run)} min`}<Icon name="chevronDown" /></button>}
      <HaydenToggle className="rp-hb" />
    </div>
    {/* The runner crosses the track as the run goes, start to finish; drag him to move the time. */}
    <div className={'rp-track' + (started ? ' live' : '')} ref={track}
      onPointerDown={started ? e => { e.currentTarget.setPointerCapture?.(e.pointerId); dragTo(e) } : undefined}
      onPointerMove={started ? e => { if (e.buttons || e.pointerType === 'touch') dragTo(e) } : undefined}
      onPointerUp={started ? endDrag : undefined} onPointerCancel={started ? endDrag : undefined}
      role={started ? 'slider' : undefined} aria-label="Run progress" aria-valuemin={0} aria-valuemax={totalSec} aria-valuenow={Math.round(atSec)}>
      <span className="rp-track-fill" style={{ width: pct + '%' }} />
      <span className="rp-runner" style={{ left: pct + '%' }} aria-hidden="true"><RunnerIcon size={30} /></span>
      <span className="rp-flag" aria-hidden="true"><FinishFlag /></span>
    </div>
    {!started ? <div className="rp-body">
      <div className="rp-emoji"><RunnerIcon size={84} lines /></div>
      <h2>{run.name}</h2>
      {/* The pep talk shows for 10 seconds, fades, and Start moves up into its place. */}
      <p className={'rp-sub rp-why' + (whyGone ? ' gone' : '')}>{run.why}</p>
      <button className="rp-main" onClick={start}>▶ Start</button>
    </div> : <div className="rp-body">
      <div className="rp-kind">{over ? 'Past your time' : <>{KIND[seg.kind]}{seg.of ? ` · ${seg.round} of ${seg.of}` : ''}</>}</div>
      <div className="rp-label">{over ? 'Keep going, or finish' : seg.label}</div>
      <div className={'rp-time' + (over ? ' over' : '')} aria-live="off">{over ? '+' + fmt(((paused ? pausedAt.current : now) - overAt.current) / 1000) : left != null ? fmt(left) : fmt(elapsed)}</div>
      {(over || seg.open) && <button className="rp-main" onClick={() => finish(true)}>Finish</button>}
      {gps && <div className="rp-gps">{gpsState === 'denied' ? 'Location is off for BadgeFit. Allow it in Settings to track distance.'
        : gpsState !== 'on' ? 'Finding GPS…'
        : <><b>{kmOf(gpsM).toFixed(2)}</b> km · <b>{fmtPace(livePace(gpsTrack.current, now) ?? paceOf(gpsM, (now - runStart.current) / 1000))}</b> /km</>}</div>}
      {seg.dist && !over && <button className="rp-main" onClick={() => go(idx + 1)}>Done {seg.dist} m</button>}
      <div className="rp-zone">{ZONES[seg.effort]?.name}{hr ? ` · ${hr.lo}-${hr.hi} bpm` : ''}<br /><small>{ZONES[seg.effort]?.feel}</small></div>
      <PaceLine pace={pace} />
      {bubble && <div className="rp-bubble" role="status"><HaydenMark />{bubble.text}</div>}
      {next && !over && <div className="rp-next">Next: <b>{KIND[next.kind]}</b> {next.label}{next.sec ? ` · ${fmt(next.sec)}` : ''}</div>}
      <div className="rp-ctl">
        <span><button className="rp-pause" onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}><Icon name={paused ? 'play' : 'pause'} /></button><small>{paused ? 'Resume' : 'Pause'}</small></span>
        {!over && !seg.open && <span><button onClick={() => go(idx + 1)} aria-label="Skip this step"><Icon name="skipForward" /></button><small>Skip</small></span>}
      </div>
      <button className="rp-lock" onClick={lock}><Icon name="lock" /> Lock screen <small>Hayden keeps talking</small></button>
      <button className="rp-end" onClick={end}>End run</button>
    </div>}
    {choiceBox}{lenBox}
    {locked && <div className="rp-locked" role="dialog" aria-label="Screen locked"
      onPointerDown={e => { e.preventDefault(); startHold() }} onPointerUp={stopHold} onPointerCancel={stopHold} onPointerLeave={stopHold}
      onContextMenu={e => e.preventDefault()}>
      <div className="rp-locked-k">{over ? 'Past your time' : seg ? KIND[seg.kind] : ''}</div>
      <div className="rp-locked-t">{over ? '+' + fmt(((paused ? pausedAt.current : now) - overAt.current) / 1000) : left != null ? fmt(left) : fmt(elapsed)}</div>
      <div className="rp-locked-l">{seg?.label}</div>
      {gps && gpsState === 'on' && <div className="rp-locked-l">{kmOf(gpsM).toFixed(2)} km · {fmtPace(paceOf(gpsM, (now - runStart.current) / 1000))} /km</div>}
      {pace.allowed && pace.on && pace.spm && <div className="rp-locked-l">{pace.spm} steps a minute</div>}
      <div className="rp-locked-u"><span className="rp-locked-ring" style={{ '--p': hold }} /><Icon name="lock" /> Hold anywhere to unlock</div>
    </div>}
  </div>
}
