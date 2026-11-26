// Test day (BadgeFit, components/TestDay.jsx): the five standards a phone can run, in the order
// the owner set (bridge, jump, push-ups, agility, beep), with the rest between, then the grip as
// one question (no dynamometer: carrying 35 kg a hand, or squeezing an orange dry, is enough), and
// the read-out. Done again once a week (retestDue). Pure.
import { standardById, evaluate, DEFAULT_BEEP_TARGET } from './standards.js'

export const TEST_ORDER = ['bridge', 'jump', 'pushups', 'illinois', 'beep', 'grip']
/** Grip without a dynamometer: yes is the pass mark each hand, not yet is half of it; marked `self`. */
export const GRIP_SELF = { yes: { left: 30, right: 30, self: true }, no: { left: 15, right: 15, self: true } }
/** Whether the rest runs before this standard: not before a question. */
export const restsBefore = id => id !== 'grip'
export const RETEST_DAYS = 7

/** When Test day is due again: { last (ISO or null), days since, due, next (ISO) }. A week after the last result. */
export function retestDue(results, today) {
  const last = (results || []).map(r => String(r?.at || '').slice(0, 10)).filter(Boolean).sort().at(-1) || null
  if (!last || !today) return { last, days: null, due: false, next: null }
  const d = iso => Date.parse(iso + 'T12:00:00Z')
  const days = Math.round((d(today) - d(last)) / 86400000)
  return { last, days, due: days >= RETEST_DAYS, next: new Date(d(last) + RETEST_DAYS * 86400000).toISOString().slice(0, 10) }
}
export const REST_SEC = 300

/** Is this a value the standard can be scored on? */
export const scorable = (id, v, beepTarget = DEFAULT_BEEP_TARGET) => !!evaluate(id, v, beepTarget)

/**
 * The read-out: { rows: [{ std, v, ev }], passed, tested, total, weakest (the furthest from its
 * mark among those tested, or null) }.
 */
export function testDaySummary(values, beepTarget = DEFAULT_BEEP_TARGET) {
  const rows = TEST_ORDER.map(id => {
    const v = values?.[id]
    return { std: standardById(id), v: v ?? null, ev: v != null ? evaluate(id, v, beepTarget) : null }
  })
  const tested = rows.filter(r => r.ev)
  const fails = tested.filter(r => !r.ev.pass).sort((a, b) => a.ev.pct - b.ev.pct)
  return { rows, passed: tested.filter(r => r.ev.pass).length, tested: tested.length, total: rows.length, weakest: fails[0] || null }
}

/** What Hayden says at the end. */
export function testDayLine(sum, testName = 'PCT') {
  if (!sum.tested) return 'Nothing logged this time. Run it when you are ready.'
  if (sum.passed === sum.total) return `All six passed. You are ready for your ${testName}. Now we keep you sharp and fresh.`
  const w = sum.weakest
  return `${sum.passed} of ${sum.tested} passed.${w ? ` Your biggest gap is ${w.std.name.toLowerCase()}, at ${w.ev.pct} percent. That is where we win the next weeks.` : ''}`
}

/** The results to save, dated: only the standards that were scored. */
export function testDayResults(values, at, beepTarget = DEFAULT_BEEP_TARGET) {
  return TEST_ORDER.filter(id => values?.[id] != null && scorable(id, values[id], beepTarget)).map(id => ({ id, v: values[id], at }))
}
