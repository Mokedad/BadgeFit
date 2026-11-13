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

import { liveAdvice } from './set-advice.js'
describe('liveAdvice: the rule inside a workout', () => {
  const r46 = { min: 4, max: 6 }
  it('first time: no set done yet, points at the first work set', () => {
    expect(liveAdvice([{ w: 20, r: 10, done: true, warmup: true }, { w: 0, r: 0 }], r46)).toEqual({ firstTime: true, range: r46, nextIdx: 1 })
  })
  it('after a set: advice for the next one', () => {
    const a = liveAdvice([{ w: 60, r: 8, done: true }, { w: 60, r: 6 }, { w: 60, r: 6 }], r46, 'kg')
    expect(a).toMatchObject({ lastIdx: 0, nextIdx: 1, advice: { action: 'up', weight: 62.5 } })
  })
  it('reads the last done set, skips warm-ups, none left at the end', () => {
    const a = liveAdvice([{ w: 40, r: 5, done: true, warmup: true }, { w: 60, r: 5, done: true }, { w: 60, r: 3, done: true }], r46)
    expect(a).toMatchObject({ lastIdx: 2, nextIdx: null, advice: { action: 'down', weight: 57.5 } })
  })
  it('nothing without a range or a load', () => {
    expect(liveAdvice([{ w: 60, r: 5, done: true }], null)).toBeNull()
    expect(liveAdvice([{ w: 0, r: 12, done: true }], { min: 8, max: 12 })).toBeNull()
  })
})

import { nextSetAdvice as nsa } from './set-advice.js'
describe('far too light', () => {
  it('jumps at least 10 kg (20 lb) when the reps go 10 or more past the top', () => {
    expect(nsa({ reps: 25, weight: 20, range: { min: 12, max: 15 } })).toEqual({ action: 'up', delta: 10, weight: 30 })
    expect(nsa({ reps: 24, weight: 20, range: { min: 12, max: 15 } }).delta).toBe(2.5)
    expect(nsa({ reps: 18, weight: 45, range: { min: 6, max: 8 }, unit: 'lb' }).delta).toBe(20)
  })
})
