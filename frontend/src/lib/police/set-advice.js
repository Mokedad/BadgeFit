// Police Prep: the rep-range rule, set by set.
//
// Pick a range (say 4-6) and a weight. After each working set:
//   · fewer reps than the bottom of the range  → move DOWN next set
//   · inside the range, short of the top       → STAY at this weight
//   · the top of the range or more             → move UP next set (+5 lb / +2.5 kg)
// Week to week the same rule carries over: the weight you finished on is where you start.

export const REP_RANGES = [
  { id: '4-6', min: 4, max: 6, goal: 'Strength and power', rest: '2-3 min' },
  { id: '6-8', min: 6, max: 8, goal: 'Strength and size', rest: '2 min' },
  { id: '10-12', min: 10, max: 12, goal: 'Muscle and fat loss', rest: '60-90 s' },
  { id: '12-15', min: 12, max: 15, goal: 'Endurance and technique', rest: '45-60 s' },
]

export const rangeById = id => REP_RANGES.find(r => r.id === id) || null

/** The load step for a unit: 5 lb, or the 2.5 kg that is the closest plate pair in kg. */
export const stepFor = unit => (unit === 'lb' ? 5 : 2.5)

const round = (n, step) => Math.round(n / step) * step

/**
 * What to do next set. `range` is { min, max }. Returns
 * { action: 'down' | 'stay' | 'up', weight, delta } or null for missing input.
 */
export function nextSetAdvice({ reps, weight, range, unit = 'kg' }) {
  const r = Number(reps), w = Number(weight)
  if (!range || !Number.isFinite(r) || r < 0 || !Number.isFinite(w) || w < 0) return null
  const step = stepFor(unit)
  let action = 'stay'
  if (r < range.min) action = 'down'
  else if (r >= range.max) action = 'up'
  const delta = action === 'up' ? step : action === 'down' ? -step : 0
  return { action, delta, weight: Math.max(0, round(w + delta, step / 2)) }
}

/**
 * A whole session read with the rule, set by set: each logged set { reps, weight } gets the
 * advice for the set after it. The last advice is where next week's first set starts.
 */
export function sessionAdvice(sets, range, unit = 'kg') {
  const out = (sets || []).map(s => ({ ...s, advice: nextSetAdvice({ reps: s.reps, weight: s.weight, range, unit }) }))
  const last = out.filter(s => s.advice).at(-1)
  return { sets: out, nextStart: last ? last.advice.weight : null }
}

/**
 * The rule live, inside a workout: from the session's rows ([{ w, r, done, warmup? }]) and the
 * exercise's range, the last finished work set, the next one still to do, and the advice for it.
 * `firstTime` is true while no work set is done yet (the first set sets the starting point).
 * null without a range or for rows with no load (body weight: there the reps climb instead).
 */
export function liveAdvice(sets, range, unit = 'kg') {
  if (!range || !(range.min > 0) || !(range.max >= range.min)) return null
  const work = (sets || []).map((s, i) => ({ s, i })).filter(x => x.s && !x.s.warmup && x.s.kind !== 'warmup')
  const done = work.filter(x => x.s.done && Number(x.s.r) > 0)
  const last = done.at(-1)
  const next = work.find(x => !x.s.done)
  if (!last) return { firstTime: true, range, nextIdx: next?.i ?? null }
  if (!(Number(last.s.w) > 0)) return null
  const advice = nextSetAdvice({ reps: last.s.r, weight: last.s.w, range, unit })
  return { firstTime: false, range, lastIdx: last.i, nextIdx: next?.i ?? null, advice, reps: Number(last.s.r), weight: Number(last.s.w) }
}
