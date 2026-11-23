// Home's ready ring (BadgeFit members): one thick arc, how ready you are for the PCT in percent
// (the mean of the six standards' progress, lib/police/standards.js readiness), the number your
// crew sees too (components/Crew.jsx). Under it the one thing to do next and the weeks in a row
// trained. Before any test it is an empty ring that asks the question, with the 10-minute
// starting point under it. A tap opens the PCT page, where the six standards are one by one.
import { readyView } from '../lib/police/ready-ring.js'
import Icon from './Icon.jsx'

const R = 64, C = 2 * Math.PI * R
const NAMES = { grip: 'grip', bridge: 'prone bridge', jump: 'vertical jump', pushups: 'push-ups', illinois: 'agility run', beep: 'beep test' }

export default function ReadyRing({ results, beepTarget, testName, streak = 0, onFind, onOpen }) {
  const v = readyView(results, beepTarget)
  const name = (testName || 'PCT').trim()
  const pct = Math.max(0, Math.min(100, v.pct || 0))
  const len = (C * pct) / 100
  return <div className="rr">
    <button type="button" className={'rr-ring' + (v.tested ? '' : ' empty')} onClick={v.tested ? onOpen : onFind}
      aria-label={v.tested ? `${pct}% ready for your ${name}. ${v.passed} of ${v.total} standards passing. ${v.rows.filter(r => !r.pass).map(r => (r.tested ? `${NAMES[r.id]} ${r.pct}% of the way` : `${NAMES[r.id]} not tested`)).join(', ')}.` : `How ready are you for your ${name}? Find out in 10 minutes.`}>
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle className="rr-track" cx="80" cy="80" r={R} />
        {v.tested && pct > 0 && <circle className="rr-fill" cx="80" cy="80" r={R} style={{ strokeDasharray: `${len} ${C - len}` }} />}
      </svg>
      <span className="rr-mid" aria-hidden="true">{v.tested
        ? <><b>{pct}<i>%</i></b><small>ready</small></>
        : <><b className="q">?</b><small>How ready<br />are you?</small></>}</span>
    </button>
    <div className="rr-chips">
      {!v.tested && <button type="button" className="rr-chip" onClick={onFind}><Icon name="target" /> Find out · 10 min</button>}
      {v.next && v.next.kind !== 'keep' && <button type="button" className="rr-chip" onClick={onOpen}>{v.next.text}</button>}
      {streak > 0 && <span className="rr-chip" title="Weeks in a row with training"><Icon name="flame" className="rr-flame" />{streak} {streak === 1 ? 'week' : 'weeks'}</span>}
    </div>
  </div>
}
