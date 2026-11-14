// BadgeFit: other members' Haydens, when they are nearby with BadgeFit open and both have "Meet
// bots nearby" on (api/nearby.js; off by default, members only). Hayden waves at the closest new
// one. The other bots stand in a row above the bar, in their own colours and gear:
//   tap        their card: first name and the three numbers they share (BotCardSheet)
//   double tap send a love; it pops up on their screen through their Hayden
//   hold       follow them (the bell, on Community); hold again to stop
//   swipe away hide them for good, both ways (after a "sure?")
// Where you are never shows: the server answers only "nearby", and forgets the rest in minutes.
import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { botCard } from '../lib/police/bot-card.js'
import { swallowNextClick } from '../lib/swallow-click.js'
import { confirmSheet } from '../sheets.jsx'
import { botSvg } from './HaydenBot.jsx'
import { beep, beepVolume } from '../lib/police/bot-voice.js'

const EVERY_MS = 30000
export const useNearby = create(() => ({ near: [], said: {} }))

/** Hayden on this phone reacts (components/HaydenBuddy.jsx listens): one symbol, one mood. */
export const haydenSays = (sym, mood = 'happy', ms = 1800) => window.dispatchEvent(new CustomEvent('hayden-react', { detail: { sym, mood, ms } }))

const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) })
const toast = m => useUI.getState().toast(m)
const said = (id, sym) => { useNearby.setState(s => ({ said: { ...s.said, [id]: sym } })); setTimeout(() => useNearby.setState(s => { const n = { ...s.said }; delete n[id]; return { said: n } }), 1800) }

export async function sendCheer(b, kind = 'love') {
  try { await post('/api/nearby/cheer', { id: b.id, kind }); said(b.id, kind === 'love' ? '❤️' : '👍'); haydenSays(kind === 'love' ? '❤️' : '👍', 'love') }
  catch (e) { toast(e?.status === 429 ? 'One at a time' : `${b.name} is not nearby any more`) }
}
export async function toggleFollow(b) {
  const on = !b.followed
  try {
    await post('/api/nearby/follow', { id: b.id, on })
    useNearby.setState(s => ({ near: s.near.map(x => (x.id === b.id ? { ...x, followed: on } : x)) }))
    said(b.id, on ? '🔔' : '👋'); toast(on ? `Following ${b.name}. They are on your bell in Community` : `Stopped following ${b.name}`)
    return on
  } catch { toast(`${b.name} is not nearby any more`); return b.followed }
}
export const hideBot = b => confirmSheet({
  title: `Hide ${b.name}?`, message: 'You will not see each other nearby again, and any follow between you ends.',
  confirmText: 'Hide', danger: true,
  onConfirm: async () => {
    useNearby.setState(s => ({ near: s.near.filter(x => x.id !== b.id) }))
    try { await post('/api/nearby/hide', { id: b.id }) } catch { /* gone anyway */ }
  },
})

/** A member's card: who, their three numbers, and what you can do. Also used by the bell. */
export function BotCardSheet({ b, close, onChange }) {
  const [f, setF] = useState(!!b.followed)
  const tile = (n, label) => <div className="nb-tile"><b>{n}</b><span>{label}</span></div>
  return <div className="nb-card">
    <span className="nb-card-bot" style={{ '--line': b.colour }} dangerouslySetInnerHTML={{ __html: botSvg({ line: b.colour, gear: b.gear || [], eyes: 'happy', pose: 'wave' }) }} />
    <h3>{b.name}</h3>
    {b.active === false && <p className="muted small">Not training nearby right now</p>}
    {b.stats && <div className="nb-tiles">{tile(b.stats.week, 'this week')}{tile(b.stats.ready + '%', 'PCT ready')}{tile(b.stats.streak, b.stats.streak === 1 ? 'week in a row' : 'weeks in a row')}</div>}
    <div className="nb-acts">
      <button className="pf-go" onClick={() => { sendCheer(b, 'love'); close() }}>❤️ Love</button>
      <button className="btn" onClick={() => { sendCheer(b, 'like'); close() }}>👍 Like</button>
      <button className="btn" onClick={async () => { const on = await toggleFollow({ ...b, followed: f }); setF(on); onChange?.({ ...b, followed: on }) }}>{f ? 'Following' : 'Follow'}</button>
      <button className="btn ghost nb-hide" onClick={() => { close(); hideBot(b) }}>Hide</button>
    </div>
  </div>
}
export const openBotCard = (b, onChange) => useUI.getState().openSheet(close => <BotCardSheet b={b} close={close} onChange={onChange} />)

