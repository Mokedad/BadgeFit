import { describe, it, expect } from 'vitest'
import { installPlanIn } from './install-plan.js'
import { planLengthOf } from './programme.js'

const fresh = () => ({ routines: [], programmes: [], police: {} })

describe('installPlanIn: starting on the Academy path', () => {
  it('puts a recruit who has passed straight on Academy prep, ending on the Academy start', () => {
    const s = fresh()
    installPlanIn(s, { level: 'beginner', date: '2027-02-15', track: 'academy', today: '2026-11-26' })
    expect(s.police.track).toBe('academy')
    expect(s.police.testDate).toBe('2027-02-15')
    expect(planLengthOf(s.police)).toBeGreaterThanOrEqual(12)
    expect(s.routines.some(r => /Academy Circuit/.test(r.name))).toBe(true)
  })
  it('no gym: the three-day plan anywhere', () => {
    const s = fresh()
    installPlanIn(s, { level: 'intermediate', track: 'academy', noGym: true, today: '2026-11-26' })
    expect(s.police.academyStyle).toBe('nogym')
    expect(s.routines.some(r => /Academy Circuit/.test(r.name))).toBe(false)
  })
  it('the PCT path stays the PCT plan', () => {
    const s = fresh()
    installPlanIn(s, { level: 'beginner', date: '2026-12-20', today: '2026-11-26' })
    expect(s.police.track).toBeUndefined()
  })
})
