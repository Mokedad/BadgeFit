// Runs as things you can put on a day (BadgeFit): the weekday planner and the date picker list the
// guided runs beside your routines. A picked run becomes a small routine (one cardio row for its
// minutes), so the week and the day plan can point at it like any other, and the run it stands for
// is kept in S.police.runRoutines ({ routineId: runId }), which syncs with the rest of BadgeFit.
// On the day, Home and Start open it as the guided run with Hayden (runForRoutine).
import { RUNS, runById, runMinutes } from './runs.js'
import { routineFor } from './programme.js'
import { todayBadgeFitRun } from './today-run.js'
import { uid } from '../format.js'

const PLAN_RUN_KEYS = ['vo2', 'vo2b', 'easy', 'tempo', 'walk']

/** The routine id that stands for `runId`, made (and remembered) the first time. Mutates `s`. */
export function ensureRunRoutine(s, runId) {
  const run = runById(runId)
  if (!run) return null
  const map = s.police?.runRoutines || {}
  const have = Object.keys(map).find(id => map[id] === runId && (s.routines || []).some(r => r.id === id))
  if (have) return have
  const base = routineFor(run.cat === 'recovery' ? 'walk' : 'easy', 'beginner', '12-15')
  const id = uid()
  s.routines = [...(s.routines || []), { id, name: run.name, emoji: 'figureRun', ex: base.ex.slice(0, 1).map(e => ({ ...e, min: runMinutes(run) })) }]
  s.police = { ...(s.police || {}), runRoutines: { ...map, [id]: runId } }
  return id
}

/** Is this routine a run (one you picked, or the plan's own run days)? */
export function isRunRoutine(P, routineId) {
  if (P?.runRoutines?.[routineId]) return true
  return PLAN_RUN_KEYS.some(k => P?.keys?.[k] === routineId)
}

/** The guided run a routine stands for on `iso`, or null. */
export function runForRoutine(P, routineId, iso) {
  const picked = P?.runRoutines?.[routineId]
  if (picked) return runById(picked)
  if (!PLAN_RUN_KEYS.some(k => P?.keys?.[k] === routineId)) return null
  const t = todayBadgeFitRun(P, iso)
  return t && t.routineId === routineId ? t.run : runById(Object.keys(P.keys).find(k => P.keys[k] === routineId) === 'walk' ? 'recovery-walk' : 'easy-30')
}

export { RUNS }