function OtherBot({ b, said }) {
  const press = useRef(null), lastTap = useRef(0), holdT = useRef(0), tapT = useRef(0)
  const [dx, setDx] = useState(0)
  const down = e => {
    press.current = { x: e.clientX, y: e.clientY, held: false, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    clearTimeout(holdT.current)
    holdT.current = setTimeout(() => { if (!press.current || press.current.moved) return; press.current.held = true; try { navigator.vibrate?.(20) } catch { /* none */ } swallowNextClick(); toggleFollow(b) }, 500)
  }
  const move = e => {
    const p = press.current
    if (!p) return
    const d = e.clientX - p.x
    if (Math.abs(d) > 12 || Math.abs(e.clientY - p.y) > 12) { p.moved = true; clearTimeout(holdT.current) }
    if (p.moved) setDx(d)
  }
  const up = () => {
    const p = press.current; press.current = null
    clearTimeout(holdT.current)
    if (!p) return
    if (p.moved) { const out = Math.abs(dx) > 80; setDx(0); if (out) hideBot(b); return }
    if (p.held) return
    const at = Date.now()
    if (at - lastTap.current < 320) { clearTimeout(tapT.current); lastTap.current = 0; sendCheer(b, 'love'); return }
    lastTap.current = at
    tapT.current = setTimeout(() => openBotCard(b), 330)
  }
  return <button type="button" className="nb-bot" style={{ transform: dx ? `translateX(${dx}px)` : undefined, opacity: dx ? Math.max(0.2, 1 - Math.abs(dx) / 160) : undefined }}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { press.current = null; setDx(0) }} onContextMenu={e => e.preventDefault()}
    aria-label={`${b.name}, nearby. Tap for their card, double tap to send a love, hold to follow`}>
    {said && <span className="hb-say nb-say" aria-hidden="true">{said}</span>}
    {b.followed && <span className="nb-bell" aria-hidden="true">🔔</span>}
    <span className="nb-svg" dangerouslySetInnerHTML={{ __html: botSvg({ line: b.colour, gear: b.gear || [], eyes: 'open', pose: 'idle' }) }} />
    <small>{b.name}</small>
  </button>
}

export default function NearbyBots() {
  const on = useStore(s => !!s.S.police?.nearbyOn && !!s.user)
  const near = useNearby(s => s.near)
  const saidMap = useNearby(s => s.said)
  const covered = useUI(s => s.sheets.length > 0)
  const greeted = useRef(new Set())
  useEffect(() => {
    if (!on || !navigator.geolocation) { useNearby.setState({ near: [] }); return }
    let stop = false, t = 0
    const tick = () => {
      if (stop) return
      if (document.hidden) { t = setTimeout(tick, EVERY_MS); return }
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          const st = useStore.getState()
          const r = await post('/api/nearby', { lat: pos.coords.latitude, lon: pos.coords.longitude, card: botCard(st.S, st.user) })
          const list = r?.near || []
          // Hayden waves at the closest one he has not met yet.
          const fresh = list.find(b => !greeted.current.has(b.id))
          list.forEach(b => greeted.current.add(b.id))
          if (fresh) { haydenSays('👋', 'happy'); said(fresh.id, '👋') }
          useNearby.setState({ near: list })
          for (const c of r?.inbox || []) { haydenSays(c.kind === 'love' ? '❤️' : '👍', 'love', 2400); toast(`${c.kind === 'love' ? '❤️' : '👍'} from ${c.from}`); beep('love', beepVolume(st.S.police)) }
        } catch { /* offline: try again next time */ }
      }, () => { /* location refused or unavailable */ }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 })
      t = setTimeout(tick, EVERY_MS)
    }
    tick()
    const bye = () => { if (document.hidden) post('/api/nearby/leave').catch(() => {}) }
    document.addEventListener('visibilitychange', bye)
    return () => { stop = true; clearTimeout(t); document.removeEventListener('visibilitychange', bye); post('/api/nearby/leave').catch(() => {}); useNearby.setState({ near: [] }) }
  }, [on])
  if (!on || !near.length || covered) return null
  return <div className="nb-row" aria-label="Bots nearby">{near.slice(0, 3).map(b => <OtherBot key={b.id} b={b} said={saidMap[b.id]} />)}</div>
}
