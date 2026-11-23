// BadgeFit's lean workout screen: one card and one small button. The "up next" strip on top (tap to
// jump), the exercise's picture, its numbers already filled in (tap one for − and +, no keyboard),
// "last time", the set dots (tap the last green one to undo) and one pill that says what happens
// next: "Set 2 done", "Start 45 s" for a hold, then the rest ("Rest 1:12 · skip", −15 and +15 either
// side). Swipe the card left to do it later; those come back before the end. Everything it does
// goes through Workout.jsx's own handlers, so saving, rest, history and the PCT are unchanged.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { exOr } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { lastEntryFor, modeOf, isBw } from '../lib/history.js'
import { lastRowFor } from '../lib/typo-check.js'
import { isWarmupRow, isSideSet } from '../lib/workout-model.js'
import { nextSetIdx, lastDoneIdx, dotStates, stripStates, putOff, isLastSet, stepValue, dragSteps, buttonLabel, clock, laterKey } from '../lib/police/lean-workout.js'
import { Thumb } from './Media.jsx'

const sideOf = row => (isSideSet(row) ? (row.sides?.L?.done ? 'R' : 'L') : null)
const valOf = (row, side, f) => (side ? row?.sides?.[side]?.[f] : row?.[f])

// Drag a number up for more, down for less (one step every 18 px). A tap still opens − and +.
// The drag never reaches the card, so it can't swipe the exercise away to "later".
function useDragStep(onStep) {
  const g = useRef(null)
  const stop = ev => ev.stopPropagation()
  return {
    moved: () => g.current?.moved,
    handlers: {
      onPointerDown: ev => {
        stop(ev)
        g.current = { y: ev.clientY, n: 0, moved: false }
      },
      onPointerMove: ev => {
        const d = g.current
        if (!d) return
        stop(ev)
        const n = dragSteps(ev.clientY - d.y)
        if (n !== d.n) {
          const dir = n > d.n ? 1 : -1
          d.n += dir
          // Hold on to the finger only once it really drags, so a plain tap on − or + still lands.
          if (!d.moved) try { ev.currentTarget.setPointerCapture?.(ev.pointerId) } catch { /* not supported */ }
          d.moved = true
          onStep(dir)
          try { navigator.vibrate?.(5) } catch { /* no buzz */ }
        }
      },
      onPointerUp: ev => { stop(ev); setTimeout(() => { g.current = null }, 0) },
      onPointerCancel: ev => { stop(ev); g.current = null },
    },
  }
}

function Num({ value, suffix, onStep, label }) {
  const [open, setOpen] = useState(false)
  const drag = useDragStep(onStep)
  const tap = fn => () => { if (!drag.moved()) fn() }
  if (!open) return <button type="button" className="lean-num" aria-label={'Change ' + label} {...drag.handlers} onClick={tap(() => setOpen(true))}>{value}{suffix && <small>{suffix}</small>}</button>
  return <span className="lean-num on" {...drag.handlers} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
    <button type="button" className="lean-step" aria-label={'Less ' + label} onClick={tap(() => onStep(-1))}>−</button>
    <button type="button" className="lean-num-v" aria-label={'Done changing ' + label} onClick={tap(() => setOpen(false))} autoFocus>{value}{suffix && <small>{suffix}</small>}</button>
    <button type="button" className="lean-step" aria-label={'More ' + label} onClick={tap(() => onStep(1))}>+</button>
  </span>
}

