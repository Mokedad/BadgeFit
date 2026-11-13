import { describe, it, expect } from 'vitest'
import { countsForPlan, planLogged, reopenPatch } from './reopen.js'

describe('untick a day to train it again', () => {
  const w1 = { d: '2026-11-13', start: 1000, end: 2000 }
  it('a workout before the untick no longer counts; one after does', () => {
    const P = { reopened: { '2026-11-13': 5000 } }
    expect(countsForPlan(w1, P)).toBe(false)
    expect(countsForPlan({ d: '2026-11-13', start: 6000, end: 9000 }, P)).toBe(true)
    expect(countsForPlan(w1, {})).toBe(true)
    expect(planLogged({ workouts: [w1, { d: '2026-11-12', end: 1 }], police: P }, '2026-11-13')).toEqual([])
  })
  it('keeps two weeks of reopened days', () => {
    const p = reopenPatch({ reopened: { '2026-10-01': 1, '2026-11-10': 2 } }, '2026-11-13', 99)
    expect(p.reopened).toEqual({ '2026-11-10': 2, '2026-11-13': 99 })
  })
})
