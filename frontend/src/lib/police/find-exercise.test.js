import { describe, it, expect } from 'vitest'
import { findExercise } from './find-exercise.js'
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
