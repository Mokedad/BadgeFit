import { describe, it, expect } from 'vitest'
import { briefing, setLine, resultLine, pick } from './jarvis.js'
import { weekPlan } from './programme.js'
import { readiness, standardById, evaluate } from './standards.js'

describe('jarvis', () => {
  it('greets by name and time of day and names the session', () => {
    const day = weekPlan('beginner', 3).days[0]
    const lines = briefing({ name: 'Sam', hour: 7, week: 3, day, ready: readiness([]), seed: 0 })
    expect(lines[0]).toBe('Good morning, Sam.')
    expect(lines.join(' ')).toContain('week 3')
    expect(lines.join(' ')).toContain('Chest, Shoulders & Abs')
    expect(lines.join(' ')).toMatch(/biggest gap is/)
  })
  it('celebrates passing everything', () => {
    const r = { passed: 6, total: 6, weakest: null }
    expect(briefing({ hour: 20, ready: r, seed: 1 }).join(' ')).toContain('passing all 6')
  })
  it('talks about the next set', () => {
    expect(setLine({ action: 'up', weight: 140 }, 'lb', 0)).toContain('140 lb')
    expect(setLine({ action: 'down', weight: 135 }, 'lb', 0)).toContain('135 lb')
    expect(setLine(null)).toBe('')
  })
  it('reads a result', () => {
    const std = standardById('pushups')
    expect(resultLine(std, evaluate('pushups', 30))).toMatch(/passed/)
    expect(resultLine(std, evaluate('pushups', 20))).toMatch(/80%/)
  })
  it('pick is stable for a seed', () => {
    expect(pick(['a', 'b', 'c'], 4)).toBe('b')
  })
})