export default function LeanWorkout({ cur, onTick, onField, onMutateSet, onStartTimed, onJump, onMenu, onLater, onDone }) {
  const S = useStore(s => s.S)
  const A = S.active
  const timer = useUI(s => s.timer)
  const work = useUI(s => s.work)
  const ui = useUI.getState()
  const later = A?.later || []
  const drag = useRef(null)
  const [dx, setDx] = useState(0)

  // The rest and the hold show in the pill here, not in the bar at the bottom.
  useEffect(() => {
    document.body.classList.add('lean-wk')
    return () => document.body.classList.remove('lean-wk')
  }, [])

  const entries = A?.entries || []
  const e = entries[cur]
  if (!e) return null
  const ex = exOr(e.id)
  const cfg = { ...(e.target || {}), id: e.id }
  const mode = modeOf(cfg)
  const bw = mode === 'reps' && isBw(cfg)
  const i = nextSetIdx(e)
  const row = i >= 0 ? e.sets[i] : null
  const side = row ? sideOf(row) : null
  const warm = row ? isWarmupRow(row) : false
  const setNo = row ? e.sets.slice(0, i + 1).filter(x => isWarmupRow(x) === warm).length : 0
  const unit = S.unit || 'kg'

  const last = row ? lastRowFor(lastEntryFor(S, e.id, e.rid)?.sets, e.sets, i, side) : null
  const lastLine = !last ? null
    : mode === 'time' ? `↺ ${fmtNum(last.sec || 0)} s`
    : mode === 'cardio' ? `↺ ${fmtNum(last.min || 0)} min`
    : bw || !last.w ? `↺ ${fmtNum(last.r || 0)} reps`
    : `↺ ${fmtNum(last.w)} ${unit} × ${fmtNum(last.r || 0)}`

  const step = (f, dir) => {
    const v = stepValue(valOf(row, side, f), f, dir, unit)
    if (side) onMutateSet(cur, i, r => ({ ...r, sides: { ...r.sides, [side]: { ...r.sides[side], [f]: v } } }))
    else onField(cur, i, f, v)
  }
  const after = res => { if (res?.unitDone) onDone?.() }

  const tick = () => {
    if (!row) return
    if (mode === 'time') { onStartTimed(cur, i, after); return }
    onTick(cur, i, side, after)
  }
  const undo = () => {
    const k = lastDoneIdx(e)
    if (k < 0) return
    const r = e.sets[k]
    const s = isSideSet(r) ? (r.sides?.R?.done ? 'R' : 'L') : undefined
    onTick(cur, k, s)
    ui.stopRest()
  }

  // Swipe left: do it later.
  const down = ev => { drag.current = { x: ev.clientX, y: ev.clientY, on: false } }
  const move = ev => {
    const d = drag.current
    if (!d) return
    const x = ev.clientX - d.x, y = ev.clientY - d.y
    if (!d.on && Math.abs(x) > 12 && Math.abs(x) > Math.abs(y) * 1.5) d.on = true
    if (d.on) setDx(Math.min(0, x))
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    if (d?.on && dx < -80) {
      const res = putOff(entries, cur, later)
      if (res.next != null) { onLater(res.later, res.next); { const n = exerciseNameFor(ex); ui.toast(n.charAt(0).toUpperCase() + n.slice(1) + ': later') } }
      else ui.toast('Nothing else left, this one is last')
    }
    setDx(0)
  }

  const resting = timer && !timer.ready && timer.kind !== 'switch' ? timer : null
  const holding = work && !work.auto ? work : null
  const lastSet = isLastSet(entries, cur) && mode !== 'time'
  const strip = stripStates(entries, cur, later)
  const dots = dotStates(e)
  const undoAt = lastDoneIdx(e)

  return <div className="lean">
    <div className="lean-strip" role="tablist" aria-label="Up next">
      {entries.map((x, k) => <button key={k} type="button" role="tab" aria-selected={k === cur}
        className={'lean-tile ' + strip[k]} onClick={() => k !== cur && onJump(k)}
        aria-label={exerciseNameFor(exOr(x.id)) + (strip[k] === 'done' ? ', done' : strip[k] === 'later' ? ', later' : '')}>
        <Thumb ex={exOr(x.id)} />{strip[k] === 'done' && <i aria-hidden="true">✓</i>}
      </button>)}
    </div>

    <div className="lean-card" style={dx ? { transform: `translateX(${dx}px)`, opacity: 1 + dx / 400 } : undefined}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <button type="button" className="lean-more" aria-label="Exercise options" onClick={onMenu}>⋯</button>
      <div className="lean-pic"><Thumb ex={ex} /></div>
      <h2 className="lean-name">{exerciseNameFor(ex)}{later.includes(laterKey(e)) && <small> · from later</small>}</h2>
      {row ? <div className="lean-vals">
        {mode === 'time' && <Num label="seconds" value={fmtNum(valOf(row, side, 'sec') || e.target?.sec || 0)} suffix=" s" onStep={d => step('sec', d)} />}
        {mode === 'cardio' && <Num label="minutes" value={fmtNum(valOf(row, side, 'min') || 0)} suffix=" min" onStep={d => step('min', d)} />}
        {mode === 'reps' && !bw && <><Num label="weight" value={fmtNum(valOf(row, side, 'w') || 0)} suffix={' ' + unit} onStep={d => step('w', d)} /><em>×</em></>}
        {mode === 'reps' && <Num label="reps" value={fmtNum(valOf(row, side, 'r') || 0)} suffix={bw ? ' reps' : ''} onStep={d => step('r', d)} />}
      </div> : <div className="lean-vals done">Done ✓</div>}
      {lastLine && <div className="lean-last">{lastLine}</div>}
      <div className="lean-dots">
        {dots.map((d, k) => k === undoAt
          ? <button key={k} type="button" className="lean-dot done undo" aria-label="Undo the last set" onClick={undo} />
          : <i key={k} className={'lean-dot ' + d + (isWarmupRow(e.sets[k]) ? ' warm' : '')} />)}
      </div>
    </div>

    <div className="lean-go">
      {holding ? <button type="button" className="lean-pill gold" onClick={() => ui.finishWorkEarly()}>{clock(holding.left)} · done</button>
        : resting ? <>
          <button type="button" className="lean-adj" onClick={() => ui.addRest(-15)}>−15</button>
          <button type="button" className="lean-pill rest" onClick={() => ui.skipRest()}>Rest <b>{clock(resting.left)}</b> · skip</button>
          <button type="button" className="lean-adj" onClick={() => ui.addRest(15)}>+15</button>
        </>
        : row ? <button type="button" className="lean-pill gold" onClick={tick}>{buttonLabel({ mode, warm, setNo, sec: valOf(row, side, 'sec') || e.target?.sec, last: lastSet, side })}</button>
        : null}
    </div>
  </div>
}
