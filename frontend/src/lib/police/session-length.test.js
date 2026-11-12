import { describe, it, expect } from 'vitest'
import { trimEntries, sessionMinutes, lengthOf } from './session-length.js'

const e = (id, n = 4) => ({ id, sets: Array.from({ length: n }, () => ({ reps: 10 })) })
const chest = [e('0025'), e('0314', 3), e('0426', 3), e('0334', 2), e('1236', 3), e('0662', 2), e('0472', 3), e('0463', 3)]

describe('session length', () => {
  it('quick: the two main lifts and one test-practice move, three sets at most', () => {
    const out = trimEntries(chest, 'quick')
    expect(out.map(x => x.id)).toEqual(['0025', '0314', '0662'])
    expect(out.map(x => x.sets.length)).toEqual([3, 3, 2])
  })
  it('standard: five exercises in the plan\'s order', () => {
    expect(trimEntries(chest, 'standard').map(x => x.id)).toEqual(['0025', '0314', '0426', '0334', '0662'])
  })
  it('full: untouched', () => {
    expect(trimEntries(chest, 'full')).toBe(chest)
    expect(lengthOf('nonsense').id).toBe('full')
  })
  it('a short session only has its sets capped, and a run in it stays whole', () => {
    const run = { id: '0685', sets: [{ mode: 'cardio', min: 25 }] }
    const out = trimEntries([e('0025'), run], 'quick')
    expect(out.map(x => x.sets.length)).toEqual([3, 1])
    expect(trimEntries([...chest, run], 'quick').at(-1)).toBe(run)
  })
  it('estimates the time in five-minute steps', () => {
    expect(sessionMinutes(trimEntries(chest, 'quick'))).toBe(20)
    expect(sessionMinutes(chest)).toBeGreaterThan(55)
    expect(sessionMinutes([{ id: '0685', sets: [{ mode: 'cardio', min: 25 }] }])).toBe(25)
  })
})
