import { describe, it, expect } from 'vitest'
import { itemsFor, gymTypesFor, gymRoutines, ensureFullBody } from './train-types.js'

const lift = id => ({ id, sets: 3, reps: 10 })
const S = () => ({
  week: { 1: ['a'], 3: ['b'], 5: ['c'], 2: ['run'] },
  routines: [
    { id: 'old', name: 'Chest, Shoulders & Abs', ex: [lift('x')] },
    { id: 'a', name: 'Chest, Shoulders & Abs', ex: [lift('1'), lift('2'), lift('3')] },
    { id: 'b', name: 'Squats & Push Power', ex: [lift('4'), lift('5')] },
    { id: 'c', name: 'Arms, Back, Shoulders & Abs', ex: [lift('6'), lift('7')] },
    { id: 'run', name: 'Easy Run', ex: [{ id: '0685', mode: 'cardio' }] },
  ],
  police: {},
})

describe('train types', () => {
  it('lists gym routines once per name, the plan copy, never a run', () => {
    expect(gymRoutines(S(), '2026-11-16').map(r => r.id)).toEqual(['a', 'b', 'c'])
  })
  it('puts each routine under one kind', () => {
    expect(itemsFor(S(), 'chest').map(i => i.routine.id)).toEqual(['a'])
    expect(itemsFor(S(), 'legs').map(i => i.routine.id)).toEqual(['b'])
    expect(itemsFor(S(), 'arms').map(i => i.routine.id)).toEqual(['c'])
  })
  it('offers to make a full body session when there is none, and makes it once', () => {
    expect(itemsFor(S(), 'full')).toEqual([{ kind: 'make-full' }])
    expect(gymTypesFor(S()).map(t => t.id)).toEqual(['chest', 'legs', 'arms', 'full'])
    const s = S()
    const id = ensureFullBody(s)
    expect(s.routines.at(-1).ex.map(e => e.id)).toEqual(['1', '2', '4', '5', '6', '7'])
    expect(ensureFullBody(s)).toBe(id)
    expect(itemsFor(s, 'full').map(i => i.routine.id)).toEqual([id])
  })
  it('lists the runs of a kind', () => {
    expect(itemsFor(S(), 'easy').every(i => i.run.cat === 'base')).toBe(true)
    expect(itemsFor(S(), 'walk').length).toBeGreaterThan(2)
  })
})
