import { describe, it, expect } from 'vitest'
import { fitRun, runById, runMinutes, segSeconds } from './runs.js'
import { runForRoutine } from './run-routines.js'

describe('a run fitted to the time you chose', () => {
  it('stretches or shortens a steady run, and its name follows', () => {
    const r = fitRun(runById('easy-30'), 45)
    expect(runMinutes(r)).toBe(45)
    expect(r.name).toBe('Easy run, 45 min')
    expect(runMinutes(fitRun(runById('easy-30'), 20))).toBe(20)
  })
  it('gives a run in rounds as many rounds as fit, warm-up and cool-down kept', () => {
    const base = runById('vo2-4x4') // 10 + 4 × (4 + 3) − 3 + 5 = 40 min
    const short = fitRun(base, 26)
    const rounds = short.segments.filter(s => s.kind === 'work')
    expect(rounds.length).toBe(2)
    expect(rounds.every(s => s.of === 2)).toBe(true)
    expect(short.segments[0].kind).toBe('warm')
    expect(short.segments.at(-1).kind).toBe('cool')
    expect(short.segments.at(-2).kind).toBe('work') // no rest after the last round
    const long = fitRun(base, 55)
    expect(long.segments.filter(s => s.kind === 'work').length).toBeGreaterThan(4)
  })
  it('open: one block with no set time, the clock counts up', () => {
    const r = fitRun(runById('easy-30'), 'open')
    expect(r.open).toBe(true)
    expect(r.segments).toHaveLength(1)
    expect(r.segments[0].sec).toBeUndefined()
    expect(segSeconds(r.segments[0])).toBe(0)
    expect(runMinutes(r)).toBe(0)
  })
  it('hill repeats are short: 10 to 15 minutes', () => {
    const m = runMinutes(runById('vo2-hills'))
    expect(m).toBeGreaterThanOrEqual(10)
    expect(m).toBeLessThanOrEqual(15)
  })
  it('leaves a run alone with no choice', () => {
    const base = runById('easy-45')
    expect(fitRun(base, null)).toBe(base)
  })
  it("the plan's run for a day takes the time chosen for that day only", () => {
    const P = { runRoutines: { r1: 'easy-30' }, runLen: { '2026-11-24': { id: 'easy-30', v: 40 } } }
    expect(runMinutes(runForRoutine(P, 'r1', '2026-11-24'))).toBe(40)
    expect(runMinutes(runForRoutine(P, 'r1', '2026-11-25'))).toBe(30)
    expect(runForRoutine({ ...P, runLen: { '2026-11-24': { id: 'other', v: 40 } } }, 'r1', '2026-11-24').name).toBe('Easy run, 30 min')
  })
})
