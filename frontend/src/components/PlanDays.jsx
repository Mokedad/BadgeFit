// The plan, a day at a time (BadgeFit Plan): the day in focus opened with its exercises as
// pictures, and the next two days below it. Swipe the day left or right (or use the arrows) to
// move a day at a time, across weeks; a day gone by is greyed, with a tick when it was trained.
// Every day is read from the schedule as it really is (lib/police/today-now.js: a swap, a removal
// or an added workout included), so Plan and Home always say the same thing. Hold a picture to
// take that exercise out of the workout; + adds one. Changing a day is the swap button.
import { useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { todayISO, isoOf } from '../lib/format.js'
import { effectiveRoutines } from '../lib/history.js'
import { EXIDX } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n-core.js'
import { todayNow } from '../lib/police/today-now.js'
import { buildCombinedEntries } from '../lib/session-merge.js'
import { fitSession } from '../lib/police/session-length.js'
import { runForRoutine } from '../lib/police/run-routines.js'
import { menuSheet, exercisePicker, dayOverrideSheet, confirmSheet } from '../sheets.jsx'
import { reopenPatch } from '../lib/police/reopen.js'
import { Thumb } from './Media.jsx'
import Icon from './Icon.jsx'
import { swallowNextClick } from '../lib/swallow-click.js'
import { useUI } from '../store/useUI.js'

/** Sets and reps (or seconds) of one exercise in a routine, as a plan: two steppers and Save. */
function SetsReps({ close, r, i, ex }) {
  const cur = (useStore.getState().S.routines || []).find(y => y.id === r.id)?.ex?.[i] || {}
  const timed = cur.mode === 'time'
  const [sets, setSets] = useState(cur.sets || 3)
  const [n, setN] = useState(timed ? cur.sec || 30 : cur.reps || 10)
  const step = timed ? 5 : 1
  const save = () => {
    useStore.getState().update(s => {
      const y = (s.routines || []).find(z => z.id === r.id)
      const e = y?.ex?.[i]
      if (!e) return
      e.sets = sets
      if (timed) e.sec = n
      else { e.reps = n; if (e.repsMin != null) e.repsMin = Math.max(1, Math.min(e.repsMin, n)) }
    })
    close()
  }
  const row = (label, v, set, d, min, max) => <div className="sr-row"><b>{label}</b>
    <button onClick={() => set(Math.max(min, v - d))} aria-label={'Fewer ' + label.toLowerCase()}><Icon name="minus" /></button>
    <span>{v}</span>
    <button onClick={() => set(Math.min(max, v + d))} aria-label={'More ' + label.toLowerCase()}><Icon name="plus" /></button></div>
  return <div className="sr">
    <h3 className="capitalize">{exerciseNameFor(ex)}</h3>
    {row('Sets', sets, setSets, 1, 1, 10)}
    {row(timed ? 'Seconds' : 'Reps', n, setN, step, timed ? 5 : 1, timed ? 600 : 50)}
    <button className="pf-go" onClick={save}>Save</button>
  </div>
}

const DAY = 86400000
// Every run and walk shows the same picture: the catalogue's run (one picture, easy to read).
const RUN_PIC = '0685'
export const shiftISO = (iso, n) => isoOf(new Date(Date.parse(iso + 'T12:00:00') + n * DAY))
const label = (iso, today) => (iso === today ? 'Today' : iso === shiftISO(today, 1) ? 'Tomorrow' : iso === shiftISO(today, -1) ? 'Yesterday'
  : new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }))

/** What a day is, as the schedule has it: name, minutes, kind, its gym routines, done. */
export function dayInfo(S, iso) {
  const now = todayNow(S, iso)
  const routines = effectiveRoutines(S, iso)
  const runs = routines.map(r => runForRoutine(S.police || {}, r.id, iso)).filter(Boolean)
  const gym = routines.filter(r => !runForRoutine(S.police || {}, r.id, iso))
  const kind = gym.length ? 'gym' : runs.length ? (/walk/i.test(runs[0].name) ? 'walk' : 'run') : 'rest'
  const trained = now.logged.length > 0
  return { iso, name: now.name || 'Rest', minutes: now.minutes, kind, gym, runs, done: trained && (now.done || !routines.length), trained }
}

function Pic({ ex, onHold, faint = false }) {
  const t = useRef(null)
  const start = () => { t.current = setTimeout(() => { t.current = null; try { navigator.vibrate?.(15) } catch { /* none */ } swallowNextClick(); onHold() }, 500) }
  const stop = () => { if (t.current) { clearTimeout(t.current); t.current = null } }
  return <figure className={faint ? 'faint' : ''} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={e => { e.preventDefault(); onHold() }}>
    <Thumb ex={ex} /><figcaption>{exerciseNameFor(ex)}</figcaption>
  </figure>
}

