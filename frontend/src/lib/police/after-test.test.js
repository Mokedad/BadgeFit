import { describe, it, expect } from 'vitest'
import { needsAfterTest, afterPatch } from './after-test.js'

describe('after the test', () => {
  const P = { start: '2026-09-01', testDate: '2026-12-06', testName: 'PCT' }
  it('asks once the date has gone by, and only once for that date', () => {
    expect(needsAfterTest(P, '2026-12-06')).toBe(false)
    expect(needsAfterTest(P, '2026-12-07')).toBe(true)
    expect(needsAfterTest({ ...P, afterAsked: '2026-12-06' }, '2026-12-07')).toBe(false)
    expect(needsAfterTest({ start: '2026-09-01' }, '2026-12-07')).toBe(false)
  })
  it('passed: the Academy is next, a fresh plan, no old countdown', () => {
    const p = afterPatch('passed', P, '2026-12-07')
    expect([p.testName, p.testDate, p.afterTest, p.passedOn, p.afterAsked]).toEqual(['Academy', undefined, 'passed', '2026-12-06', '2026-12-06'])
    expect(p.start >= '2026-12-07').toBe(true)
  })
  it('re-test keeps the test name; own training drops it', () => {
    expect('testName' in afterPatch('retest', P, '2026-12-07')).toBe(false)
    expect(afterPatch('own', P, '2026-12-07').testName).toBe(undefined)
  })
})
