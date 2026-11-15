// BadgeFit's Start sheet: "What are we training?" A row of round buttons (your top picks, today's
// suggestion lit), then a few plain lines below. Picks and their order: lib/police/start-picks.js.
import { Children, useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { topPicks, CAT_ICON } from '../lib/police/start-picks.js'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { useStore } from '../store/useStore.js'

/** One round button: a big circle with an icon, the name under it. `lit` is today's suggestion. */
export function RoundPick({ icon, label, lit = false, on = false, onClick }) {
  return <button type="button" className={'sp-pick' + (lit ? ' lit' : '') + (on ? ' on' : '')} onClick={onClick} aria-pressed={on || undefined}>
    <span className="sp-pick-c" aria-hidden="true"><Icon name={icon} /></span>
    <span className="sp-pick-l">{label}</span>
  </button>
}

/** A sideways row of round buttons. */
export function PickRow({ children, label }) {
  // The chosen button is brought into view (a kind further along the row, opened from a link).
  const ref = useRef(null)
  const on = Children.toArray(children).findIndex(c => c?.props?.on)
  useEffect(() => {
    const row = ref.current, el = on >= 0 ? row?.children[on] : null
    if (row && el) row.scrollLeft = Math.max(0, el.offsetLeft - row.offsetLeft - (row.clientWidth - el.offsetWidth) / 2)
  }, [on])
  return <div ref={ref} className="sp-picks" role="group" aria-label={label} data-noswipe>{children}</div>
}

const go = to => { window.location.hash = '#' + to }

/**
 * `today`: today's planned session ({ kind: 'run' | 'gym', done }) or null on a rest day.
 * `startToday` starts it the usual way. `pickWorkout` chooses another gym session (members),
 * `restToday` makes today a rest day.
 */
export default function StartPicker({ close, today, guest, startToday, pickWorkout, restToday }) {
  const S = useStore(s => s.S)
  const { picks, lit } = topPicks(S, { today, guest })
  const act = {
    today: startToday,
    run: () => go('/police?tab=run'),
    beep: () => go('/police?tab=tests&beep=1'),
    gym: today?.kind === 'gym' && !today.done ? startToday : pickWorkout,
    walk: () => go('/police?tab=run&cat=walk'),
  }
  const pick = id => () => { close(); act[id]?.() }
  const lines = [
    { icon: 'figureRun', label: 'Runs', to: '/police?tab=run' },
    { icon: CAT_ICON.beep, label: 'Beep prep', to: '/police?tab=run&cat=beep' },
    !guest && pickWorkout && { icon: 'dumbbell', label: 'Strength', onClick: pickWorkout },
    { icon: CAT_ICON.recovery, label: 'Recovery', to: '/police?tab=run&cat=recovery' },
    today && !today.done && restToday && { icon: 'moon', label: 'Rest today', onClick: restToday },
  ].filter(Boolean)
  return <div className="start-picker">
    <h3>What are we training?</h3>
    <div className="menu-sec">Your top picks</div>
    <PickRow label="Your top picks">
      {picks.map(p => <RoundPick key={p.id} icon={p.icon} label={p.label} lit={p.id === lit} onClick={pick(p.id)} />)}
    </PickRow>
    <div className="list menu-list">
      {lines.map(l => <div key={l.label} className="item menu-item" {...tappable(() => { close(); l.onClick ? l.onClick() : go(l.to) })}>
        <span className="lrow-i"><Icon name={l.icon} /></span>
        <div className="grow"><div className="tt">{l.label}</div></div>
        <Icon name="chevronRight" className="menu-chev" />
      </div>)}
    </div>
  </div>
}
