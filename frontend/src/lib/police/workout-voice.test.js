import { describe, it, expect } from 'vitest'
import { startLine, tickedSet, setDoneLine, restLine, finishLine } from './workout-voice.js'

const nameOf = id => ({ a: 'Bench press', b: 'Pull-ups' })[id] || id
const A = (sets1, sets2 = [{ done: false }]) => ({ start: 1, name: 'Chest day', entries: [
  { id: 'a', target: { repsMin: 4, reps: 6 }, sets: sets1 },
  { id: 'b', sets: sets2 },
] })

describe('Jarvis in the workout', () => {
  it('opens with the first exercise and its range', () => {
    expect(startLine(A([{}, {}, {}]), nameOf)).toBe('Right, Chest day. First up, Bench press, 3 sets of 4 to 6. Let us go.')
  })
  it('finds the set just ticked', () => {
    const before = A([{ w: 60, r: 6, done: false }, { w: 60, done: false }])
    const after = A([{ w: 60, r: 6, done: true }, { w: 60, done: false }])
    expect(tickedSet(before, after)).toEqual({ e: 0, s: 0 })
    expect(tickedSet(after, after)).toBeNull()
    expect(tickedSet(before, { ...after, start: 2 })).toBeNull()
  })
  it('calls the rep range, then names the next exercise', () => {
    const top = A([{ w: 60, r: 6, done: true }, { w: 60, done: false }])
    expect(setDoneLine(top, { e: 0, s: 0 }, { nameOf, seed: 0 })).toMatch(/62.5 kg/)
    const done = A([{ w: 60, r: 5, done: true }, { w: 60, r: 5, done: true }])
    expect(setDoneLine(done, { e: 0, s: 1 }, { nameOf })).toBe('That is Bench press done. Next up, Pull-ups.')
    const last = A([{ done: true }], [{ done: true }])
    expect(setDoneLine(last, { e: 1, s: 0 }, { nameOf })).toMatch(/last one/)
  })
  it('says which set is next after the rest, and sums up the session', () => {
    expect(restLine(A([{ done: true }, { done: false }]))).toBe('Rest is up. Set 2. Let us go.')
    const w = { start: 0, end: 45 * 60000, entries: [{ sets: [{}, {}, {}] }] }
    expect(finishLine(w, { days: 26 })).toBe('Session done. 3 sets in 45 minutes. Good work. 26 days to your PCT. Every session counts.')
  })
})
