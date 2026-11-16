// The kinds of training a member can pick (the Start sheet and "change this day"): body-part gym
// sessions, full body, and the kinds of run, each one round button. Picking a kind lists only
// that kind's workouts. Pure.
import { RUNS } from './runs.js'
import { runForRoutine } from './run-routines.js'
import { uid } from '../format.js'

export const GYM_TYPES = [
  { id: 'chest', label: 'Chest', icon: 'barbell', match: /chest|push day|press/i },
  { id: 'legs', label: 'Legs', icon: 'legs', match: /squat|leg|lower|glute/i },
  { id: 'arms', label: 'Arms & back', icon: 'arm', match: /arm|back|pull|bicep|tricep/i },
  { id: 'full', label: 'Full body', icon: 'figureStrength', match: /full.?body|whole body|total body/i },
]
export const RUN_TYPES = [
  { id: 'easy', label: 'Easy run', icon: 'figureRun', cats: ['base'] },
  { id: 'fast', label: 'Intervals', icon: 'bolt', cats: ['vo2', 'intervals'] },
  { id: 'tempo', label: 'Tempo', icon: 'gauge', cats: ['tempo'] },
  { id: 'beep', label: 'Beep prep', icon: 'speaker', cats: ['beep'] },
  { id: 'walk', label: 'Walk', icon: 'steps', cats: ['recovery', 'walk'] },
]
export const typeById = id => [...GYM_TYPES, ...RUN_TYPES].find(t => t.id === id) || null

const isRunRoutine = (S, r, iso) => !!runForRoutine(S?.police, r.id, iso) || ((r.ex || []).length > 0 && r.ex.every(e => e.mode === 'cardio'))

/** The gym routines (never a run's), once per name: the weekly plan's copy wins, else the newest. */
export function gymRoutines(S, iso) {
  const onPlan = new Set(Object.values(S?.week || {}).flatMap(v => [].concat(v ?? [])))
  const byName = new Map()
  for (const r of S?.routines || []) {
    if (isRunRoutine(S, r, iso) || !(r.ex || []).length) continue
    const had = byName.get(r.name)
    if (!had || !onPlan.has(had.id)) byName.set(r.name, r)
  }
  return [...byName.values()]
}

/** What a kind offers: [{ kind: 'gym', routine } | { kind: 'run', run } | { kind: 'make-full' }]. */
export function itemsFor(S, typeId, iso) {
  const t = typeById(typeId)
  if (!t) return []
  if (t.cats) return RUNS.filter(r => t.cats.includes(r.cat)).map(run => ({ kind: 'run', run }))
  const all = gymRoutines(S, iso)
  // A routine belongs to the first kind its name fits, so "Arms, Back, Shoulders" is not also Chest.
  const kindOf = r => GYM_TYPES.find(g => g.match.test(r.name.split(/,| & /)[0]))?.id || GYM_TYPES.find(g => g.match.test(r.name))?.id
  const hits = all.filter(r => kindOf(r) === t.id).map(routine => ({ kind: 'gym', routine }))
  if (t.id === 'full' && !hits.length && all.length) return [{ kind: 'make-full' }]
  return hits
}

/** The gym kinds that have something to offer (full body can always be made from the others). */
export const gymTypesFor = (S, iso) => GYM_TYPES.filter(t => itemsFor(S, t.id, iso).length)

/**
 * A full body session made from the member's own gym days: the first two lifts of each, so it
 * uses exercises and weights they already know. Returns its id (the one made before, if any).
 */
export function ensureFullBody(s, iso) {
  const had = (s.routines || []).find(r => r.id === s.police?.fullBodyId)
  if (had) return had.id
  const days = gymRoutines(s, iso).filter(r => !GYM_TYPES[3].match.test(r.name)).slice(0, 4)
  const ex = days.flatMap(r => r.ex.filter(e => e.mode !== 'cardio').slice(0, 2).map(e => ({ ...e })))
  if (!ex.length) return null
  const id = uid()
  s.routines = [...(s.routines || []), { id, name: 'Full body', emoji: 'figureStrength', ex }]
  s.police = { ...(s.police || {}), fullBodyId: id }
  return id
}
