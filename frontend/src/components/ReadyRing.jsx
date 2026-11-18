// Home's ready ring (BadgeFit members): the six PCT standards as six arcs, each filling toward its
// pass mark and green once it passes, how many pass in the middle, the days to go above, and under
// it the one thing to do next and the weeks in a row trained. Before any test it is an empty ring
// that asks the question, with the 10-minute starting point under it. The numbers come from
// lib/police/ready-ring.js; a tap opens the PCT page.
import { readyView } from '../lib/police/ready-ring.js'
import Icon from './Icon.jsx'

const R = 66, C = 2 * Math.PI * R
const GAP = 7 // the space between two arcs, along the circle
const NAMES = { grip: 'grip', bridge: 'prone bridge', jump: 'vertical jump', pushups: 'push-ups', illinois: 'agility run', beep: 'beep test' }

// One arc of the ring: its slot on the circle (stroke-dasharray from the top, clockwise) and how
// much of it is filled.
const arc = (i, n, share) => {
  const slot = C / n, len = Math.max(0, (slot - GAP) * share)
  return { strokeDasharray: `${len} ${C - len}`, strokeDashoffset: -(i * slot + GAP / 2) }
}

export default function ReadyRing({ results, beepTarget, left = null, testName, streak = 0, onFind, onOpen }) {
  const v = readyView(results, beepTarget)
  const name = (testName || 'PCT').trim()
  const days = left != null && left >= 0 ? (left === 0 ? `Your ${name} is today` : `${left} ${left === 1 ? 'day' : 'days'} to your ${name}`) : null
  return <div className="rr">
    {days && <div className="rr-days">{days}</div>}
    <button type="button" className={'rr-ring' + (v.tested ? '' : ' empty')} onClick={v.tested ? onOpen : onFind}
      aria-label={v.tested ? `${v.passed} of ${v.total} ${name} standards passing. ${v.rows.filter(r => !r.pass).map(r => (r.tested ? `${NAMES[r.id]} ${r.pct}% of the way` : `${NAMES[r.id]} not tested`)).join(', ')}.` : `How ready are you for your ${name}? Find out in 10 minutes.`}>
      <svg viewBox="0 0 160 160" aria-hidden="true">
        {v.tested ? v.rows.map((row, i) => <g key={row.id}>
          <circle className="rr-track" cx="80" cy="80" r={R} {...arc(i, v.rows.length, 1)} />
          {row.tested && <circle className={'rr-fill' + (row.pass ? ' pass' : '')} cx="80" cy="80" r={R} {...arc(i, v.rows.length, Math.max(0.04, row.pct / 100))} />}
        </g>) : <circle className="rr-track" cx="80" cy="80" r={R} />}
      </svg>
      <span className="rr-mid" aria-hidden="true">{v.tested
        ? <><b>{v.passed}<i>/{v.total}</i></b><small>passing</small></>
        : <><b className="q">?</b><small>How ready<br />are you?</small></>}</span>
    </button>
    <div className="rr-chips">
      {!v.tested && <button type="button" className="rr-chip" onClick={onFind}><Icon name="target" /> Find out · 10 min</button>}
      {v.next && <button type="button" className="rr-chip" onClick={onOpen}>{v.next.text}</button>}
      {streak > 0 && <span className="rr-chip" title="Weeks in a row with training"><Icon name="flame" className="rr-flame" />{streak} {streak === 1 ? 'week' : 'weeks'}</span>}
    </div>
  </div>
}
