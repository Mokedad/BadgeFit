import { describe, it, expect } from 'vitest'
import { weekPlan, phaseOf, buildPoliceProgramme, applyPhaseRange, weekNumber, vo2For, routineFor } from './programme.js'
import { EXIDX } from '../exercises.js'

describe('weekPlan', () => {
  it('has seven days, Monday first, with the owner\'s split', () => {
    const w = weekPlan('intermediate', 1)
    expect(w.days.map(d => d.day)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(w.days.map(d => d.key)).toEqual(['chest', 'vo2', 'legs', 'easy', 'arms', 'tempo', 'walk'])
  })
  it('gives beginners a full rest day and no hard steady run', () => {
    const w = weekPlan('beginner', 2)
    expect(w.days.find(d => d.day === 0).kind).toBe('rest')
    expect(w.days.some(d => d.key === 'tempo')).toBe(false)
  })
  it('re-tests the standards at the end of each phase', () => {
    expect(weekPlan('beginner', 4).test).toBe(true)
    expect(weekPlan('beginner', 5).test).toBe(false)
    expect(weekPlan('beginner', 12).days.some(d => d.kind === 'test')).toBe(true)
  })
  it('moves through the rep ranges by phase', () => {
    expect(phaseOf('beginner', 1).range).toBe('12-15')
    expect(phaseOf('beginner', 9).range).toBe('6-8')
    expect(phaseOf('intermediate', 12).range).toBe('4-6')
  })
  it('clamps the week and rotates the VO2 format', () => {
    expect(weekPlan('beginner', 40).week).toBe(12)
    expect(vo2For(1).name).not.toBe(vo2For(2).name)
    expect(vo2For(5).name).toBe(vo2For(1).name)
  })
})

describe('buildPoliceProgramme', () => {
  it('builds real routines on catalogue exercises and a 12-week programme', () => {
    const { routines, programme, keys } = buildPoliceProgramme('intermediate', 1)
    expect(routines).toHaveLength(7)
    for (const r of routines) for (const e of r.ex) expect(EXIDX[e.id], e.id).toBeTruthy()
    expect(programme.weeks).toHaveLength(12)
    expect(programme.days[1]).toEqual([keys.chest])
    expect(programme.days[0]).toEqual([keys.walk])
  })
  it('starts the lifts in the phase-1 range under double progression', () => {
    const { routines } = buildPoliceProgramme('beginner', 1)
    const bench = routines.find(r => r.police === 'chest').ex.find(e => e.id === '0025')
    expect(bench).toMatchObject({ repsMin: 12, reps: 15, prog: 'double' })
    expect(routines.find(r => r.police === 'chest').ex.find(e => e.id === '0463').mode).toBe('time')
  })
  it('applyPhaseRange moves only the lifts', () => {
    const { routines } = buildPoliceProgramme('intermediate', 1)
    const next = applyPhaseRange(routines, 'intermediate', 9)
    const chest = next.find(r => r.police === 'chest')
    expect(chest.ex.find(e => e.id === '0025')).toMatchObject({ repsMin: 4, reps: 6 })
    expect(chest.ex.find(e => e.id === '0662')).toMatchObject({ repsMin: 12, reps: 20 })
    expect(next.find(r => r.police === 'vo2')).toEqual(routines.find(r => r.police === 'vo2'))
  })
  it('applyPhaseRange finds untagged routines by their ids', () => {
    const { routines, keys } = buildPoliceProgramme('beginner', 1)
    const bare = routines.map(({ police, ...r }) => r)
    const legs = applyPhaseRange(bare, 'beginner', 5, keys).find(r => r.id === keys.legs)
    expect(legs.ex.find(e => e.id === '0043')).toMatchObject({ repsMin: 10, reps: 12 })
  })
  it('cardio routines carry minutes and speed', () => {
    expect(routineFor('walk', 'beginner', '12-15').ex[0]).toMatchObject({ mode: 'cardio', min: 30, incline: 12 })
  })
})

describe('weekNumber', () => {
  it('counts weeks from the start date', () => {
    expect(weekNumber('2026-01-05', '2026-01-05')).toBe(1)
    expect(weekNumber('2026-01-05', '2026-01-12')).toBe(2)
    expect(weekNumber('2026-01-05', '2026-12-01')).toBe(12)
    expect(weekNumber('2026-01-05', '2026-01-01')).toBeNull()
  })
})
