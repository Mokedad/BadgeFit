import { describe, it, expect } from 'vitest'
import { EMOTES, nextEmote, haydenOn } from './bot-emotes.js'

describe('Hayden moves', () => {
  it('never repeats the last move', () => {
    for (let last = 0; last < EMOTES.length; last++)
      for (const r of [0, 0.3, 0.6, 0.99]) {
        const i = nextEmote(last, () => r)
        expect(i).not.toBe(last); expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(EMOTES.length)
      }
  })
  it('is on until turned off', () => {
    expect(haydenOn({})).toBe(true)
    expect(haydenOn({ police: { haydenOff: true } })).toBe(false)
  })
})
