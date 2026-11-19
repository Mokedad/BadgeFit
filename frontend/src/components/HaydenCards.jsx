// Hayden's two small cards on Home (BadgeFit): the comeback after two or more missed days, and the
// one check-in question a week in (lib/police/comeback.js). Kind words, one button each, gone with
// a sideways swipe (or the small ✕). Never both at once: the comeback comes first.
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { todayISO } from '../lib/format.js'
import { showComeback, showCheckin, missedInARow, visitPatch, CHECKIN_Q } from '../lib/police/comeback.js'
import { botSvg } from './HaydenBot.jsx'
import SwipeAway from './SwipeAway.jsx'
import Icon from './Icon.jsx'

const Face = () => <span className="hc-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ eyes: 'happy', head: true }) }} />
const setP = patch => useStore.getState().update(s => { s.police = { ...(s.police || {}), ...patch } })

export function HaydenCards({ S, left, testName, onStart }) {
  const today = todayISO()
  if (showComeback(S, today)) {
    const n = missedInARow(S, today)
    return <SwipeAway className="card hc" label="Not today" onAway={() => setP({ comebackOff: today })}>
      <Face />
      <div className="hc-m">
        <b>Missed {n} days. That happens.</b>
        <p>{left != null && left > 0 ? `${left} days to your ${testName}. ` : ''}Even 20 minutes today gets you back on track.</p>
        <div className="hc-a">
          <button type="button" className="hc-go" onClick={onStart}>Start today</button>
        </div>
      </div>
    </SwipeAway>
  }
  return null
}

/**
 * Hayden's one question, small, at the top of Home: only for someone back after 3 or more days away,
 * and at most once a week. A tap opens a line to answer in; a swipe (or the ✕) skips it.
 */
export function HaydenAsk({ S, signedIn }) {
  const today = todayISO()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  // Remember today's visit (and whether they were away long enough to be asked).
  useEffect(() => { const patch = visitPatch(S.police, today); if (patch) setP(patch) }, [today]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!showCheckin(S, today, signedIn)) return null
  const done = () => setP({ askedOn: today })
  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    try { await api('/api/feedback', { method: 'POST', body: JSON.stringify({ text, q: CHECKIN_Q }) }); done(); useUI.getState().toast('Thanks. That helps.') }
    catch { useUI.getState().toast('Could not send it right now.') }
    setBusy(false)
  }
  return <SwipeAway className="hc-ask" label="Skip" onAway={done}>
    <button type="button" className="hc-ask-q" onClick={() => setOpen(true)} aria-expanded={open}><Face /><span>{CHECKIN_Q}</span></button>
    {open && <div className="hc-ask-a">
      <input autoFocus value={text} maxLength={500} placeholder="Be honest. It helps." onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} />
      <button type="button" disabled={busy || !text.trim()} onClick={send} aria-label="Send"><Icon name="arrowUp" /></button>
    </div>}
  </SwipeAway>
}
