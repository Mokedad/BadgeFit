import { describe, it, expect } from 'vitest'
import { TEST_ORDER, testDaySummary, testDayLine, testDayResults } from './test-day.js'

describe('test day', () => {
  it('runs the six standards in the PCT order', () => {
    expect(TEST_ORDER).toEqual(['grip', 'pushups', 'bridge', 'jump', 'illinois', 'beep'])
  })
  it('reads out passes and the biggest gap', () => {
    const v = { grip: { left: 40, right: 42 }, pushups: 20, bridge: 95, beep: '6.2' }
    const s = testDaySummary(v)
    expect(s).toMatchObject({ tested: 4, passed: 2, total: 6 })
    expect(['pushups', 'beep']).toContain(s.weakest.std.id)
    expect(testDayLine(s)).toMatch(/^2 of 4 passed\. Your biggest gap is/)
    expect(testDayLine(testDaySummary({}))).toMatch(/Nothing logged/)
  })
  it('saves only what was scored', () => {
    const r = testDayResults({ pushups: 30, beep: 'nope', jump: null }, '2026-11-09')
    expect(r).toEqual([{ id: 'pushups', v: 30, at: '2026-11-09' }])
  })
})
