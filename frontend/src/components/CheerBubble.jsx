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

const EVERY_MS = 60000
const SHOW_MS = 3600

export const useCheers = create(() => ({ queue: [] }))

/** Queue cheers for the bubble (also called with the inbox that rides along on the nearby ping). */
export function showCheers(list) {
  const items = (list || []).filter(c => c && c.kind)
  if (!items.length) return
  const pack = items.length > 3 ? [{ ...items.at(-1), line: cheerSummary(items) }] : items
  useCheers.setState(s => ({ queue: [...s.queue, ...pack] }))
}

export default function CheerBubble() {
  const on = useStore(s => !!s.user && !!s.S.police?.level)
  const queue = useCheers(s => s.queue)
  const [shown, setShown] = useState(null)

  // Pick up what is waiting: now, on coming back to the app, and every minute while it is open.
  useEffect(() => {
    if (!on) return
    let stop = false
    const pull = () => { if (!stop && !document.hidden) api('/api/cheers').then(r => showCheers(r?.cheers)).catch(() => {}) }
    pull()
    const t = setInterval(pull, EVERY_MS)
    const back = () => { if (!document.hidden) pull() }
    document.addEventListener('visibilitychange', back)
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', back) }
  }, [on])

  // One at a time.
  useEffect(() => {
    if (shown || !queue.length) return
    const [next, ...rest] = queue
    useCheers.setState({ queue: rest })
    setShown(next)
    haydenSays(cheerSym(next.kind), 'love', 2400)
    try { beep('love', beepVolume(useStore.getState().S.police)) } catch { /* no sound */ }
  }, [queue, shown])
  useEffect(() => {
    if (!shown) return
    const t = setTimeout(() => setShown(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [shown])

  if (!shown) return null
  return <button type="button" className="cheer-pop" onClick={() => { setShown(null); window.location.hash = '#/community' }} aria-live="polite">
    <span className="cheer-pop-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ line: shown.colour, eyes: 'happy', head: true }) }} />
    <span className="cheer-pop-t"><span className="cheer-pop-s" aria-hidden="true">{cheerSym(shown.kind)}</span>{shown.line || cheerLine(shown)}</span>
  </button>
}
