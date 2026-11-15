import { describe, it, expect } from 'vitest'
import { planSessions, otherRoutines, shortName } from './day-pick.js'

const r = (id, name) => ({ id, name, ex: [] })
const S = {
  week: { 1: 'a', 2: 'v', 3: 'b', 5: ['c'], 0: 'a' },
  routines: [r('old1', 'Full Body Gym A'), r('a', 'Chest, Shoulders & Abs'), r('v', 'VO2 Max Intervals'), r('b', 'Squats & Push Power'),
    r('c', 'Arms, Back, Shoulders & Abs'), r('old2', 'Full Body Gym A'), r('old3', 'Chest, Shoulders & Abs'), r('run1', 'Easy run, 30 min')],
  police: { runRoutines: { run1: 'easy-30' } },
}

describe('day pick', () => {
  it('lists the weekly plan once each, Monday first', () => {
    expect(planSessions(S).map(x => x.id)).toEqual(['a', 'v', 'b', 'c'])
  })

  it('folds older routines once per name, never a plan name or a run', () => {
    expect(otherRoutines(S).map(x => x.id)).toEqual(['old2'])
  })

  it('is empty without a plan', () => {
    expect(planSessions({})).toEqual([])
    expect(otherRoutines({})).toEqual([])
  })

  it('shortens a long session name for a round button', () => {
    expect(shortName('Chest, Shoulders & Abs')).toBe('Chest')
    expect(shortName('Squats & Push Power')).toBe('Squats')
    expect(shortName('VO2 Max Intervals')).toBe('VO2 Max Intervals')
    expect(shortName('Treadmill Recovery Walk')).toBe('Treadmill Recovery Walk')
  })
})
