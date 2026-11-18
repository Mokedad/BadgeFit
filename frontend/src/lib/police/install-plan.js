// Puts a BadgeFit plan on Home: its routines (gym days and runs), its weekly schedule as the
// running programme, and the lifts in the current phase's rep range. Used by the plan picker
// (views/PoliceFit.jsx) and by "I passed" on Home, which moves a member onto the Academy prep plan.
// A mutator for useStore's update(s => ...). A plan already running keeps its start, so switching
// does not restart the weeks; the routines of the plan it replaces are removed, your own are kept.
import { buildPoliceProgramme, applyPhaseRange, phaseOf, planStart, planWeekOf } from './programme.js'
import { saveProgramme, startProgramme } from '../programmes.js'
import { deleteRoutine } from '../routines.js'
import { todayISO } from '../format.js'

/** Who is on the BadgeFit plan, rather than one they uploaded or one Hayden built. */
export const onBadgeFitPlan = P => !['upload', 'own'].includes(P?.planChoice)

/**
 * `choice`: 'badgefit' or 'run' (running focus). `track`: 'academy' for the Academy prep plan,
 * else the PCT plan. `date`: the test (or Academy start) date, kept on the profile.
 */
export function installPlanIn(s, { level, choice = 'badgefit', date, kg = null, track, now = Date.now(), today = todayISO() } = {}) {
  const P = s.police || {}
  const academy = track === 'academy'
  const built = buildPoliceProgramme(level, now, { beepFocus: !!P.beepFocus || choice === 'run', runFocus: choice === 'run', ...(academy ? { track: 'academy' } : {}) })
  const start = P.start && P.planV === 3 ? P.start : planStart(date || null, today)
  const weekAt = planWeekOf({ start, testDate: date || P.testDate || undefined }, today).tw || 1
  const old = Object.values(P.keys || {})
  const routines = applyPhaseRange(built.routines, level, weekAt, built.keys, academy ? 'academy' : undefined).map(({ police, ...r }) => r)
  s.routines = [...(s.routines || []), ...routines]
  saveProgramme(s, built.programme)
  startProgramme(s, built.programme.id)
  for (const id of old) if (!routines.some(r => r.id === id)) deleteRoutine(s, id)
  const next = {
    ...(s.police || {}), level, start, planV: 3, planChoice: choice, programmeId: built.programme.id, keys: built.keys,
    phase: phaseOf(level, weekAt, academy ? 'academy' : undefined).n,
    ...(date ? { testDate: date } : {}), ...(kg > 30 ? { weightKg: kg } : {}),
  }
  if (academy) next.track = 'academy'; else delete next.track
  s.police = next
}
