// BadgeFit's pace sound on a run (lib/police/pace-beat.js, lib/police/pacer.js): the footprints at
// the top right of the run screen. A tap turns it on or off; holding it opens the options (tick or
// buzz, every step or every second, faster or slower, how loud). The beat follows the run: Hayden
// sets it for each part, and it plays under the music without pausing it. It comes with an account:
// a guest is told signing up is free.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/useStore.js'
import { beatFor, paceSettings, paceLine, ADJ_STEP, ADJ_MAX, clampAdj, clampVol } from '../lib/police/pace-beat.js'
import { createPacer, playTick } from '../lib/police/pacer.js'
import { vibrateSupported, vibrate } from '../lib/sound.js'
import Icon from './Icon.jsx'
import { useFlick } from './SwipeAway.jsx'
import HaydenBot from './HaydenBot.jsx'

const TIP_KEY = 'bf_pace_tip'
const tipSeen = () => { try { return localStorage.getItem(TIP_KEY) === '1' } catch { return true } }
const markTip = () => { try { localStorage.setItem(TIP_KEY, '1') } catch { /* private mode */ } }

/** The pace sound for the run screen: its settings, the beat for this part, and the clock playing it. */
export function usePaceSound({ seg, active, audio }) {
  const P = useStore(s => s.S.police)
  const allowed = useStore(s => !!s.user)
  const set = paceSettings(P)
  const spm = beatFor(seg, set.adj)
  const pacer = useRef(null)
  if (!pacer.current) pacer.current = createPacer({ getCtx: () => audio?.current || null })
  const playing = allowed && set.on && active && !!spm
  useEffect(() => {
    if (!playing) { pacer.current.stop(); return }
    pacer.current.set({ spm, every: set.every, vol: set.vol, sound: set.sound })
  }, [playing, spm, set.every, set.vol, set.sound])
  useEffect(() => () => pacer.current?.stop(), [])
  const save = patch => useStore.getState().update(s => {
    s.police = { ...(s.police || {}), pace: { ...paceSettings(s.police), ...patch } }
  })
  return { ...set, spm, allowed, save, seg, audio }
}

// A tick to hear what it sounds like, from the options: the run's own audio once it has started,
// else one made by the tap that asked for it.
let previewCtx = null
function preview(pace, patch = {}) {
  const p = { ...pace, ...patch }
  if (p.sound === 'buzz') { vibrate(18); return }
  try {
    const ctx = pace.audio?.current || (previewCtx ||= new (window.AudioContext || window.webkitAudioContext)())
    if (ctx.state !== 'running') ctx.resume?.()
    playTick(ctx, ctx.currentTime + 0.02, p.vol)
  } catch { /* no audio */ }
}

export function PaceButton({ pace, onTip, onSignUp, started = false }) {
  const [sheet, setSheet] = useState(false)
  const [gate, setGate] = useState(false)
  const holdT = useRef(null), held = useRef(false)
  useEffect(() => () => clearTimeout(holdT.current), [])
  const on = pace.allowed && pace.on
  const down = () => {
    held.current = false
    clearTimeout(holdT.current)
    holdT.current = setTimeout(() => { held.current = true; if (pace.allowed) setSheet(true); else setGate(true) }, 450)
  }
  const up = () => clearTimeout(holdT.current)
  const click = () => {
    if (held.current) { held.current = false; return }
    if (!pace.allowed) { setGate(true); return }
    pace.save({ on: !pace.on })
    if (!pace.on) {
      if (!started || !pace.spm) preview(pace)
      if (!tipSeen()) { markTip(); onTip?.('Step on every tick. Hold the footprints for options.') }
    }
  }
  const label = on ? `Pace sound on${pace.spm ? `, ${pace.spm} steps a minute` : ''}. Hold for options` : 'Pace sound off. Hold for options'
  return <>
    <button type="button" className={'rp-music rp-pace' + (on ? ' on' : '')} aria-pressed={on} aria-label={label} title="Pace sound · hold for options"
      onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()} onClick={click}>
      <Icon name="footprints" /> {on ? (pace.spm || 'On') : 'Off'}
    </button>
    {sheet && createPortal(<PaceSheet pace={pace} close={() => setSheet(false)} />, document.body)}
    {gate && createPortal(<PaceGate started={started} close={() => setGate(false)} onSignUp={onSignUp} />, document.body)}
  </>
}

