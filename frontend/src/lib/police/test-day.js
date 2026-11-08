// Test day (BadgeFit, components/TestDay.jsx): all six standards in the order the PCT runs
// them, with the rest between, and the read-out at the end. Pure.
import { standardById, evaluate, DEFAULT_BEEP_TARGET } from './standards.js'

export const TEST_ORDER = ['grip', 'pushups', 'bridge', 'jump', 'illinois', 'beep']
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

/** What Jarvis says at the end. */
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
