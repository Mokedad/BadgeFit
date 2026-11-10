// Hayden in the workout (BadgeFit): what he says, unprompted, while you train. Pure: the running
// session comes in, a line goes out; components/JarvisWorkout.jsx watches the session and says
// it (lib/police/voice.js). Short on purpose: spoken between sets, not read.
//   start  - the session opens: what it is and the first exercise with its range
//   set    - a work set was ticked: the rep-range call (set-advice.js), or the exercise is done
//   rest   - the rest ran out: which set is next
//   finish - the session was saved: sets, minutes, days to the test
import { liveAdvice } from './set-advice.js'
import { setLine as adviceLine, pick } from './jarvis.js'

/**
 * The rep range an entry trains in, or null. Its own range when it has one; otherwise (a plain
 * "4 x 8") the range ending at the planned reps, two below to the planned number: 8 planned is
 * 6-8, so every weighted exercise moves by the rep-range rule, set to set.
 */
export function rangeOf(entry) {
  const t = entry?.target || {}, p = entry?.planned || {}
  if (t.repsMin > 0 && t.reps >= t.repsMin) return { min: t.repsMin, max: t.reps }
  if (p.repsMin > 0 && p.reps >= p.repsMin) return { min: p.repsMin, max: p.reps }
  const r = Number(t.reps) || Number(p.reps) || Number((entry?.sets || []).find(s => s && !s.warmup && Number(s.r) > 0)?.r) || 0
  return r >= 4 && r <= 30 ? { min: r - 2, max: r } : null
}

const workSets = entry => (entry?.sets || []).filter(s => s && !s.warmup && s.kind !== 'warmup')
const allDone = entry => (entry?.sets || []).length > 0 && entry.sets.every(s => s.done)
const clean = s => s.replace(/\s+/g, ' ').trim()
const repsWords = r => (r.min === r.max ? `${r.max}` : `${r.min} to ${r.max}`)

