import { describe, it, expect } from 'vitest'
import { chirps, MOODS, beepVolume } from './bot-voice.js'

describe("Hayden's beeps", () => {
  it('every mood makes a short run of syllables in the hearing range', () => {
    for (const m of MOODS) {
      const c = chirps(m, () => 0.5)
      expect(c.length).toBeGreaterThan(0); expect(c.length).toBeLessThanOrEqual(6)
      for (const x of c) { expect(x.f0).toBeGreaterThan(200); expect(x.f1).toBeGreaterThan(60); expect(x.dur).toBeLessThan(0.6) }
    }
  })
  it('a question goes up at the end; a whoa falls', () => {
    const q = chirps('curious', () => 0.5); expect(q.at(-1).f1).toBeGreaterThan(q.at(-1).f0)
    const w = chirps('whoa', () => 0.5); expect(w[0].f1).toBeLessThan(w[0].f0)
  })
  it('quiet unless the member chose otherwise', () => {
    expect(beepVolume({})).toBe(0.35); expect(beepVolume({ botBeeps: 0 })).toBe(0); expect(beepVolume({ botBeeps: 0.8 })).toBe(0.8)
  })
})
