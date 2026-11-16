// BadgeFit's Start sheet: "What are we training?" A row of round buttons (your top picks, today's
// suggestion lit), then a few plain lines below. Picks and their order: lib/police/start-picks.js.
import { Children, useEffect, useRef } from 'react'
import { useState } from 'react'
import Icon from './Icon.jsx'
import { Thumb } from './Media.jsx'
import { CAT_ICON } from '../lib/police/start-picks.js'
import { RUN_TYPES, gymTypesFor, itemsFor, ensureFullBody } from '../lib/police/train-types.js'
import { runMinutes } from '../lib/police/runs.js'
import { EXIDX } from '../lib/exercises.js'
import { todayISO } from '../lib/format.js'
import { countIn, countInRun, actForRoutine } from './CountIn.jsx'
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

/**
 * Kinds of training as round buttons, and under them only the picked kind's workouts: a gym
 * session shows its first exercises as small pictures, a run its minutes. `onPick(item)` gets
 * { kind: 'gym', routine } | { kind: 'run', run } | { kind: 'make-full' } (lib/police/train-types.js).
 */
export function TrainList({ types, first = null, isOn = () => false, onPick, label = 'Kind of training' }) {
  const S = useStore(s => s.S)
  const [type, setType] = useState(first && types.some(t => t.id === first) ? first : null)
  const items = type ? itemsFor(S, type, todayISO()) : []
  return <>
    <PickRow label={label}>{types.map(t => <RoundPick key={t.id} icon={t.icon} label={t.label} on={type === t.id} onClick={() => setType(type === t.id ? null : t.id)} />)}</PickRow>
    {items.length > 0 && <div className="list menu-list tl-list">{items.map(it => {
      const key = it.kind === 'run' ? it.run.id : it.kind === 'gym' ? it.routine.id : 'full'
      const exs = it.kind === 'gym' ? it.routine.ex.map(e => EXIDX[e.id]).filter(Boolean) : []
      return <div key={key} className="item menu-item" {...tappable(() => onPick(it))}>
        {it.kind === 'run' && <span className="lrow-i"><Icon name={CAT_ICON[it.run.cat] || 'figureRun'} /></span>}
        {it.kind === 'make-full' && <span className="lrow-i"><Icon name="figureStrength" /></span>}
        <div className="grow">
          <div className="tt">{it.kind === 'run' ? it.run.name : it.kind === 'gym' ? it.routine.name : 'Full body'}</div>
          <div className="ss">{it.kind === 'run' ? `${runMinutes(it.run)} min` : it.kind === 'gym' ? `${it.routine.ex.length} exercises` : 'A bit of everything from your plan'}</div>
          {exs.length > 0 && <div className="tl-pics" aria-hidden="true">{exs.slice(0, 5).map((ex, i) => <Thumb key={i} ex={ex} />)}</div>}
        </div>
        {isOn(it) ? <Icon name="check" className="accent" /> : <Icon name="chevronRight" className="menu-chev" />}
      </div>
    })}</div>}
  </>
}

const go = to => { window.location.hash = '#' + to }

/**
 * `today`: today's planned session ({ kind: 'run' | 'gym', done, name }) or null on a rest day.
 * `startToday` starts it, `startRoutine(id)` a gym session by id. Everything is picked and started here: no trip to another page.
 * Members pick any kind (body part, full body, a run); a guest gets today and the runs.
 */
export default function StartPicker({ close, today, guest, startToday, startRoutine, restToday }) {
  const S = useStore(s => s.S)
  const iso = todayISO()
  const todo = today && !today.done
  const types = [...(guest ? [] : gymTypesFor(S, iso)), ...RUN_TYPES]
  const pick = it => {
    close()
    if (it.kind === 'run') return countInRun(it.run, runMinutes(it.run))
    let id = it.routine?.id
    if (it.kind === 'make-full') useStore.getState().update(s => { id = ensureFullBody(s, iso) })
    const r = useStore.getState().S.routines.find(x => x.id === id)
    if (r) countIn({ title: r.name, sub: `${r.ex.length} exercises`, act: actForRoutine(r), onGo: () => startRoutine(id) })
  }
  return <div className="start-picker">
    <h3>What are we training?</h3>
    {todo && <button type="button" className="sp-today" onClick={() => { close(); startToday() }}>
      <span className="sp-today-i" aria-hidden="true"><Icon name={today.kind === 'run' ? 'figureRun' : 'dumbbell'} /></span>
      <span className="sp-today-m"><small>Today's plan</small><b>{today.name || 'Today'}</b></span>
      <span className="sp-today-go">Start</span>
    </button>}
    <div className="menu-sec">{todo ? 'Or something else' : 'Pick one'}</div>
    <TrainList types={types} onPick={pick} />
    <div className="sp-foot">
      <button type="button" onClick={() => { close(); go('/police?tab=tests&beep=1') }}><Icon name="speaker" /> Beep test</button>
      {todo && restToday && <button type="button" onClick={() => { close(); restToday() }}><Icon name="moon" /> Rest today</button>}
    </div>
  </div>
}
