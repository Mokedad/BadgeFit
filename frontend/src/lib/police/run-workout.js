// A finished guided run (BadgeFit) as the day's workout: saved beside the run log so the day reads
// complete everywhere a workout does (Home's today row and week strip, "left this week", the plan,
// the streak, the calendar), whether or not something else was trained that day. It credits the
// day's planned run (the routine whose run this was, else the day's run routine), so a run day is
// done once the run is. Pure.
import { runForRoutine } from './run-routines.js'

export const RUN_EX = '0685' // the catalogue's "run", a cardio exercise

/** The routines of `todayIds` (the day's planned ones) a run of `runId` completes. */
export function runCredits(P, todayIds, runId, iso) {
  const ids = [].concat(todayIds || [])
  const exact = ids.filter(id => runForRoutine(P, id, iso)?.id === runId)
  return exact.length ? exact : ids.filter(id => runForRoutine(P, id, iso))
}

/** The workout a logged run becomes. `entry`: the run-log entry ({ id, at, min, km?, completed... }). */
export function runWorkout({ run, entry, routineIds = [], now = Date.now() }) {
  const min = Math.max(0, Number(entry?.min) || 0)
  const km = Number(entry?.km) || null
  return {
    id: `run-${entry.id}`,
    d: entry.at,
    start: now - min * 60000,
    end: now,
    routineIds,
    routineId: routineIds[0] ?? null,
    name: run?.name || 'Run',
    runLogId: entry.id,
    entries: [{ id: RUN_EX, sets: [{ mode: 'cardio', min, ...(km ? { km } : {}), done: true }], topW: null, target: { mode: 'cardio', min: Number(entry?.planned) || min } }],
    prs: [],
  }
}