export function startLine(A, nameOf) {
  const first = (A?.entries || [])[0]
  if (!first) return ''
  const r = rangeOf(first)
  const n = workSets(first).length
  return clean(`Right, ${A.name || 'let us get to work'}. First up, ${nameOf(first.id)}${n ? `, ${n} ${n === 1 ? 'set' : 'sets'}` : ''}${r ? ` of ${repsWords(r)}` : ''}. Let us go.`)
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

// --- rest coaching ------------------------------------------------------------------------
const PUSH = [
  'Lock in. The test does not care how you feel today. It cares what you did today.',
  'Breathe. Slow it down. The next set is the one that changes you.',
  'Stay off the phone. Stay in it. Every rest is part of the set.',
  'You did not come here to be comfortable. You came here to earn that badge.',
  'Your future self is watching this rest. Make it proud.',
  'Champions are built in the boring middle. This is the middle. Own it.',
  'Shake it out, sip some water, and get your head right for the next one.',
  'Somebody else wants your spot at the academy. Outwork them, right now.',
]
/** A line for the middle of a rest. */
export const restMotivation = (seed = Date.now()) => pick(PUSH, seed)

/** "a 20 and a 10 each side" from a load (plates.js rowLoad), or ''. */
export function plateWords(load, unit = 'kg') {
  if (!load || load.missing > 0) return ''
  if (load.barOnly) return 'Just the bar.'
  const list = (load.plates || []).map(w => String(w).replace(/\.0+$/, ''))
  if (!list.length) return ''
  const words = list.length === 1 ? `a ${list[0]}` : `${list.slice(0, -1).map(x => `a ${x}`).join(', ')} and a ${list.at(-1)}`
  return load.kind === 'pairs' ? `That is ${words} each side.` : `That is ${words} ${unit} on the stack.`
}

/** What is coming after the rest: { entry, idx (entry), setIdx, setNo } or null. */
export function upNext(A) {
  const entries = A?.entries || []
  const order = [A?.cur, ...entries.map((_, i) => i)].filter(i => i != null && entries[i])
  for (const e of order) {
    const i = (entries[e].sets || []).findIndex(s => !s.done)
    if (i >= 0) return { entry: entries[e], idx: e, setIdx: i, setNo: i + 1 }
  }
  return null
}

/** The 20-seconds-left call: which set, what weight, the plates, a form cue. */
export function nextSetLine(A, { nameOf, unit = 'kg', plates = '', cue = '' } = {}) {
  const n = upNext(A)
  if (!n) return ''
  const set = n.entry.sets[n.setIdx] || {}
  const r = rangeOf(n.entry)
  const reps = r ? repsWords(r) : set.r > 0 ? `${set.r}` : ''
  const w = Number(set.w) > 0 ? `${String(set.w).replace(/\.0+$/, '')} ${unit}` : ''
  const what = w ? `${w}${reps ? ` for ${reps}` : ''}` : reps ? `${reps} reps` : ''
  return clean(`20 seconds. Set ${n.setNo}, ${nameOf(n.entry.id)}${what ? `, ${what}` : ''}. ${plates} ${cue}`)
}

// --- the wrap-up --------------------------------------------------------------------------
const workRows = w => (w?.entries || []).flatMap(e => (e.sets || []).filter(s => s && s.done !== false && !s.warmup && s.kind !== 'warmup'))
/** Weight × reps over the work sets of a saved workout. */
export const volumeOf = w => Math.round(workRows(w).reduce((v, s) => v + (Number(s.w) || 0) * (Number(s.r) || 0), 0))

/** The last saved workout of the same routine before this one, or null. */
export function previousOf(workout, workouts) {
  const rid = workout?.routineId
  return (workouts || []).filter(x => x && x !== workout && x.start < workout.start && (rid ? x.routineId === rid : x.name === workout.name))
    .sort((a, b) => b.start - a.start)[0] || null
}

/**
 * About 15 seconds of read-out at the end: what was done, against last time, PRs, what it means
 * for the goal ('lose' or anything else = strength/test prep), and the days to the test.
 */
export function wrapUpLine(workout, { workouts = [], goal = 'lose', weightKg = null, days = null, testName = 'PCT', nameOf = id => id } = {}) {
  const sets = workRows(workout).length
  const min = Number.isFinite(workout?.start) && Number.isFinite(workout?.end) ? Math.round((workout.end - workout.start) / 60000) : null
  const vol = volumeOf(workout)
  const prev = previousOf(workout, workouts)
  const pv = prev ? volumeOf(prev) : 0
  const parts = [`Solid session. ${sets} ${sets === 1 ? 'set' : 'sets'}${min ? ` in ${min} minutes` : ''}.`]
  if (vol > 0 && pv > 0) {
    const pct = Math.round(((vol - pv) / pv) * 1000) / 10
    parts.push(pct > 0 ? `Total volume up ${pct} percent on last time.` : pct < 0 ? `Volume ${Math.abs(pct)} percent under last time. Fine on a lighter day, not every week.` : 'Same volume as last time.')
  }
  const prs = (workout?.prs || []).length
  if (prs) parts.push(prs === 1 ? 'And you set a PR.' : `And you set ${prs} PRs.`)
  if (goal === 'lose') {
    const kcal = weightKg > 0 && min ? Math.round((5 * weightKg * min) / 60 / 10) * 10 : null
    parts.push(`${kcal ? `That burned roughly ${kcal} calories. ` : ''}For the weight loss, hit your protein tonight and keep the deficit. That is how you drop fat and keep this strength.`)
  } else {
    const up = prev ? (workout.entries || []).filter(e => { const p = (prev.entries || []).find(x => x.id === e.id); return p && Number(e.topW) > Number(p.topW) }) : []
    parts.push(up.length ? `Stronger on ${up.slice(0, 2).map(e => nameOf(e.id)).join(' and ')}. Expect the weights to keep climbing next week.` : 'Strength comes from showing up like this. Eat well and sleep, and next week the weights move.')
  }
  if (days != null && days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'} to your ${testName}. Rest up.`)
  else if (days === 0) parts.push(`Your ${testName} is today. You are ready.`)
  return clean(parts.join(' '))
}
