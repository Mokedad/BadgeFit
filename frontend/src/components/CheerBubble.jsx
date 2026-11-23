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
import { haydenSays } from './NearbyBots.jsx'
import { botSvg } from './HaydenBot.jsx'
import { useRun } from '../store/useRun.js'
import { ReactIcon, REACTIONS, useTapHold } from './Reactions.jsx'
import { useFlick } from './SwipeAway.jsx'
import { CrewPop } from './Crew.jsx'
import { startFlow } from '../sheets.jsx'
import { effectiveRoutineIds } from '../lib/history.js'
import { todayISO } from '../lib/format.js'

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

/** A reaction that arrived: tap to send it back, hold to open their Hayden. */
function ReactPop({ c, onDone }) {
  const [sent, setSent] = useState(false)
  const press = useTapHold(() => {
    if (sent) return
    setSent(true)
    api('/api/nearby/cheer', { method: 'POST', body: JSON.stringify({ id: c.who, kind: c.kind }) }).catch(() => {})
    try { navigator.vibrate?.(8) } catch { /* none */ }
    setTimeout(onDone, 750)
  }, () => { onDone(); window.location.hash = '#/community'; import('../views/Community.jsx').then(m => m.openPerson(c.who)).catch(() => {}) })
  return <button type="button" className="rx-pop-m" aria-label={`${c.from}: ${c.kind}. Tap to send it back, hold for their page`} {...press}>
    <span className="cheer-pop-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ line: c.colour, eyes: 'happy', head: true }) }} />
    <ReactIcon id={c.kind} size={26} />
    <b>{c.from || 'Someone'}</b>
    {sent && <span className="rx-pop-fly" aria-hidden="true"><ReactIcon id={c.kind} size={34} /></span>}
  </button>
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
    if (training && (isReact(next.kind) || next.kind === 'crew')) { floatReaction(next.kind === 'crew' ? { ...next, kind: 'fire' } : next); try { beep('love', beepVolume(useStore.getState().S.police)) } catch { /* no sound */ } return }
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
  // A reaction: their Hayden, the reaction and their name, nothing else. A tap sends the same
  // reaction straight back (it pops, like one sent); a hold opens their page. Anything else
  // (a reply, a follow) says what it is and a tap opens Community.
  const rxOn = isReact(shown.kind) && shown.who
  // A crewmate trained: 🔥 sends fire back, ▶ starts today's session (components/Crew.jsx).
  const startToday = () => { const st = useStore.getState().S; if (st.active) { window.location.hash = '#/workout'; return } const ids = effectiveRoutineIds(st, todayISO()); if (ids.length) startFlow(ids, { auto: true }); else window.location.hash = '#/home' }
  if (shown.kind === 'crew') return <div className="cheer-pop crew-pop-w" aria-live="polite" {...flick}><CrewPop c={shown} onDone={() => setShown(null)} onStart={startToday} /><Floats /></div>
  return <div className={'cheer-pop' + (rxOn ? ' rx-pop' : '')} aria-live="polite" {...flick}>
    {rxOn ? <ReactPop c={shown} onDone={() => setShown(null)} />
      : <button type="button" className="cheer-pop-m" onClick={() => { setShown(null); window.location.hash = '#/community' }}>
        <span className="cheer-pop-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ line: shown.colour, eyes: 'happy', head: true }) }} />
        <span className="cheer-pop-t"><span className="cheer-pop-s" aria-hidden="true">{cheerSym(shown.kind)}</span>{shown.line || cheerLine(shown)}</span>
      </button>}
    <Floats />
  </div>
}
