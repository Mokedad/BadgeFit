// What today really is (BadgeFit): every routine on today as it stands now (a swap, a removal or
// an added one included), a run by its own name, and the time of all of it together. Home's line
// and Hayden's words are both made from this, so they always say the same thing.
import { effectiveRoutines } from '../history.js'
import { buildCombinedEntries } from '../session-merge.js'
import { runForRoutine } from './run-routines.js'
import { runMinutes } from './runs.js'
import { sessionMinutes, fitSession } from './session-length.js'
import { planLogged } from './reopen.js'

/** { name, minutes, today: { kind, title, minutes } | { kind: 'rest' }, logged, done } for a day. */
export function todayNow(S, iso) {
  const P = S?.police || {}
  const routines = effectiveRoutines(S, iso)
  const runOf = r => runForRoutine(P, r.id, iso)
  const name = routines.map(r => runOf(r)?.name || r.name).join(' + ')
  const gymIds = routines.filter(r => !runOf(r)).map(r => r.id)
  const minutes = routines.length
    ? routines.reduce((a, r) => a + (runOf(r) ? runMinutes(runOf(r)) : 0), 0) + (gymIds.length ? sessionMinutes(fitSession(buildCombinedEntries(S, gymIds).entries, P.sessionCap ?? 45)) : 0)
    : null
  // A day unticked to train again (lib/police/reopen.js) ignores what was logged before.
  const logged = planLogged(S, iso)
  const covered = new Set(logged.flatMap(w => [].concat(w.routineIds ?? w.routineId ?? [])))
  const done = !S?.active && logged.length > 0 && routines.every(r => covered.has(r.id))
  const today = S?.active ? { kind: 'gym', title: S.active.name }
    : routines.length ? { kind: gymIds.length ? 'gym' : 'run', title: name, minutes: minutes || undefined } : { kind: 'rest' }
  return { name, minutes, gymIds, today, logged, done }
}
