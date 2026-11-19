// @vitest-environment happy-dom
// A workout under way can be cancelled from Home (BadgeFit): before, Home showed only Resume, so a
// tester who left a workout could not remove it. Pausing also stops the rest countdown.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { pauseWorkout, cancelActiveWorkout } from './workout-controls.jsx'

beforeEach(() => {
  useStore.getState().update(s => { s.active = { id: 'a1', name: 'Arms', start: Date.now() - 60000, entries: [] }; s.dayPlan = {} })
})

describe('a workout under way', () => {
  it('pausing stops the rest countdown', () => {
    const stopRest = vi.spyOn(useUI.getState(), 'stopRest')
    pauseWorkout()
    expect(useStore.getState().S.active.pausedAt).toBeGreaterThan(0)
    expect(stopRest).toHaveBeenCalled()
  })
  it('cancelling from outside the workout screen ends it without saving', () => {
    const before = (useStore.getState().S.workouts || []).length
    const stopRest = vi.spyOn(useUI.getState(), 'stopRest'), stopWork = vi.spyOn(useUI.getState(), 'stopWork')
    cancelActiveWorkout()
    expect(useStore.getState().S.active).toBeNull()
    expect((useStore.getState().S.workouts || []).length).toBe(before)
    expect(stopRest).toHaveBeenCalled()
    expect(stopWork).toHaveBeenCalled()
  })
})
