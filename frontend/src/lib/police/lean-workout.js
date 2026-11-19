// BadgeFit's lean workout screen (components/LeanWorkout.jsx): one card, one button. These are the
// pure parts: which set is next, what the dots and the "up next" strip show, what the one button
// says, and where "do it later" sends you. Nothing here writes the workout; Workout.jsx does that.

const doneAll = e => !!e && Array.isArray(e.sets) && e.sets.length > 0 && e.sets.every(s => s && s.done)

/** A stable name for an entry, for the "later" list (indices move when an exercise is removed). */
export const laterKey = e => (e ? (e.rid || '') + '|' + e.id : '')

/** The first set still to do, or -1 when the exercise is done. */
export function nextSetIdx(entry) {
  const sets = entry?.sets || []
  return sets.findIndex(s => !s?.done)
}

/** The last ticked set, the one a tap on the last green dot takes back; -1 when none is. */
export function lastDoneIdx(entry) {
  const sets = entry?.sets || []
  for (let i = sets.length - 1; i >= 0; i--) if (sets[i]?.done) return i
  return -1
}

/** One state per set for the dots: 'done', 'cur' (the next one) or 'todo'. */
export function dotStates(entry) {
  const next = nextSetIdx(entry)
  return (entry?.sets || []).map((s, i) => (s?.done ? 'done' : i === next ? 'cur' : 'todo'))
}

/** One state per exercise for the strip at the top: 'done', 'cur', 'later' or 'todo'. */
export function stripStates(entries, cur, later = []) {
  const put = new Set(later)
  return (entries || []).map((e, i) => (doneAll(e) ? 'done' : i === cur ? 'cur' : put.has(laterKey(e)) ? 'later' : 'todo'))
}

/** Later entries that are finished or gone drop off the list. */
export function cleanLater(entries, later = []) {
  const live = new Set((entries || []).filter(e => !doneAll(e)).map(laterKey))
  return [...new Set(later)].filter(k => live.has(k))
}

/** Where to go after `cur`: the next unfinished exercise not put off, in order (wrapping round),
 *  else the oldest one put off. null when nothing is left. */
export function nextExercise(entries, cur, later = []) {
  const list = entries || []
  const put = new Set(later)
  const n = list.length
  for (let k = 1; k <= n; k++) {
    const i = (cur + k) % n
    if (i !== cur && !doneAll(list[i]) && !put.has(laterKey(list[i]))) return i
  }
  for (const key of later) {
    const i = list.findIndex(e => laterKey(e) === key && !doneAll(e))
    if (i >= 0 && i !== cur) return i
  }
  return null
}

/** Swipe left: this one goes to the back of the "later" list. Returns { later, next }; next is
 *  null when there is nothing else to do (then it stays where it is). */
export function putOff(entries, cur, later = []) {
  const e = entries?.[cur]
  if (!e || doneAll(e)) return { later, next: null }
  const key = laterKey(e)
  const rest = later.filter(k => k !== key)
  const next = nextExercise(entries, cur, rest)
  if (next == null) return { later: rest, next: null }
  return { later: [...rest, key], next }
}

/** Is this the very last set of the whole workout? (The button then says Finish workout.) */
export function isLastSet(entries, idx) {
  const left = (entries || []).reduce((n, e) => n + (e?.sets || []).filter(s => !s?.done).length, 0)
  return left === 1 && nextSetIdx(entries[idx]) >= 0
}

/** Up and down a step: weight by the gym's step (2.5 kg / 5 lb), reps by one, never below zero. */
export function stepValue(v, field, dir, unit = 'kg') {
  const step = field === 'w' ? (unit === 'lb' ? 5 : 2.5) : field === 'sec' ? 5 : field === 'min' ? 1 : 1
  const next = Math.round(((Number(v) || 0) + dir * step) * 100) / 100
  return Math.max(0, next)
}

/** Dragging a number up or down: how many steps the finger has moved so far (up is more). One
 * step every `px` pixels, so a short slow drag changes it by one. */
export const DRAG_PX = 18
export function dragSteps(dy, px = DRAG_PX) {
  const n = Math.trunc(-(Number(dy) || 0) / px)
  return n === 0 ? 0 : n
}

/** The one button's words for the set that is next. */
export function buttonLabel({ mode, warm, setNo, sec, last, side }) {
  if (last) return 'Finish workout'
  if (mode === 'time') return `Start ${sec || 0} s`
  if (mode === 'cardio') return 'Done'
  if (warm) return 'Warm-up done'
  if (side) return `Set ${setNo} ${side === 'L' ? 'left' : 'right'} done`
  return `Set ${setNo} done`
}

/** "1:12" */
export const clock = sec => {
  const s = Math.max(0, Math.round(sec || 0))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}
