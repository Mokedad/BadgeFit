// How long a BadgeFit gym session takes, and fitting it to the time there is (45 minutes unless
// the member gives it more). The rest after each set follows the kind of exercise:
//   heavy lifting (6 reps or fewer at the top)  3½ min
//   strength (7-8 reps)                          2½ min
//   muscle (9-12 reps)                           90 s
//   lighter sets (13+ reps)                      60 s
//   explosive work (jumps, swings), body weight  45 s: keep moving
//   holds (plank, carries)                       45 s
// A rest the member set on the exercise is kept. Runs are not touched: a run is the run the plan
// chose, at its own length. Only today's session is changed; the plan stays as it is. Pure.

// Explosive and body-weight moves: short rests, more movement.
const QUICK = new Set(['0514', '0549', '0662', '0814', '0472', '1179'])
// The moves the test itself asks for (push-ups, jump, plank and friends): one always stays in.
const PRACTICE = new Set(['0662', '0514', '0463', '0814', '0472', '3420', '2133'])

export const CAPS = [
  { id: 45, label: '45 min' },
  { id: 60, label: '60 min' },
  { id: 0, label: 'Full' },
]

const isCardio = e => (e?.sets || []).some(s => s?.mode === 'cardio') || e?.target?.mode === 'cardio'
const isHold = e => e?.target?.mode === 'time' || (e?.sets || []).some(s => s?.mode === 'time')
const topReps = e => Number(e?.target?.reps) || Number(e?.sets?.[0]?.r) || 10

/** Seconds of rest after each set of this exercise, by its kind (or its own, when set). */
export function restFor(e) {
  const own = Math.round(Number(e?.target?.restSec)) || 0
  if (own > 0) return own
  if (isCardio(e)) return 0
  if (isHold(e) || QUICK.has(e?.id)) return 45
  const top = topReps(e)
  return top <= 6 ? 210 : top <= 8 ? 150 : top <= 12 ? 90 : 60
}

/** A set's working time in seconds: a hold its seconds, a lift about 3 s a rep. */
const workFor = e => (isHold(e) ? (Number(e?.target?.sec) || 40) : Math.max(25, topReps(e) * 3))

/** Minutes one exercise takes: its sets, the rests between them, and getting to the next one. */
export function entryMinutes(e) {
  if (isCardio(e)) return (e.sets || []).reduce((a, s) => a + (Number(s?.min) || 0), 0) || 20
  const n = (e?.sets || []).length || 0
  if (!n) return 0
  return (n * workFor(e) + (n - 1) * restFor(e)) / 60 + 1.5
}

/** About how long the entries take, in minutes, rounded to 5. */
export function sessionMinutes(entries) {
  const m = (entries || []).reduce((a, e) => a + entryMinutes(e), 0)
  return Math.max(5, Math.round(m / 5) * 5)
}

const capSets = (e, n) => (isCardio(e) || !Array.isArray(e.sets) || e.sets.length <= n ? e : { ...e, sets: e.sets.slice(0, n) })
const withRest = e => (isCardio(e) || Number(e?.target?.restSec) > 0 ? e : { ...e, target: { ...(e.target || {}), restSec: restFor(e) } })

/**
 * Today's entries fitted to `cap` minutes (0: the whole session), each with its rest set.
 * First the sets come down to 3, then exercises come off the end, keeping the first two lifts
 * (the big ones lead the plan) and one test-practice move. Runs are never cut.
 */
export function fitSession(entries, cap = 45) {
  let list = (entries || []).map(withRest)
  const over = () => cap > 0 && list.reduce((a, e) => a + entryMinutes(e), 0) > cap
  if (!cap || !over()) return list
  list = list.map(e => capSets(e, 3))
  const practice = list.find(e => !isCardio(e) && PRACTICE.has(e.id))
  while (over()) {
    const gym = list.filter(e => !isCardio(e))
    const drop = [...gym].reverse().find((e, i, a) => e !== practice && gym.indexOf(e) >= 2)
    if (!drop) break
    list = list.filter(e => e !== drop)
  }
  return list
}

/** A rest in words: "3½ min", "90 s". */
export function restLabel(sec) {
  if (!sec) return ''
  if (sec < 120) return `${sec} s`
  const m = sec / 60
  return Number.isInteger(m) ? `${m} min` : `${Math.floor(m)}½ min`
}
