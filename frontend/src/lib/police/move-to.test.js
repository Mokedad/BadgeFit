// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { moveTo } from '../../components/PlanDays.jsx'

describe('dragging an exercise to a new place in the routine', () => {
  const L = ['a', 'b', 'c', 'd']
  it('lands in front of the one it was dropped on', () => {
    expect(moveTo(L, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moveTo(L, 0, 2)).toEqual(['b', 'a', 'c', 'd'])
    expect(moveTo(L, 1, 4)).toEqual(['a', 'c', 'd', 'b'])
    expect(moveTo(L, 9, 0)).toEqual(L)
  })
})
