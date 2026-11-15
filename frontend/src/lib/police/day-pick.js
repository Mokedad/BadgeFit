// The "change this day" sheet in BadgeFit (sheets.jsx DayOverride): a few round buttons, not
// every routine ever made. The plan's own sessions come first; anything older (an earlier plan,
// a copy made twice) folds away under "Other workouts", once per name.

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** This week's sessions: the routines on the weekly plan, Monday first, each once. */
export function planSessions(S) {
  const week = S?.week || {}
  const routines = S?.routines || []
  const seen = new Set(), names = new Set(), out = []
  for (const d of WEEK_ORDER) {
    for (const id of [].concat(week[d] ?? [])) {
      const r = routines.find(x => x.id === id)
      if (!r || seen.has(id) || names.has(r.name)) continue
      seen.add(id); names.add(r.name); out.push(r)
    }
  }
  return out
}

/**
 * Everything else: routines not on the weekly plan and not a run's own routine, once per name
 * (the newest copy, which is the last one made) and never a name the plan already shows.
 */
export function otherRoutines(S) {
  const plan = planSessions(S)
  const planNames = new Set(plan.map(r => r.name))
  const runs = S?.police?.runRoutines || {}
  const byName = new Map()
  for (const r of S?.routines || []) {
    if (runs[r.id] || planNames.has(r.name) || plan.some(p => p.id === r.id)) continue
    byName.delete(r.name)
    byName.set(r.name, r)
  }
  return [...byName.values()]
}

/** A name short enough for a round button: "Chest, Shoulders & Abs" → "Chest". */
export function shortName(name) {
  const s = String(name || '').trim()
  const first = s.split(/,| & | and /)[0].trim()
  return first.length >= 3 ? first : s
}
