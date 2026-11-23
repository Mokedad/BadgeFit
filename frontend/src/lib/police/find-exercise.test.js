import { describe, it, expect } from 'vitest'
import { findExercise, machineMatches } from './find-exercise.js'
import { EXIDX } from '../exercises.js'

const name = q => EXIDX[findExercise(q)]?.n
describe('an exercise as a trainer writes it', () => {
  it('finds the plain gym version', () => {
    expect(name('Bench press')).toBe('barbell bench press')
    expect(name('Squat')).toBe('barbell full squat')
    expect(name('Plank')).toBe('front plank')
    expect(name('Lat pulldown')).toBe('cable wide grip lat pulldown')
    expect(name('Pull ups')).toBe('pull-up')
    expect(name('Push-ups')).toBe('push-up')
    expect(name('DB incline press')).toBe('dumbbell incline bench press')
    expect(name('Romanian deadlift')).toBe('barbell romanian deadlift')
    expect(name('Lateral raise')).toBe('dumbbell lateral raise')
    expect(name('Burpees')).toBe('burpee')
  })
  it('a band only when one is named', () => {
    expect(name('Tricep pushdown')).not.toMatch(/band/)
    expect(name('Band face pull')).toMatch(/band/)
  })
  it('nothing for nothing', () => {
    expect(findExercise('')).toBe(null)
    expect(findExercise('xq')).toBe(null)
  })
})

describe('a machine photo named by Hayden', () => {
  it('turns the names into library exercises, the best match first, no repeats', () => {
    const ids = machineMatches(['Seated cable row', 'Lat pulldown'])
    expect(ids.length).toBeGreaterThanOrEqual(2)
    expect(ids.length).toBeLessThanOrEqual(6)
    expect(new Set(ids).size).toBe(ids.length)
    expect(EXIDX[ids[0]].n).toMatch(/row/i)
    expect(ids.some(id => /pulldown/i.test(EXIDX[id].n))).toBe(true)
  })
  it('gives nothing back for nothing', () => {
    expect(machineMatches([])).toEqual([])
    expect(machineMatches(null)).toEqual([])
  })
})
