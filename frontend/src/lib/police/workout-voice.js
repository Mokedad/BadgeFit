// Jarvis in the workout (BadgeFit): what he says, unprompted, while you train. Pure: the running
// session comes in, a line goes out; components/JarvisWorkout.jsx watches the session and says
// it (lib/police/voice.js). Short on purpose: spoken between sets, not read.
//   start  - the session opens: what it is and the first exercise with its range
//   set    - a work set was ticked: the rep-range call (set-advice.js), or the exercise is done
//   rest   - the rest ran out: which set is next
//   finish - the session was saved: sets, minutes, days to the test
import { liveAdvice } from './set-advice.js'
import { setLine as adviceLine, pick } from './jarvis.js'

/** The rep range an entry trains in (as RepRangeCoach reads it), or null. */
export function rangeOf(entry) {
  const t = entry?.target || {}, p = entry?.planned || {}
  if (t.repsMin > 0 && t.reps >= t.repsMin) return { min: t.repsMin, max: t.reps }
  if (p.repsMin > 0 && p.reps >= p.repsMin) return { min: p.repsMin, max: p.reps }
  return null
}

const workSets = entry => (entry?.sets || []).filter(s => s && !s.warmup && s.kind !== 'warmup')
const allDone = entry => (entry?.sets || []).length > 0 && entry.sets.every(s => s.done)
const clean = s => s.replace(/\s+/g, ' ').trim()

export function startLine(A, nameOf) {
  const first = (A?.entries || [])[0]
  if (!first) return ''
  const r = rangeOf(first)
  const n = workSets(first).length
  return clean(`Right, ${A.name || 'let us get to work'}. First up, ${nameOf(first.id)}${n ? `, ${n} ${n === 1 ? 'set' : 'sets'}` : ''}${r ? ` of ${r.min} to ${r.max}` : ''}. Let us go.`)
}

/** The set ticked between two snapshots of the session: { e, s } indexes, or null. */
export function tickedSet(prev, next) {
  if (!prev || !next || prev.start !== next.start) return null
  const pe = prev.entries || [], ne = next.entries || []
  for (let e = 0; e < ne.length; e++) {
    const ps = pe[e]?.sets || [], ns = ne[e]?.sets || []
    if (pe[e]?.id !== ne[e]?.id) continue
    for (let s = 0; s < ns.length; s++) if (ns[s]?.done && ps[s] && !ps[s].done) return { e, s }
  }
  return null
}

export function setDoneLine(A, at, { nameOf, unit = 'kg', seed = Date.now() } = {}) {
  const entry = A?.entries?.[at?.e]
  const set = entry?.sets?.[at?.s]
  if (!entry || !set || set.warmup || set.kind === 'warmup') return ''
  if (allDone(entry)) {
    const next = (A.entries || []).slice(at.e + 1).find(x => !allDone(x)) || (A.entries || []).find(x => !allDone(x))
    return clean(`That is ${nameOf(entry.id)} done.${next ? ` Next up, ${nameOf(next.id)}.` : ' That was the last one. Hit Finish when you are ready.'}`)
  }
  const a = liveAdvice(entry.sets, rangeOf(entry), unit)
  if (a && !a.firstTime && a.lastIdx === at.s) return adviceLine(a.advice, unit, seed)
  return pick(['Good set.', 'Nice work. Breathe.', 'Solid. Keep that form.', 'That is one more in the bank.'], seed)
}

export function restLine(A) {
  const entry = (A?.entries || []).find(x => !allDone(x))
  if (!entry) return ''
  const left = (entry.sets || []).findIndex(s => !s.done)
  return clean(`Rest is up. Set ${left + 1}. Let us go.`)
}

export function finishLine(workout, { days = null, testName = 'PCT' } = {}) {
  const sets = (workout?.entries || []).reduce((n, e) => n + (e.sets || []).filter(s => s.done !== false).length, 0)
  const min = Number.isFinite(workout?.start) && Number.isFinite(workout?.end) ? Math.round((workout.end - workout.start) / 60000) : null
  const to = days != null && days > 0 ? ` ${days} ${days === 1 ? 'day' : 'days'} to your ${testName}. Every session counts.` : days === 0 ? ` Your ${testName} is today. You are ready.` : ''
  return clean(`Session done. ${sets} ${sets === 1 ? 'set' : 'sets'}${min ? ` in ${min} minutes` : ''}. Good work.${to}`)
}
