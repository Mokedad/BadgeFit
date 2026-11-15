import { describe, it, expect } from 'vitest'
import { seasonOf, idleAct, idleGap, welcomeAct, IDLE_ACTS } from './bot-moods.js'

describe("Hayden's own life", () => {
  it('Christmas in December, with a Santa hat; New Year in January', () => {
    expect(seasonOf(new Date('2026-12-05')).name).toBe('Christmas')
    expect(seasonOf(new Date('2026-12-05')).hat).toBe('santa')
    expect(seasonOf(new Date('2027-01-02')).syms).toContain('🎆')
    expect(seasonOf(new Date('2026-11-15')).hat).toBeUndefined()
  })
  it('now and then the month, mostly his own moves', () => {
    expect(idleAct(() => 0.1, new Date('2026-12-05')).sym).toBe('🎄')
    expect(IDLE_ACTS).toContainEqual(idleAct(() => 0.9))
  })
  it('every 18 to 40 seconds', () => {
    expect(idleGap(() => 0)).toBe(18000)
    expect(idleGap(() => 0.999)).toBeLessThan(40000)
  })
  it('a welcome back, Santa in December', () => {
    expect(welcomeAct(new Date('2026-11-15')).sym).toBe('👋')
    expect(welcomeAct(new Date('2026-12-15')).sym).toBe('🎅')
  })
})
