// BadgeFit: other members' Haydens, when they are nearby with BadgeFit open and both have "Meet
// bots nearby" on (api/nearby.js; off by default, members only). Hayden waves at the closest new
// one. The other bots stand in a row above the bar, in their own colours and gear:
//   tap        their card: first name and the three numbers they share (BotCardSheet)
//   double tap send a love; it pops up on their screen through their Hayden
//   hold       follow them (the bell, on Community); hold again to stop
//   flick      move them aside: they hang out in the corner until tapped (Hide for good is on the card)
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
import { showCheers } from './CheerBubble.jsx'
import { useRun } from '../store/useRun.js'
import { useLocation } from 'react-router-dom'

const EVERY_MS = 30000
export const useNearby = create(() => ({ near: [], said: {}, live: [], tucked: [] }))
// Flicked aside: they hang out together in the corner for now (not hidden, not unfollowed).
const tuck = b => useNearby.setState(s => ({ tucked: [...new Set([...s.tucked, b.id])] }))
const untuckAll = () => useNearby.setState({ tucked: [] })

/** Hayden on this phone reacts (components/HaydenBuddy.jsx listens): one symbol, one mood. */
export const haydenSays = (sym, mood = 'happy', ms = 1800) => window.dispatchEvent(new CustomEvent('hayden-react', { detail: { sym, mood, ms } }))

const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) })
const toast = m => useUI.getState().toast(m)
const said = (id, sym) => { useNearby.setState(s => ({ said: { ...s.said, [id]: sym } })); setTimeout(() => useNearby.setState(s => { const n = { ...s.said }; delete n[id]; return { said: n } }), 1800) }

export async function sendCheer(b, kind = 'love') {
  try { await post('/api/nearby/cheer', { id: b.id, kind }); said(b.id, kind === 'love' ? '❤️' : '👍'); haydenSays(kind === 'love' ? '❤️' : '👍', 'love') }
  catch (e) { toast(e?.status === 429 ? 'One at a time' : `Could not reach ${b.name} right now`) }
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
      <button className="btn ghost nb-hide" onClick={() => { close(); hideBot(b) }}>Hide for good</button>
    </div>
  </div>
}
export const openBotCard = (b, onChange) => useUI.getState().openSheet(close => <BotCardSheet b={b} close={close} onChange={onChange} />)

// What a bot does by itself, now and then: a wave, a little dance, a cheer, a hello.
const LIFE = [{ pose: 'wave', eyes: 'happy', say: 'Hi!' }, { pose: 'cheer', eyes: 'happy', cls: 'nb-dance' }, { pose: 'fist', eyes: 'determined' }, { pose: 'wave', eyes: 'happy', cls: 'nb-hop' }]

function OtherBot({ b, said, act }) {
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
    if (p.moved) { const out = Math.abs(dx) > 60; setDx(0); if (out) tuck(b); return }
    if (p.held) return
    const at = Date.now()
    if (at - lastTap.current < 320) { clearTimeout(tapT.current); lastTap.current = 0; sendCheer(b, 'love'); return }
    lastTap.current = at
    tapT.current = setTimeout(() => openBotCard(b), 330)
  }
  const look = act || { pose: 'idle', eyes: 'open' }
  return <button type="button" className={'nb-bot' + (look.cls ? ' ' + look.cls : '') + (b.training ? ' nb-training' : '')} style={{ transform: dx ? `translateX(${dx}px)` : undefined, opacity: dx ? Math.max(0.2, 1 - Math.abs(dx) / 160) : undefined }}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { press.current = null; setDx(0) }} onContextMenu={e => e.preventDefault()}
    aria-label={`${b.name}${b.training ? ', training now' : ''}. Tap for their card, double tap to send love, hold to follow, flick to move aside`}>
    {(said || look.say) && <span className="hb-say nb-say" aria-hidden="true">{said || look.say}</span>}
    {b.followed && <span className="nb-bell" aria-hidden="true">🔔</span>}
    <span className="nb-svg" dangerouslySetInnerHTML={{ __html: botSvg({ line: b.colour, gear: b.gear || [], eyes: look.eyes, pose: look.pose, act: b.training ? 'run' : null }) }} />
    <small>{b.training ? 'Training' : b.name}</small>
  </button>
}

/**
 * In the app at all (no place needed): followers' bells show you about, or training now, and you
 * see who you follow is training. Someone starting to train pops up as Hayden's bubble.
 */
