// How long a BadgeFit gym session is today: asked at Start, so a busy day still gets trained.
//   quick     3 exercises, 3 sets each: the two main lifts and the day's test practice
//   standard  5 exercises, 3 sets each
//   full      the whole session as the plan wrote it
// The plan itself is not changed: only today's session is cut down.

export const LENGTHS = [
  { id: 'quick', label: 'Quick', n: 3, sets: 3 },
  { id: 'standard', label: 'Standard', n: 5, sets: 3 },
  { id: 'full', label: 'Full session', n: Infinity, sets: Infinity },
]
export const lengthOf = id => LENGTHS.find(l => l.id === id) || LENGTHS[2]

// The moves the test itself asks for (push-ups, jump, plank and friends): one always stays in.
const PRACTICE = new Set(['0662', '0514', '0463', '0814', '0472', '3420', '2133'])

/**
 * Today's entries cut to a length: the first lifts in the plan's order (the big ones come
 * first) with one test-practice move kept, each at no more than the length's sets. Cardio
 * entries (a run in the same session) are always kept whole.
 */
export function trimEntries(entries, id) {
  const len = lengthOf(id)
  const list = entries || []
  if (len.n === Infinity) return list
  const gym = list.filter(e => !isCardio(e))
  if (gym.length <= len.n) return list.map(e => capSets(e, len.sets))
  const practice = gym.find(e => PRACTICE.has(e.id))
  const keep = new Set(gym.filter(e => e !== practice).slice(0, practice ? len.n - 1 : len.n))
  if (practice) keep.add(practice)
  return list.filter(e => isCardio(e) || keep.has(e)).map(e => capSets(e, len.sets))
}

const isCardio = e => (e?.sets || []).some(s => s?.mode === 'cardio') || e?.target?.mode === 'cardio'
const capSets = (e, n) => (isCardio(e) || !Array.isArray(e.sets) || e.sets.length <= n ? e : { ...e, sets: e.sets.slice(0, n) })

/** About how long the entries take, in minutes: each set with its rest, and the walk between machines. */
export function sessionMinutes(entries) {
  let min = 0
  for (const e of entries || []) {
    if (isCardio(e)) { min += (e.sets || []).reduce((a, s) => a + (Number(s?.min) || 0), 0) || 20; continue }
    min += (e.sets || []).length * 2.25 + 1
  }
  return Math.max(5, Math.round(min / 5) * 5)
}
