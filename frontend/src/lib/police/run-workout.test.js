import { describe, it, expect } from 'vitest'
import { runWorkout, runCredits, RUN_EX } from './run-workout.js'

describe('runWorkout', () => {
  it('turns a logged run into a completed cardio workout for that day', () => {
    const w = runWorkout({ run: { name: 'Easy run, 30 min' }, entry: { id: 'abc', at: '2026-11-10', min: 12, planned: 30, km: 2.1 }, routineIds: ['r1'], now: 1_000_000_000 })
    expect(w.id).toBe('run-abc')
    expect(w.d).toBe('2026-11-10')
    expect(w.routineIds).toEqual(['r1'])
    expect(w.routineId).toBe('r1')
    expect(w.runLogId).toBe('abc')
    expect(w.end - w.start).toBe(12 * 60000)
    expect(w.entries[0]).toMatchObject({ id: RUN_EX, sets: [{ mode: 'cardio', min: 12, km: 2.1, done: true }], target: { mode: 'cardio', min: 30 } })
  })
  it('still saves when the run was not on the plan', () => {
    const w = runWorkout({ run: null, entry: { id: 'x', at: '2026-11-10', min: 5 } })
    expect(w.routineIds).toEqual([])
    expect(w.routineId).toBeNull()
    expect(w.name).toBe('Run')
  })
})

describe('runCredits', () => {
  it('credits the routine whose run this was', () => {
    const P = { runRoutines: { a: 'easy-30', b: 'vo2-4x4' } }
    expect(runCredits(P, ['a', 'b', 'gym'], 'vo2-4x4', '2026-11-10')).toEqual(['b'])
  })
  it("else the day's run routines, never a gym one", () => {
    const P = { runRoutines: { a: 'easy-30' } }
    expect(runCredits(P, ['a', 'gym'], 'tempo-20', '2026-11-10')).toEqual(['a'])
    expect(runCredits(P, ['gym'], 'tempo-20', '2026-11-10')).toEqual([])
  })
})
