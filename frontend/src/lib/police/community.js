// The community's small rules (views/Community.jsx): the stages people show, what a shared plan
// is made of, and how a followed plan becomes your own workouts. Pure.
import { uid } from '../format.js'

export const STAGES = [
  { id: 'applicant', label: 'Applicant' },
  { id: 'passed', label: 'Passed PCT' },
  { id: 'academy', label: 'Academy' },
  { id: 'graduate', label: 'Graduate' },
]
export const stageLabel = id => STAGES.find(s => s.id === id)?.label || ''
/** The stage a member shows: the one they chose, else Passed PCT once they said so, else Applicant. */
export const stageOf = P => (STAGES.some(s => s.id === P?.stage) ? P.stage : P?.afterTest === 'passed' ? 'passed' : 'applicant')

export const AREAS = [
  { id: 'pct', label: 'PCT prep' },
  { id: 'apply', label: 'Application' },
  { id: 'academy', label: 'Academy life' },
  { id: 'grads', label: 'Graduates' },
]

/** A plan to share, from the member's own routines: exercises by id and numbers, nothing else. */
export function planFromRoutines(routines, name, level = 'beginner') {
  const out = (routines || []).slice(0, 7).map(r => ({
    name: String(r.name || 'Session').slice(0, 60),
    ex: (r.ex || []).slice(0, 20).map(e => ({
      id: e.id, sets: Number(e.sets) || 1,
      ...(e.mode === 'time' ? { mode: 'time', sec: Number(e.sec) || 30 } : e.mode === 'cardio' ? { mode: 'cardio', min: Number(e.min) || 20 } : { reps: Number(e.reps) || 10, repsMin: Number(e.repsMin || e.reps) || 10 }),
    })),
  })).filter(r => r.ex.length)
  return out.length ? { name: String(name || out[0].name).trim().slice(0, 60), level: level === 'intermediate' ? 'intermediate' : 'beginner', routines: out } : null
}

/** How a plan reads in one line: "Beginner · 3 sessions · 12 following". */
export function planLine(plan, followers = 0) {
  const n = plan?.routines?.length || 0
  return [plan?.level === 'intermediate' ? 'Intermediate' : 'Beginner', `${n} ${n === 1 ? 'session' : 'sessions'}`, followers ? `${followers} following` : null].filter(Boolean).join(' · ')
}

/**
 * Following a plan adds its sessions to your own workouts (weights start empty; yours to set), once:
 * S.police.followedPlans remembers which routines came from which post. Returns the ids added.
 */
export function addFollowedPlan(s, postId, plan) {
  const had = s.police?.followedPlans?.[postId]
  if (had && had.every(id => (s.routines || []).some(r => r.id === id))) return had
  const made = (plan?.routines || []).map(r => ({
    id: uid(), name: r.name, emoji: r.ex.every(e => e.mode === 'cardio') ? 'figureRun' : 'dumbbell',
    ex: r.ex.map(e => (e.mode === 'time' ? { id: e.id, mode: 'time', sets: e.sets, sec: e.sec, prog: 'time', weight: 0 }
      : e.mode === 'cardio' ? { id: e.id, mode: 'cardio', sets: 1, min: e.min }
        : { id: e.id, sets: e.sets, reps: e.reps, repsMin: e.repsMin, prog: 'double', weight: 0 })),
  }))
  s.routines = [...(s.routines || []), ...made]
  s.police = { ...(s.police || {}), followedPlans: { ...(s.police?.followedPlans || {}), [postId]: made.map(r => r.id) } }
  return made.map(r => r.id)
}

/** "2 h ago" for a post. */
export function ago(at, now = Date.now()) {
  const s = Math.max(0, (now - at) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return Math.floor(s / 60) + ' min'
  if (s < 86400) return Math.floor(s / 3600) + ' h'
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' d'
  return new Date(at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
