import { describe, it, expect } from 'vitest'
import { beepSchedule, positionAt, scoreAt, timeTo } from './beep-run.js'
import { BEEP_LEVELS } from './standards.js'

const S = beepSchedule()

describe('beep test timing', () => {
  it('has one beep per shuttle, the last of a level marked', () => {
    expect(S.length).toBe(BEEP_LEVELS.reduce((n, r) => n + r.shuttles, 0))
    expect(S[0]).toMatchObject({ level: 1, shuttle: 1, newLevel: false })
    expect(S[6]).toMatchObject({ level: 1, shuttle: 7, newLevel: true })
    expect(S[0].t).toBeCloseTo(BEEP_LEVELS[0].secPerShuttle, 2)
  })
  it('knows where the runner is and scores the last shuttle done', () => {
    expect(positionAt(S, 0)).toMatchObject({ done: 0, level: 1, shuttle: 1 })
    expect(scoreAt(S, 1)).toBe('')
    expect(scoreAt(S, S[6].t + 0.1)).toBe('1.7')
    expect(positionAt(S, S[6].t + 0.1)).toMatchObject({ level: 2, shuttle: 1 })
    expect(positionAt(S, 1e6).finished).toBe(true)
  })
  it('the pass mark falls about 7 minutes in', () => {
    const t = timeTo(S, '7.1')
    expect(t).toBeGreaterThan(6 * 60)
    expect(t).toBeLessThan(8 * 60)
    expect(scoreAt(S, t + 0.01)).toBe('7.1')
    expect(timeTo(S, 'x')).toBeNull()
  })
})
