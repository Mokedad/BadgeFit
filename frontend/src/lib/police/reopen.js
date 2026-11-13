// BadgeFit: untick a day's plan to train it again. The workouts already logged that day stay in
// the stats and history; they just stop counting the day as done, so Home offers today's session
// again instead of "Done for today". S.police.reopened = { [iso]: when (ms) }: a workout finished
// after that time counts again.

/** Whether a logged workout counts toward its day's plan being done. */
export function countsForPlan(w, P) {
  const at = P?.reopened?.[w?.d]
  return !at || (Number(w.end) || Number(w.start) || 0) > at
}

/** The workouts that count for the plan on `iso`. */
export const planLogged = (S, iso) => (S?.workouts || []).filter(w => w.d === iso && countsForPlan(w, S?.police))

/** The police patch that reopens `iso` now, keeping only the last two weeks of reopened days. */
export function reopenPatch(P, iso, now = Date.now(), today = iso) {
  const keep = Object.fromEntries(Object.entries(P?.reopened || {}).filter(([d]) => d >= shift(today, -14)))
  return { reopened: { ...keep, [iso]: now } }
}
const shift = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
