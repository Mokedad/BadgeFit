// The one bar (BadgeFit, once a plan is set up): Today, Plan, Hayden in the middle, the test and
// More, on every screen that has a bar. It replaces the app's tab bar and the hub's own row of
// tabs, so there is one way to move about and it never changes. Stats, exercises and settings
// are filed under More with everything else.
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import { todayNow } from '../lib/police/today-now.js'
import { seenPatch } from '../lib/police/first-steps.js'
import { effectiveRoutineIds } from '../lib/history.js'
import { startFlow } from '../sheets.jsx'
import Icon from './Icon.jsx'
import HaydenQuick from './HaydenQuick.jsx'

/** Which of the bar's places a screen belongs to. */
export function navKey(pathname, search) {
  if (pathname === '/home') return 'today'
  if (pathname === '/police') {
    const tab = new URLSearchParams(search || '').get('tab')
    return tab === 'plan' ? 'plan' : tab === 'tests' ? 'tests' : 'more'
  }
  return pathname === '/plan' ? 'plan' : 'more'
}

export default function CalmNav() {
  const nav = useNavigate()
  const loc = useLocation()
  const testName = useStore(s => (s.S.police?.testName || 'PCT').trim() || 'PCT')
  const key = navKey(loc.pathname, loc.search)
  const go = to => () => nav(to, { replace: true })
  const hayden = () => {
    const now = todayNow(useStore.getState().S, todayISO())
    // Meeting Hayden ticks it off Home's first steps (lib/police/first-steps.js).
    const patch = seenPatch(useStore.getState().S.police, 'hayden')
    if (patch) useStore.getState().update(s => { s.police = { ...(s.police || {}), ...patch } })
    useUI.getState().openSheet(close => <HaydenQuick close={close} today={now.today} done={now.done} onCommand={cmd => {
      if (cmd === 'plan') return nav('/police?tab=plan', { replace: true })
      if (cmd === 'tests') return nav('/police?tab=tests', { replace: true })
      // Start: straight in, today's session fitted to the time (no list to tap through).
      const st = useStore.getState().S
      if (st.active) return nav('/workout')
      const ids = effectiveRoutineIds(st, todayISO())
      if (ids.length) startFlow(ids, { auto: true }); else nav('/workout')
    }} />)
  }
  const tab = (k, icon, label, to) => <button className={key === k ? 'on' : ''} aria-current={key === k ? 'page' : undefined} onClick={go(to)}><Icon name={icon} /><span>{label}</span></button>
  return <nav className="calm-nav" aria-label="BadgeFit">
    {tab('today', 'house', 'Today', '/home')}
    {tab('plan', 'calendar', 'Plan', '/police?tab=plan')}
    <button className="calm-nav-h" onClick={hayden} aria-label="Hayden"><span className="pf-orb" aria-hidden="true" /><span>Hayden</span></button>
    {tab('tests', 'target', testName, '/police?tab=tests')}
    {tab('more', 'list', 'More', '/police?tab=more')}
  </nav>
}
