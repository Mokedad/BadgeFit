// BadgeFit: cheers that arrive. Whatever someone sent you (a cheer on your post, a reply, a love
// or a like through their Hayden) waits on the server (api/cheers.js) until the app picks it up:
// on opening, on coming back to it, and every minute while it is open. Each one pops in as a
// bubble at the top with the sender's bot in their colour, and your Hayden reacts with a beep.
// Tap the bubble for Community. More than three at once read as one line.
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { useStore } from '../store/useStore.js'
import { api } from '../lib/api.js'
import { cheerLine, cheerSummary, cheerSym } from '../lib/police/cheer-text.js'
import { beep, beepVolume } from '../lib/police/bot-voice.js'
import { haydenSays, toggleFollow } from './NearbyBots.jsx'
import { botSvg } from './HaydenBot.jsx'
import { useRun } from '../store/useRun.js'
import { ReactIcon, ReactBar, REACTIONS, useTapHold } from './Reactions.jsx'
import { useFlick } from './SwipeAway.jsx'

const EVERY_MS = 60000
// While you train, reactions arrive sooner and float up the side instead of a bubble on top.
const TRAINING_MS = 15000
const FLOAT_MS = 3200
const REACT_KINDS = new Set(REACTIONS.map(r => r.id))
const isReact = k => REACT_KINDS.has(k)
const SHOW_MS = 5000

export const useCheers = create(() => ({ queue: [], floats: [] }))

/** A reaction floating up the side while someone trains: a few at most, never over the timer. */
export function floatReaction(c) {
  const f = { ...c, fid: Math.random().toString(36).slice(2) }
  useCheers.setState(s => ({ floats: [...s.floats, f].slice(-4) }))
  setTimeout(() => useCheers.setState(s => ({ floats: s.floats.filter(x => x.fid !== f.fid) })), FLOAT_MS)
}

/** The floating reactions and who sent the newest, on the right of the workout or run screen. */
function Floats() {
  const floats = useCheers(s => s.floats)
  if (!floats.length) return null
  const last = floats.at(-1)
  // A burst from one person reads as ×3 beside their name, not three lines.
  const burst = floats.filter(f => f.from === last.from).length
  return <div className="rx-floats" aria-live="polite">
    {floats.map((f, i) => <span key={f.fid} className="rx-float" style={{ '--x': `${(i % 3) * 14}px` }}><ReactIcon id={f.kind} size={34} /></span>)}
    {burst > 1 && <span key={'x' + burst} className="rx-times">×{burst}</span>}
    <span className="rx-chip" aria-label={cheerLine(last)}><span className="rx-chip-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ line: last.colour, eyes: 'happy', head: true }) }} />{last.from || 'Someone'}</span>
  </div>
}

/** Queue cheers for the bubble (also called with the inbox that rides along on the nearby ping). */
export function showCheers(list) {
  const items = (list || []).filter(c => c && c.kind)
  if (!items.length) return
  const pack = items.length > 3 ? [{ ...items.at(-1), line: cheerSummary(items) }] : items
  useCheers.setState(s => ({ queue: [...s.queue, ...pack] }))
}

/** Love back in one tap (hold for the five): the loop that brings both people back. */
function LoveBack({ c, onDone }) {
  const [pick, setPick] = useState(false)
  const [sent, setSent] = useState(null)
  const send = kind => {
    setPick(false); setSent(kind)
    api('/api/nearby/cheer', { method: 'POST', body: JSON.stringify({ id: c.who, kind }) }).catch(() => {})
    setTimeout(onDone, 700)
  }
  const press = useTapHold(() => send('love'), () => setPick(true))
  return <>
    <button type="button" className={'cheer-back' + (sent ? ' sent' : '')} aria-label={`Send love back to ${c.from}. Hold for more`} {...press}
      onPointerDownCapture={e => e.stopPropagation()}>
      {sent ? <ReactIcon id={sent} size={34} /> : <span className="cheer-back-h"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20c-.4 0-.8-.1-1-.4l-6.2-6a4.6 4.6 0 0 1 0-6.6 4.4 4.4 0 0 1 6.2 0l1 1 1-1a4.4 4.4 0 0 1 6.2 0 4.6 4.6 0 0 1 0 6.6l-6.2 6c-.2.3-.6.4-1 .4Z" /></svg></span>}
    </button>
    {pick && <div className="cheer-back-pick"><ReactBar onPick={send} /></div>}
  </>
}

export default function CheerBubble() {
  const on = useStore(s => !!s.user && !!s.S.police?.level)
  const queue = useCheers(s => s.queue)
  const [shown, setShown] = useState(null)
  // Both asked every time (a hook skipped by || would change the hook order mid-workout).
  const activeNow = useStore(s => !!s.S.active)
  const running = useRun(s => !!s.run)
  const training = activeNow || running

  // Pick up what is waiting: now, on coming back to the app, and every minute while it is open.
  useEffect(() => {
    if (!on) return
    let stop = false
    const pull = () => { if (!stop && !document.hidden) api('/api/cheers').then(r => showCheers(r?.cheers)).catch(() => {}) }
    pull()
    const t = setInterval(pull, training ? TRAINING_MS : EVERY_MS)
    const back = () => { if (!document.hidden) pull() }
    document.addEventListener('visibilitychange', back)
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', back) }
  }, [on, training])

  // One at a time.
  useEffect(() => {
    if (shown || !queue.length) return
    const [next, ...rest] = queue
    useCheers.setState({ queue: rest })
    // Training: a reaction floats up the side, with a soft beep; nothing covers the screen.
    if (training && isReact(next.kind)) { floatReaction(next); try { beep('love', beepVolume(useStore.getState().S.police)) } catch { /* no sound */ } return }
    setShown(next)
    haydenSays(cheerSym(next.kind), 'love', 2400)
    try { beep('love', beepVolume(useStore.getState().S.police)) } catch { /* no sound */ }
  }, [queue, shown, training])
  useEffect(() => {
    if (!shown) return
    const t = setTimeout(() => setShown(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [shown])

  // A flick up (or sideways) puts the bubble away before its five seconds are up.
  const flick = useFlick(() => setShown(null), 'up')
  if (!shown) return <Floats />
  // Follow back, right on the bubble, closes the loop (not for someone you already follow).
  const canFollow = shown.who && !shown.followed && shown.kind !== 'training' && !shown.line
  return <div className="cheer-pop" aria-live="polite" {...flick}>
    {shown.who && !shown.line && <LoveBack c={shown} onDone={() => setShown(null)} />}
    <button type="button" className="cheer-pop-m" onClick={() => { setShown(null); window.location.hash = '#/community' }}>
      <span className="cheer-pop-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ line: shown.colour, eyes: 'happy', head: true }) }} />
      <span className="cheer-pop-t">{isReact(shown.kind) ? <ReactIcon id={shown.kind} size={22} /> : <span className="cheer-pop-s" aria-hidden="true">{cheerSym(shown.kind)}</span>}{shown.line || cheerLine(shown)}</span>
    </button>
    {canFollow && <button type="button" className="cheer-pop-f" onClick={() => { const c = shown; setShown(null); toggleFollow({ id: c.who, name: c.from, followed: false }) }}>Follow back</button>}
    <Floats />
  </div>
}
