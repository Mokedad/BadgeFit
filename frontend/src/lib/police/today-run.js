// Today's run on the BadgeFit plan, for the screens outside the hub (Home, Start): the guided
// run (runs.js) the plan's day calls for, and the routine id the plan put on that day, so a tap
// on it opens the run player with Jarvis rather than a gym session. Pure.
import { planWeekOf, weekPlan, planOptsOf } from './programme.js'
import { runForDay } from './runs.js'

/** { run, day, routineId } when today is a run (or recovery walk) day of the plan, else null. */
export function todayBadgeFitRun(P, iso, dow = new Date(iso + 'T12:00:00').getDay()) {
  if (!P?.level) return null
  const pw = planWeekOf(P, iso)
  if (!pw.week) return null
  const day = weekPlan(P.level, pw.week, P.age, planOptsOf(P)).days.find(d => d.day === dow)
  const run = day && (day.kind === 'run' || day.kind === 'walk') ? runForDay(day) : null
  return run ? { run, day, routineId: P.keys?.[day.key] || null } : null
}
