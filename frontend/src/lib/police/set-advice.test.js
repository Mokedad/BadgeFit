import { describe, it, expect } from 'vitest'
import { nextSetAdvice, sessionAdvice, rangeById } from './set-advice.js'

const r46 = rangeById('4-6')

describe('nextSetAdvice: the 3 [4-5-6] 8 rule', () => {
  it('3 reps in a 4-6 range: move down', () => {
    expect(nextSetAdvice({ reps: 3, weight: 140, range: r46, unit: 'lb' })).toEqual({ action: 'down', delta: -5, weight: 135 })
  })
  it('4 or 5 reps: stay', () => {
    expect(nextSetAdvice({ reps: 4, weight: 140, range: r46, unit: 'lb' }).action).toBe('stay')
    expect(nextSetAdvice({ reps: 5, weight: 140, range: r46, unit: 'lb' }).weight).toBe(140)
  })
  it('6 or 8 reps: move up 5 lb', () => {
    expect(nextSetAdvice({ reps: 6, weight: 135, range: r46, unit: 'lb' })).toEqual({ action: 'up', delta: 5, weight: 140 })
    expect(nextSetAdvice({ reps: 8, weight: 135, range: r46, unit: 'lb' }).weight).toBe(140)
  })
  it('steps 2.5 kg in kg', () => {
    expect(nextSetAdvice({ reps: 6, weight: 60, range: r46, unit: 'kg' }).weight).toBe(62.5)
  })
  it('never goes below zero and rejects bad input', () => {
    expect(nextSetAdvice({ reps: 1, weight: 2, range: r46, unit: 'kg' }).weight).toBe(0)
    expect(nextSetAdvice({ reps: 'x', weight: 2, range: r46 })).toBeNull()
    expect(nextSetAdvice({ reps: 5, weight: 2 })).toBeNull()
  })
})

describe('sessionAdvice', () => {
  it('reads the week 1 bench press: 135×8, 140×5, 140×4 → start week 2 at 140', () => {
    const s = sessionAdvice([{ reps: 8, weight: 135 }, { reps: 5, weight: 140 }, { reps: 4, weight: 140 }], r46, 'lb')
    expect(s.sets.map(x => x.advice.action)).toEqual(['up', 'stay', 'stay'])
    expect(s.nextStart).toBe(140)
  })
})
