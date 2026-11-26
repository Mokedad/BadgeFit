// Your crew (BadgeFit): the people testing on your date, a day either side (api/crew.js,
// lib/police/crew.js). On Home, one line under Start: their faces with a small ring each (green
// when they trained today) and who trained today. Tap it for the crew sheet: everyone's ring,
// what they did today, 🔥 to cheer with one tap, hold a name for their page. Leaving the crew is
// at the bottom of the sheet. Members with a test date only; a guest or no date sees nothing.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { todayISO } from '../lib/format.js'
import { crewCard, crewLine, crewDate, crewDateLong, crewAgo, initialOf, doneToldToday, markDoneTold } from '../lib/police/crew.js'
import { ReactIcon, useTapHold } from './Reactions.jsx'
import Icon from './Icon.jsx'
import { create } from 'zustand'

const EVERY_MS = 120000
export const useCrew = create(() => ({ test: null, off: false, crew: [], at: 0 }))

/** Sends your card and keeps the crew fresh: now, on coming back, every two minutes while open. */
function useCrewSync() {
  const user = useStore(s => s.user)
  const level = useStore(s => s.S.police?.level)
  const test = useStore(s => s.S.police?.testDate)
  const workouts = useStore(s => s.S.workouts?.length)
  const runs = useStore(s => s.S.police?.runLog?.length)
  const on = !!user && !!level && !!test
  useEffect(() => {
    if (!on) { useCrew.setState({ test: null, crew: [] }); return }
    let stop = false
    const push = async () => {
      if (stop || document.hidden) return
      const st = useStore.getState()
      const card = crewCard(st.S, st.user)
      if (!card) return
      const today = todayISO()
      const done = card.last === today && !doneToldToday(today)
      try {
        const r = await api('/api/crew', { method: 'POST', body: JSON.stringify({ card, ...(done ? { done: true } : {}) }) })
        if (done) markDoneTold(today)
        if (!stop && r) useCrew.setState({ test: r.test, off: !!r.off, crew: r.crew || [], at: Date.now() })
      } catch { /* offline: the last crew stays */ }
    }
    push()
    const t = setInterval(push, EVERY_MS)
    const back = () => { if (!document.hidden) push() }
    document.addEventListener('visibilitychange', back)
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', back) }
  }, [on, test, workouts, runs])
  return on
}

/** One crewmate's circle: their letter (or "You"), ringed by how ready they are. On the strip the
 * ring is green for a session today and grey for none; in the sheet it is always their readiness. */
function Face({ c, size = 34, you = false, ring = 'today' }) {
  const green = ring === 'ready' || c.today
  return <span className={'crew-face' + (green ? ' on' : '')} style={{ width: size, height: size, '--p': (ring === 'ready' ? c.ready || 0 : c.today ? Math.max(c.ready || 0, 60) : 100) + '%' }} aria-hidden="true">
    <span className={'crew-face-i' + (you ? ' you' : '')} style={{ fontSize: Math.round(size * (you ? 0.34 : 0.42)) }}>{you ? 'You' : initialOf(c.name)}</span>
  </span>
}

export function CrewStrip() {
  const on = useCrewSync()
  const { test, off, crew } = useCrew()
  if (!on || off || !test) return null
  // Alone on the date: nothing to show, nothing to miss.
  if (!crew.length) return null
  return <button type="button" className="crew-strip" onClick={() => openCrew()} aria-label={`Your crew: testing ${crewDate(test)} with you. ${crewLine(crew)}`}>
    <span className="crew-faces">{crew.slice(0, 4).map(c => <Face key={c.id} c={c} />)}{crew.length > 4 && <span className="crew-more">+{crew.length - 4}</span>}</span>
    <span className="crew-t"><b>Testing {crewDate(test)} with you</b><span>{crewLine(crew)}</span></span>
    <Icon name="chevronRight" className="crew-chev" />
  </button>
}

/** One crewmate in the sheet: ring, today, and a cheer on the right (fire for a session today,
 * strong otherwise) that goes with one tap; hold the row for their page. */
