import { describe, it, expect } from 'vitest'
import { formCuesFor, cueLine } from './form-cues.js'

describe('form cues', () => {
  it('matches the movement from the name, specific first', () => {
    expect(formCuesFor('dumbbell incline bench press').cues[0]).toMatch(/30 degrees/)
    expect(formCuesFor('barbell bench press').mistake).toMatch(/Elbows flared/)
    expect(formCuesFor('barbell romanian deadlift').cues[0]).toMatch(/back flat/)
    expect(formCuesFor('push-up').mistake).toMatch(/hips sag/)
    expect(formCuesFor('cable pushdown').cues[0]).toMatch(/Elbows stay still/)
    expect(formCuesFor('banana')).toBeNull()
  })
  it('the first set gets the mistake to avoid, later sets take turns', () => {
    expect(cueLine('barbell back squat', 1)).toMatch(/Brace.*Knees caving/)
    expect(cueLine('barbell back squat', 2)).toMatch(/^Knees track/)
    expect(cueLine('barbell back squat', 3)).toMatch(/^Brace/)
    expect(cueLine('banana')).toBe('')
  })
})
