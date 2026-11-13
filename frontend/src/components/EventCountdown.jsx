// BadgeFit on Home: the days to the test in a square beside the week of the plan, and this
// week's focus, narrowed week by week (lib/police/weekly-focus.js). Tap for the PCT tab.
// English only, like the BadgeFit hub.
import Icon from './Icon.jsx'
import { iconFor } from '../lib/police/emoji-icon.js'
import { useNavigate } from 'react-router-dom'
import { weeklyFocus } from '../lib/police/weekly-focus.js'
import { PHASE_WORDS } from '../lib/police/programme.js'
import { todayISO } from '../lib/format.js'

// children: Home's week strip, drawn in this card under a line so the two read as one card.
export default function EventCountdown({ P, children }) {
  const nav = useNavigate()
  const f = weeklyFocus(P, todayISO())
  if (!f) return null
  const name = (P.testName || '').trim() || 'PCT'
  const days = f.days != null && f.days >= 0 ? f.days : null
  return <div className="card ev-wrap"><button type="button" className="tap-host ev-card" onClick={() => nav('/police?tab=tests')}>
    <span className="ev-box">
      <b>{days ?? '–'}</b>
      <span>{days === 1 ? 'day' : 'days'} to your {name}</span>
    </span>
    <span className="ev-m">
      <b className="ev-week">{f.final ? `🏁 Final week · ${name} week` : `📅 Week ${f.week} of ${f.last}`}</b>
      {!f.final && <span className="ev-phase">Phase {f.phase}: {PHASE_WORDS[f.phase].split(':')[0]}</span>}
      <span className="ev-head">{f.headline}</span>
      {f.items.slice(0, children ? 1 : undefined).map((it, i) => <span key={i} className="ev-item"><span aria-hidden="true"><Icon name={iconFor(it.icon)} /></span><span><b>{it.title}</b>{it.detail && <small>{it.detail}</small>}</span></span>)}
    </span>
  </button>
  {children && <div className="ev-wk">{children}</div>}
  </div>
}
