import { describe, it, expect } from 'vitest'
import { dragSteps, DRAG_PX } from './lean-workout.js'

describe('dragSteps', () => {
  it('up is more, down is less', () => {
    expect(dragSteps(-DRAG_PX)).toBe(1)
    expect(dragSteps(-DRAG_PX * 3 - 2)).toBe(3)
    expect(dragSteps(DRAG_PX * 2)).toBe(-2)
  })
  it('a small wobble changes nothing', () => {
    expect(dragSteps(-5)).toBe(0)
    expect(dragSteps(10)).toBe(0)
    expect(dragSteps(undefined)).toBe(0)
  })
})
