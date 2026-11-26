import { describe, it, expect } from 'vitest'
import { TEST_ORDER, testDaySummary, testDayLine, testDayResults, retestDue, GRIP_SELF, restsBefore } from './test-day.js'
import { evaluate, fmtResult } from './standards.js'

describe('test day', () => {
  it('runs bridge, jump, push-ups, agility, beep, then asks about grip', () => {
    expect(TEST_ORDER).toEqual(['bridge', 'jump', 'pushups', 'illinois', 'beep', 'grip'])
    expect(restsBefore('grip')).toBe(false)
    expect(restsBefore('beep')).toBe(true)
  })
  it('grip without a dynamometer: yes passes, not yet does not, and it reads as a self-check', () => {
    expect(evaluate('grip', GRIP_SELF.yes).pass).toBe(true)
    expect(evaluate('grip', GRIP_SELF.no).pass).toBe(false)
    expect(fmtResult('grip', GRIP_SELF.yes)).toBe('Self-check: strong enough')
    expect(fmtResult('grip', { left: 41, right: 39 })).toBe('L 41 / R 39 kg')
  })
  it('is due again a week after the last result', () => {
    const r = [{ id: 'beep', v: '6.2', at: '2026-11-20' }, { id: 'jump', v: 31, at: '2026-11-12' }]
    expect(retestDue(r, '2026-11-26')).toMatchObject({ days: 6, due: false, next: '2026-11-27' })
    expect(retestDue(r, '2026-11-27').due).toBe(true)
    expect(retestDue([], '2026-11-27')).toMatchObject({ last: null, due: false })
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
