import { describe, it, expect } from 'vitest'
import { todayBadgeFitRun } from './today-run.js'

const P = { level: 'intermediate', start: '2026-11-09', testDate: '2026-12-06', keys: { vo2: 'r-vo2', chest: 'r-chest' } }
describe('todayBadgeFitRun', () => {
  it('Tuesday is the VO2 run, Monday is a gym day', () => {
    expect(todayBadgeFitRun(P, '2026-11-10')).toMatchObject({ routineId: 'r-vo2', day: { key: 'vo2' } })
    expect(todayBadgeFitRun(P, '2026-11-10').run.cat).toBe('vo2')
    expect(todayBadgeFitRun(P, '2026-11-09')).toBeNull()
    expect(todayBadgeFitRun({}, '2026-11-10')).toBeNull()
  })
})