function Mate({ c, me }) {
  const [sent, setSent] = useState(false)
  const kind = c.today ? 'fire' : 'strong'
  const cheer = async () => {
    if (sent || me) return
    setSent(true)
    try { await api('/api/nearby/cheer', { method: 'POST', body: JSON.stringify({ id: c.id, kind }) }) } catch { /* quiet */ }
  }
  const hold = useTapHold(() => {}, () => { if (!me) import('../views/Community.jsx').then(m => m.openPerson(c.id)) })
  const say = c.today ? `Trained today${c.title ? ' · ' + c.title.toLowerCase() : ''}` : crewAgo(c.last, todayISO())
  return <div className={'crew-row' + (me ? ' me' : '')} {...(me ? {} : hold)}>
    <Face c={c} size={50} you={me} ring="ready" />
    <span className="crew-n"><b>{me ? 'You' : c.name}</b><span>{say}</span></span>
    {me ? <b className="crew-pct">{c.ready ? c.ready + '%' : '–'}</b>
      : <button type="button" className={'crew-rx' + (sent ? ' on' : '')} aria-label={sent ? `Sent to ${c.name}` : `Cheer ${c.name}`} onClick={cheer} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>
        <ReactIcon id={kind} size={28} /></button>}
  </div>
}

function CrewSheet({ close }) {
  const { test, crew } = useCrew()
  const S = useStore(s => s.S), user = useStore(s => s.user)
  const me = crewCard(S, user)
  const mine = me ? { ...me, id: 'me', today: me.last === todayISO() } : null
  const leave = async () => {
    try { await api('/api/crew/leave', { method: 'POST', body: JSON.stringify({ on: true }) }); useCrew.setState({ off: true, crew: [] }); close(); useUI.getState().toast('You left your crew. Come back from Settings') } catch { /* quiet */ }
  }
  return <div className="crew-sheet">
    <h3><span aria-hidden="true">🎯</span> {crewDateLong(test)}</h3>
    <p className="crew-sub">{crew.length + 1} of you test that day</p>
    {mine && <Mate c={mine} me />}
    {crew.map(c => <Mate key={c.id} c={c} />)}
    <p className="crew-hint">Tap <ReactIcon id="fire" size={18} /> to cheer. Hold a name for their Hayden.</p>
    <button type="button" className="rr-chip crew-posts" onClick={() => { try { sessionStorage.setItem('cm_tab', 'crew') } catch { /* private mode */ } close(); window.location.hash = '#/community' }}><Icon name="chat" /> Crew posts</button>
    <button type="button" className="calm-link crew-leave" onClick={leave}>Leave the crew</button>
  </div>
}

export const openCrew = () => useUI.getState().openSheet(close => <CrewSheet close={close} />)

/** Settings: back into the crew after leaving. */
export function rejoinCrew() {
  return api('/api/crew/leave', { method: 'POST', body: JSON.stringify({ on: false }) }).then(() => useCrew.setState({ off: false })).catch(() => {})
}

/** Hayden's ping when a crewmate trains: 🔥 sends fire back, ▶ starts your session. */
export function CrewPop({ c, onDone, onStart }) {
  const [sent, setSent] = useState(false)
  const t = useRef(null)
  useEffect(() => () => clearTimeout(t.current), [])
  const fire = () => {
    if (sent || !c.who) return
    setSent(true)
    api('/api/nearby/cheer', { method: 'POST', body: JSON.stringify({ id: c.who, kind: 'fire' }) }).catch(() => {})
    t.current = setTimeout(onDone, 700)
  }
  const test = useCrew(s => s.test)
  return <div className="crew-pop">
    <span className="crew-pop-h" aria-hidden="true">H</span>
    <span className="crew-pop-t"><b>{c.from} just trained{c.what ? `: ${c.what.toLowerCase()}` : ''}</b><span>{test ? `Testing ${crewDate(test)} with you. ` : 'Testing with you. '}Your turn?</span></span>
    <button type="button" className={'crew-pop-b' + (sent ? ' on' : '')} aria-label={`Send fire to ${c.from}`} onClick={fire}><ReactIcon id="fire" size={24} /></button>
    <button type="button" className="crew-pop-b go" aria-label="Start today's session" onClick={() => { onDone(); onStart() }}><Icon name="play" /></button>
  </div>
}
