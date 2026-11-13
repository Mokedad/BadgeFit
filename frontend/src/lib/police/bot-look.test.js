import { describe, it, expect } from 'vitest'
import { lineColour, earnedGear, GUEST_COLOUR, LINE_COLOURS } from './bot-look.js'

describe('a member\'s Hayden', () => {
  it('each member gets a line colour of their own, the same every time; a guest is grey', () => {
    expect(lineColour(null)).toBe(GUEST_COLOUR)
    expect(LINE_COLOURS).toContain(lineColour('kIbwI2nIcHB3SH4l'))
    expect(lineColour('kIbwI2nIcHB3SH4l')).toBe(lineColour('kIbwI2nIcHB3SH4l'))
    const seen = new Set(['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7'].map(lineColour))
    expect(seen.size).toBeGreaterThan(2)
  })
  it('a new member and a guest start with no gear', () => {
    expect(earnedGear({ police: {}, workouts: [] })).toEqual([])
    expect(earnedGear({ police: { pctPassed: true }, workouts: [] }, { guest: true })).toEqual([])
  })
  it('gear is earned: four weeks trained, a standard passed, the PCT, the academy', () => {
    const workouts = ['2026-10-05', '2026-10-13', '2026-10-21', '2026-10-28'].map(d => ({ d }))
    const S = { police: { results: [{ id: 'pushups', v: 30, at: '2026-11-01' }], pctPassed: true, academy: true }, workouts }
    expect(earnedGear(S)).toEqual(['headband', 'whistle', 'badge', 'stripes', 'cap', 'medal'])
    expect(earnedGear({ police: {}, workouts: workouts.slice(0, 3) })).toEqual([])
  })
})
