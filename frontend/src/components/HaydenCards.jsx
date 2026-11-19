// Hayden's two small cards on Home (BadgeFit): the comeback after two or more missed days, and the
// one check-in question a week in (lib/police/comeback.js). Kind words, one button each, gone with
// a sideways swipe (or the small ✕). Never both at once: the comeback comes first.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { todayISO } from '../lib/format.js'
import { showComeback, showCheckin, missedInARow, CHECKIN_Q } from '../lib/police/comeback.js'
import { botSvg } from './HaydenBot.jsx'
import { TextArea } from './ui.jsx'
import SwipeAway from './SwipeAway.jsx'

const Face = () => <span className="hc-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ eyes: 'happy', head: true }) }} />
const setP = patch => useStore.getState().update(s => { s.police = { ...(s.police || {}), ...patch } })

export function HaydenCards({ S, signedIn, left, testName, onStart }) {
  const today = todayISO()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
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
  if (!showCheckin(S, today, signedIn)) return null
  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    try { await api('/api/feedback', { method: 'POST', body: JSON.stringify({ text, q: CHECKIN_Q }) }); setP({ checkin: today }); useUI.getState().toast('Thanks. That helps make BadgeFit better.') }
    catch { useUI.getState().toast('Could not send it right now. Try again later.') }
    setBusy(false)
  }
  return <SwipeAway className="card hc" label="Skip" onAway={() => setP({ checkin: 'skipped' })}>
    <Face />
    <div className="hc-m">
      <b>One question from Hayden</b>
      <p>{CHECKIN_Q}</p>
      <TextArea value={text} maxLength={500} rows={2} placeholder="Be honest. It helps." onChange={e => setText(e.target.value)} />
      <div className="hc-a">
        <button type="button" className="hc-go" disabled={busy || !text.trim()} onClick={send}>Send</button>
      </div>
    </div>
  </SwipeAway>
}
