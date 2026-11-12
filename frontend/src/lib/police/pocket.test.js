import { describe, it, expect } from 'vitest'
import { pocketCues, pocketSay, pocketHanded } from './pocket.js'

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
      { in: 470, text: 'That is the session done. Great work.' },
    ])
  })
  it('from the last step, only the finish', () => {
    expect(pocketCues(run, 3, 20, say)).toEqual([{ in: 100, text: 'That is the session done. Great work.' }])
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