export default function PlanDays({ first = null }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const today = todayISO()
  // Back no further than the plan's first day (or today, for a plan that starts next week).
  const floor = [S.police?.start || today, today].sort()[0]
  const [focus, setFocus] = useState(today)
  const go = n => setFocus(f => { const to = shiftISO(f, n); return n < 0 && to < floor ? f : to })
  const d = dayInfo(S, focus)
  const past = focus < today
  // A swipe on the day: right goes back a day, left goes forward.
  const sw = useRef(null)
  const down = e => { sw.current = { x: e.clientX, y: e.clientY } }
  const up = e => {
    const s = sw.current; sw.current = null
    if (!s) return
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) go(dx > 0 ? -1 : 1)
  }
  const removeEx = (r, i) => update(s => { const x = (s.routines || []).find(y => y.id === r.id); if (x) x.ex = x.ex.filter((_, j) => j !== i) })
  // Untick today's done plan: the day is offered again on Home (lib/police/reopen.js).
  const reopen = iso => confirmSheet({
    title: 'Train this again?', message: 'Today goes back to not done, so you can do it again. What you logged stays in your stats.',
    confirmText: 'Untick',
    onConfirm: () => useStore.getState().update(s => { s.police = { ...(s.police || {}), ...reopenPatch(s.police, iso, Date.now(), todayISO()) } }),
  })
  const hold = (r, i, ex) => menuSheet({ title: exerciseNameFor(ex), items: [
    { icon: 'slider', label: 'Change sets and reps', onClick: () => useUI.getState().openSheet(close => <SetsReps close={close} r={r} i={i} ex={ex} />) },
    { icon: 'trash', danger: true, label: 'Remove from this workout', onClick: () => removeEx(r, i) },
    { icon: 'xmark', label: 'Keep it', onClick: () => {} },
  ] })
  const add = r => { const picker = exercisePicker(x => {
    update(s => { const y = (s.routines || []).find(z => z.id === r.id); if (y) y.ex = [...y.ex, { id: x.id, sets: 3, mode: 'reps', repsMin: 10, reps: 12, prog: 'double', weight: 0 }] })
    picker.close()
  }, { title: 'Add to ' + r.name }) }
  const next = [1, 2].map(n => dayInfo(S, shiftISO(focus, n)))
  // What fits today's time (45 minutes unless more was chosen): the rest shows faint.
  const fits = new Set(d.gym.length ? fitSession(buildCombinedEntries(S, d.gym.map(r => r.id)).entries, S.police?.sessionCap ?? 45).map(e => `${e.rid}:${e.id}`) : [])
  return <div className="pd">
    <div className="pd-nav">
      <button className="calm-back" onClick={() => go(-1)} disabled={shiftISO(focus, -1) < floor} aria-label="Day before"><Icon name="chevronLeft" /></button>
      <b>{label(focus, today)}</b>
      <button className="calm-back" onClick={() => go(1)} aria-label="Next day"><Icon name="chevronRight" /></button>
    </div>
    <div data-noswipe className={'pd-focus pfk-' + d.kind + (past ? ' past' : '')} onPointerDown={down} onPointerUp={up}>
      <div className="pd-h">
        <span className="pd-m"><b>{d.name}</b>{d.minutes ? <small>{d.minutes} min</small> : null}</span>
        {d.trained ? (focus === today
          ? <button type="button" className="pd-tick" onClick={() => reopen(focus)} aria-label="Done. Tap to train this again"><Icon name="check" /></button>
          : <span className="pd-tick" aria-label="Done"><Icon name="check" /></span>)
          : !past && <button className="calm-swap" onClick={() => dayOverrideSheet(focus)} aria-label="Change this day"><Icon name="swap" /></button>}
      </div>
      {d.gym.map(r => <div key={r.id} className="pf-pics">
        {r.ex.map((e, i) => { const ex = EXIDX[e.id]; return ex ? <Pic key={e.id + i} ex={ex} faint={!fits.has(`${r.id}:${e.id}`)} onHold={() => !past && hold(r, i, ex)} /> : null })}
        {!past && <button className="pd-add" onClick={() => add(r)} aria-label={'Add an exercise to ' + r.name}><Icon name="plus" /></button>}
      </div>)}
      {!d.gym.length && (d.kind === 'rest' || !EXIDX[RUN_PIC]
        ? <div className="pd-icon"><Icon name={d.kind === 'rest' ? 'moon' : 'figureRun'} /></div>
        : <div className="pd-run"><Thumb ex={EXIDX[RUN_PIC]} /></div>)}
      {first}
    </div>
    {next.map(n => <button key={n.iso} className={'pf-day pf-tile pfk-' + n.kind} onClick={() => setFocus(n.iso)}>
      <div className="pf-tile-h">
        <span className="pf-tile-d">{label(n.iso, today) === 'Tomorrow' ? 'Tmrw' : new Date(n.iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span>
        <span className="pf-tile-m"><b>{n.name}</b>{n.minutes ? <small>{n.minutes} min</small> : null}</span>
        <span className="pf-tile-p" aria-hidden="true">
          {n.gym.length ? n.gym[0].ex.slice(0, 3).map(e => EXIDX[e.id]).filter(Boolean).map(ex => <Thumb key={ex.id} ex={ex} />)
            : n.kind !== 'rest' && EXIDX[RUN_PIC] ? <Thumb ex={EXIDX[RUN_PIC]} /> : <span className="pf-tile-i"><Icon name={n.kind === 'rest' ? 'moon' : 'figureRun'} /></span>}
        </span>
      </div>
    </button>)}
  </div>
}
