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
import { crewCard, crewLine, crewDate, doneToldToday, markDoneTold } from '../lib/police/crew.js'
import { botSvg } from './HaydenBot.jsx'
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

/** One face with its ring: green for a session today, grey for none. */
function Face({ c, size = 34 }) {
  return <span className={'crew-face' + (c.today ? ' on' : '')} style={{ width: size, height: size, '--p': (c.ready || 0) + '%' }} aria-hidden="true">
    <span className="crew-face-i" dangerouslySetInnerHTML={{ __html: botSvg({ line: c.colour, eyes: c.today ? 'happy' : 'open', head: true }) }} />
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

/** One crewmate in the sheet: ring, today, a 🔥 that sends fire; hold the row for their page. */
function Mate({ c, me }) {
  const [sent, setSent] = useState(false)
  const fire = async () => {
    if (sent || me) return
    setSent(true)
    try { await api('/api/nearby/cheer', { method: 'POST', body: JSON.stringify({ id: c.id, kind: 'fire' }) }) } catch { /* quiet */ }
  }
  const hold = useTapHold(() => {}, () => { if (!me) import('../views/Community.jsx').then(m => m.openPerson(c.id)) })
  return <div className={'crew-row' + (me ? ' me' : '')} {...(me ? {} : hold)}>
    <Face c={c} size={46} />
    <span className="crew-n"><b>{me ? 'You' : c.name}</b><span>{c.today ? `Trained today${c.title ? ' · ' + c.title : ''}` : c.last ? `Last ${crewDate(c.last)}` : 'Not started yet'}</span></span>
    {me ? <b className="crew-pct">{c.ready ? c.ready + '%' : '–'}</b>
      : <button type="button" className={'crew-fire' + (sent ? ' on' : '')} aria-label={sent ? `Fire sent to ${c.name}` : `Send fire to ${c.name}`} onClick={fire} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>
        <ReactIcon id="fire" size={22} /></button>}
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
    <h3><Icon name="target" /> {crewDate(test)}</h3>
    <p className="pf-sub">{crew.length + 1} of you test that day</p>
    {mine && <Mate c={mine} me />}
    {crew.map(c => <Mate key={c.id} c={c} />)}
    <p className="pf-sub crew-hint">🔥 cheers · hold a name for their Hayden</p>
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
  return <div className="crew-pop">
    <span className="crew-pop-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ line: c.colour, eyes: 'happy', head: true }) }} />
    <span className="crew-pop-t"><b>{c.from} just trained{c.what ? `: ${c.what.toLowerCase()}` : ''}</b><span>Testing with you. Your turn?</span></span>
    <button type="button" className={'crew-pop-b' + (sent ? ' on' : '')} aria-label={`Send fire to ${c.from}`} onClick={fire}><ReactIcon id="fire" size={22} /></button>
    <button type="button" className="crew-pop-b go" aria-label="Start today's session" onClick={() => { onDone(); onStart() }}><Icon name="play" /></button>
  </div>
}
