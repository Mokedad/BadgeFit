import { describe, it, expect } from 'vitest'
import { startLine, tickedSet, setDoneLine, restLine, finishLine } from './workout-voice.js'

const nameOf = id => ({ a: 'Bench press', b: 'Pull-ups' })[id] || id
const A = (sets1, sets2 = [{ done: false }]) => ({ start: 1, name: 'Chest day', entries: [
  { id: 'a', target: { repsMin: 4, reps: 6 }, sets: sets1 },
  { id: 'b', sets: sets2 },
] })

describe('Hayden in the workout', () => {
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

import { restMotivation, plateWords, upNext, nextSetLine, volumeOf, previousOf, wrapUpLine } from './workout-voice.js'
describe('rest coaching and the wrap-up', () => {
  it('names the plates', () => {
    expect(plateWords({ kind: 'pairs', plates: [20, 10], missing: 0 })).toBe('That is a 20 and a 10 each side.')
    expect(plateWords({ kind: 'pairs', plates: [20, 10, 2.5], missing: 0 })).toBe('That is a 20, a 10 and a 2.5 each side.')
    expect(plateWords({ barOnly: true })).toBe('Just the bar.')
    expect(plateWords({ kind: 'pairs', plates: [20], missing: 1 })).toBe('')
    expect(restMotivation(1)).toBeTruthy()
  })
  it('calls the next set with its weight, plates and a cue', () => {
    const A = { cur: 0, entries: [{ id: 'a', target: { repsMin: 4, reps: 6 }, sets: [{ w: 80, done: true }, { w: 80, done: false }] }] }
    expect(upNext(A)).toMatchObject({ idx: 0, setIdx: 1, setNo: 2 })
    expect(nextSetLine(A, { nameOf: () => 'Bench press', plates: 'That is a 20 and a 10 each side.', cue: 'Elbows tucked.' }))
      .toBe('20 seconds. Set 2, Bench press, 80 kg for 4 to 6. That is a 20 and a 10 each side. Elbows tucked.')
  })
  it('wraps up against last time, for the goal', () => {
    const prev = { start: 1, routineId: 'r', entries: [{ id: 'a', topW: 60, sets: [{ w: 60, r: 10 }, { w: 60, r: 10 }] }] }
    const now = { start: 2, end: 2 + 50 * 60000, routineId: 'r', prs: [{}], entries: [{ id: 'a', topW: 62.5, sets: [{ w: 62.5, r: 10 }, { w: 62.5, r: 10 }] }] }
    expect(volumeOf(now)).toBe(1250)
    expect(previousOf(now, [prev, now])).toBe(prev)
    const lose = wrapUpLine(now, { workouts: [prev, now], goal: 'lose', weightKg: 114, days: 27 })
    expect(lose).toMatch(/^Solid session\. 2 sets in 50 minutes\. Total volume up 4\.2 percent on last time\. And you set a PR\. That burned roughly 480 calories\./)
    expect(lose).toMatch(/27 days to your PCT/)
    expect(wrapUpLine(now, { workouts: [prev, now], goal: 'strength', nameOf: () => 'Bench press' })).toMatch(/Stronger on Bench press/)
  })
})

import { rangeOf } from './workout-voice.js'
describe('rangeOf', () => {
  it('a plain 4 x 8 still trains by the rep-range rule', () => {
    expect(rangeOf({ target: { reps: 8 } })).toEqual({ min: 6, max: 8 })
    expect(rangeOf({ target: { repsMin: 10, reps: 12 } })).toEqual({ min: 10, max: 12 })
    expect(rangeOf({ sets: [{ r: 10, w: 40 }] })).toEqual({ min: 8, max: 10 })
    expect(rangeOf({ target: { reps: 3 } })).toBeNull()
  })
  it('the next set moves after every set', () => {
    const A = { start: 1, entries: [{ id: 'a', target: { reps: 8 }, sets: [{ w: 70, r: 8, done: true }, { w: 70, done: false }, { w: 70, done: false }] }] }
    expect(setDoneLine(A, { e: 0, s: 0 }, { nameOf: () => 'Bench', seed: 0 })).toMatch(/72.5 kg/)
  })
})
