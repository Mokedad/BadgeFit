import { describe, it, expect } from 'vitest'
import { weekPlan } from './programme.js'
import { runForDay, runMinutes } from './runs.js'

describe('run-walk weeks for someone new to running', () => {
  const runs = (week, opts) => weekPlan('beginner', week, 30, opts).days.filter(d => d.kind === 'run').map(d => runForDay(d)?.id)
  it('jogs and walks for the first four weeks, stepping up', () => {
    expect(runs(1, { runWalk: true })).toEqual(['run-walk-1', 'run-walk-1'])
    expect(runs(3, { runWalk: true })).toEqual(['run-walk-2', 'run-walk-2'])
    expect(runs(4, { runWalk: true })).toEqual(['run-walk-3', 'run-walk-3'])
  })
  it('then carries on with the plan as written, and never changes it for others', () => {
    expect(runs(5, { runWalk: true })).toEqual(runs(5, {}))
    expect(runs(1, {})).not.toContain('run-walk-1')
    expect(weekPlan('intermediate', 1, 30, { runWalk: true }).days.some(d => /Run-walk/.test(d.title))).toBe(false)
  })
  it('is a short session', () => {
    expect(runMinutes(runForDay(weekPlan('beginner', 1, 30, { runWalk: true }).days[1]))).toBeLessThan(35)
  })
  it('adds the weekly agility drill to the legs day', () => {
    expect(weekPlan('beginner', 2, 30).days[2].details.join(' ')).toMatch(/agility drill/)
  })
})
