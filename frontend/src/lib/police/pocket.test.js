import { describe, it, expect } from 'vitest'
import { pocketCues, pocketSay, pocketHanded, pocketBeats } from './pocket.js'

const say = s => s.label
const run = { segments: [
  { kind: 'warm', label: 'Walk', sec: 300 },
  { kind: 'work', label: 'Run', sec: 60 },
  { kind: 'rest', label: 'Walk easy', sec: 90 },
  { kind: 'cool', label: 'Cool down', sec: 120 },
] }

describe('pocketCues: the steps the phone says by itself', () => {
  it('times every coming step from where the run is, and ends with the finish', () => {
    expect(pocketCues(run, 0, 100, say)).toEqual([
      { in: 200, text: 'Run' }, { in: 260, text: 'Walk easy' }, { in: 350, text: 'Cool down' },
      { in: 470, text: 'That is your time. Keep going if you like, and tap Finish when you are done.' },
    ])
  })
  it('from the last step, only the finish', () => {
    expect(pocketCues(run, 3, 20, say)).toEqual([{ in: 100, text: 'That is your time. Keep going if you like, and tap Finish when you are done.' }])
  })
  it('stops at a step measured by distance, and says nothing from inside one', () => {
    const r = { segments: [{ kind: 'warm', label: 'Walk', sec: 60 }, { kind: 'work', label: 'Run 2 km', dist: 2000 }, { kind: 'cool', label: 'Walk', sec: 60 }] }
    expect(pocketCues(r, 0, 0, say)).toEqual([{ in: 60, text: 'Run 2 km' }])
    expect(pocketCues(r, 1, 30, say)).toEqual([])
  })
  it('caps the number of lines', () => {
    const long = { segments: Array.from({ length: 100 }, (_, i) => ({ kind: 'work', label: 'S' + i, sec: 10 })) }
    expect(pocketCues(long, 0, 0, say, 5)).toHaveLength(5)
  })
  it('does nothing outside the phone app', async () => {
    expect(await pocketSay('hello')).toBe(false)
    expect(pocketHanded()).toBe(false)
  })
})

describe('pocketBeats: the pace tick the phone plays by itself', () => {
  const gap = s => (s.kind === 'work' ? 0.36 : s.kind === 'cool' ? 0 : 0.5)
  it('the beat now, then each coming step at its time', () => {
    expect(pocketBeats(run, 0, 100, gap)).toEqual([
      { in: 0, gap: 0.5 }, { in: 200, gap: 0.36 }, { in: 260, gap: 0.5 }, { in: 350, gap: 0 },
    ])
  })
  it('an open run keeps one beat', () => {
    expect(pocketBeats({ segments: [{ kind: 'work', label: 'Run', sec: null }] }, 0, 500, gap)).toEqual([{ in: 0, gap: 0.36 }])
  })
  it('a missing step or beat is quiet, not an error', () => {
    expect(pocketBeats(run, 9, 0, gap)).toEqual([])
    expect(pocketBeats(run, 3, 0, () => null)).toEqual([{ in: 0, gap: 0 }])
  })
})