/** The line under the clock while the pace sound is on. */
export function PaceLine({ pace }) {
  if (!pace.allowed || !pace.on) return null
  return <div className={'rp-pace-line' + (pace.spm ? '' : ' quiet')}><Icon name="footprints" />{paceLine(pace.seg, pace)}</div>
}

function Seg({ value, options, onPick, label }) {
  return <span className="pace-seg" role="radiogroup" aria-label={label}>
    {options.map(o => <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onPick(o.v)}>{o.label}</button>)}
  </span>
}

function PaceSheet({ pace, close }) {
  const buzzOk = vibrateSupported()
  const shown = pace.spm || beatFor({ kind: 'work', effort: 'z2' }, pace.adj)
  const pick = patch => { pace.save(patch); preview(pace, patch) }
  // Closed with a flick down or a tap outside: no Done button to find.
  const flick = useFlick(close)
  return <div className="rp-choice pace-dim" role="dialog" aria-label="Pace sound options" onClick={close}>
    <div className="pace-sheet" onClick={e => e.stopPropagation()} {...flick}>
      <div className="pace-grab" aria-hidden="true" />
      <h3><Icon name="footprints" /> Pace sound</h3>
      <p className="pace-sub">Step on every tick to hold the right pace.</p>
      {buzzOk && <div className="pace-row"><span>Sound</span>
        <Seg label="Sound" value={pace.sound} onPick={v => pick({ sound: v })} options={[{ v: 'tick', label: 'Tick' }, { v: 'buzz', label: 'Buzz' }]} /></div>}
      <div className="pace-row"><span>Beat on</span>
        <Seg label="Beat on" value={pace.every} onPick={v => pick({ every: v })} options={[{ v: 1, label: 'Every step' }, { v: 2, label: 'Every 2nd' }]} /></div>
      <div className="pace-row"><span>Speed<small>{pace.adj ? `${pace.adj > 0 ? '+' : ''}${pace.adj} on every part` : 'Hayden sets it for each part'}</small></span>
        <span className="pace-step">
          <button type="button" aria-label="Slower" disabled={pace.adj <= -ADJ_MAX} onClick={() => pace.save({ adj: clampAdj(pace.adj - ADJ_STEP) })}><Icon name="minus" /></button>
          <b aria-live="polite">{shown}</b>
          <button type="button" aria-label="Faster" disabled={pace.adj >= ADJ_MAX} onClick={() => pace.save({ adj: clampAdj(pace.adj + ADJ_STEP) })}><Icon name="plus" /></button>
        </span></div>
      {pace.sound !== 'buzz' && <div className="pace-row"><span>Volume</span>
        <input type="range" className="pace-vol" min="5" max="100" step="5" value={Math.round(pace.vol * 100)} aria-label="Volume"
          onChange={e => pace.save({ vol: clampVol(e.target.value / 100) })} onPointerUp={() => preview(pace)} onKeyUp={() => preview(pace)} /></div>}
      <p className="pace-note">Plays with your music and never pauses it.{buzzOk ? ' On silent, the phone mutes the tick: pick Buzz.' : ''}</p>
    </div>
  </div>
}

function PaceGate({ started, close, onSignUp }) {
  const flick = useFlick(close)
  return <div className="rp-choice pace-dim" role="dialog" aria-label="Pace sound" onClick={close}>
    <div className="pace-sheet pace-gate" onClick={e => e.stopPropagation()} {...flick}>
      <div className="pace-grab" aria-hidden="true" />
      <HaydenBot size={64} eyes="happy" pose="wave" />
      <h3><Icon name="footprints" /> Pace sound</h3>
      <p className="pace-sub">A soft tick on every step, under your music. It speeds up on the hard parts. It comes with an account, and signing up is free.</p>
      <div className="pace-beats" aria-hidden="true"><span>Warm-up 160</span><span className="hot">Go 176</span><span>Recover 158</span></div>
      {started
        ? <p className="pace-note">Sign up after this run, from Home.</p>
        : <button type="button" className="pace-done" onClick={() => { close(); onSignUp?.() }}>Sign up free</button>}
    </div>
  </div>
}