function usePresence(on) {
  const training = useStore(s => !!s.S.active) || useRun(s => !!s.run)
  const was = useRef(new Set())
  useEffect(() => {
    if (!on) { useNearby.setState({ live: [] }); return }
    let stop = false
    const ping = () => {
      if (stop || document.hidden) return
      const st = useStore.getState()
      post('/api/presence', { card: botCard(st.S, st.user, new Date(), training) }).then(r => {
        const live = r?.live || []
        const now = new Set(live.filter(b => b.training).map(b => b.id))
        const started = live.filter(b => b.training && !was.current.has(b.id))
        was.current = now
        useNearby.setState({ live })
        if (started.length) showCheers(started.map(b => ({ kind: 'training', from: b.name, colour: b.colour })))
      }).catch(() => {})
    }
    ping()
    const t = setInterval(ping, 60000)
    const back = () => { if (!document.hidden) ping() }
    document.addEventListener('visibilitychange', back)
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', back) }
  }, [on, training])
}

export default function NearbyBots({ hidden = false }) {
  const member = useStore(s => !!s.user && !!s.S.police?.level)
  usePresence(member)
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
          const r = await post('/api/nearby', { lat: pos.coords.latitude, lon: pos.coords.longitude, card: botCard(st.S, st.user, new Date(), !!st.S.active || !!useRun.getState().run) })
          const list = r?.near || []
          // Hayden waves at the closest one he has not met yet.
          const fresh = list.find(b => !greeted.current.has(b.id))
          list.forEach(b => greeted.current.add(b.id))
          if (fresh) { haydenSays('👋', 'happy'); said(fresh.id, '👋') }
          useNearby.setState({ near: list })
          // Anything sent to you (kept on the server, api/cheers.js) pops up as Hayden's bubble.
          showCheers(r?.inbox)
        } catch { /* offline: try again next time */ }
      }, () => { /* location refused or unavailable */ }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 })
      t = setTimeout(tick, EVERY_MS)
    }
    tick()
    const bye = () => { if (document.hidden) post('/api/nearby/leave').catch(() => {}) }
    document.addEventListener('visibilitychange', bye)
    return () => { stop = true; clearTimeout(t); document.removeEventListener('visibilitychange', bye); post('/api/nearby/leave').catch(() => {}); useNearby.setState({ near: [] }) }
  }, [on])
  // Who shows: bots nearby, and anyone you follow who is training now, wherever they are.
  const live = useNearby(s => s.live)
  const tucked = useNearby(s => s.tucked)
  const all = [...near, ...live.filter(b => b.training && !near.some(n => n.id === b.id))].map(b => ({ ...b, training: b.training || live.some(l => l.id === b.id && l.training) }))
  const out = all.filter(b => !tucked.includes(b.id)).slice(0, 3)
  const aside = all.filter(b => tucked.includes(b.id))
  const acts = useLife(out.map(b => b.id).join(','), out.length)
  // On Home they stand in the empty top corner, clear of the week and the buttons.
  const top = useLocation().pathname === '/home'
  if (hidden || !all.length || covered) return null
  return <>
    {out.length > 0 && <div className={'nb-row' + (top ? ' nb-top' : '') + (acts.hands ? ' nb-hands' : '')} aria-label="Bots about">{out.map((b, i) => <OtherBot key={b.id} b={b} said={saidMap[b.id]} act={acts.list[i]} />)}</div>}
    {/* Flicked aside: they hang out together in the corner. A tap brings them back. */}
    {aside.length > 0 && <button type="button" className={'nb-corner' + (top ? ' nb-top' : '')} onClick={untuckAll} aria-label={`${aside.length} ${aside.length === 1 ? 'bot' : 'bots'} hanging out. Tap to bring them back`}>
      {aside.slice(0, 4).map(b => <span key={b.id} className="nb-svg" dangerouslySetInnerHTML={{ __html: botSvg({ line: b.colour, head: true, eyes: 'happy' }) }} />)}
    </button>}
  </>
}

/**
 * Bots have a life of their own: every so often one waves, dances or says hi, and two or more
 * now and then hold hands and sway together.
 */
function useLife(key, n) {
  const [acts, setActs] = useState({ list: [], hands: false })
  useEffect(() => {
    if (!n) return
    let t = 0, off = 0
    const next = () => {
      const hands = n > 1 && Math.random() < 0.35
      const list = Array.from({ length: n }, () => (hands ? { pose: 'cheer', eyes: 'happy' } : Math.random() < 0.5 ? LIFE[Math.floor(Math.random() * LIFE.length)] : null))
      setActs({ list, hands })
      off = setTimeout(() => setActs({ list: [], hands: false }), 2600)
      t = setTimeout(next, 7000 + Math.random() * 7000)
    }
    // Hello first, as they arrive.
    setActs({ list: Array.from({ length: n }, () => LIFE[0]), hands: false })
    off = setTimeout(() => setActs({ list: [], hands: false }), 2200)
    t = setTimeout(next, 6000)
    return () => { clearTimeout(t); clearTimeout(off) }
  }, [key, n])
  return acts
}
