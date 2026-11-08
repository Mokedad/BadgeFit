import { describe, it, expect } from 'vitest'
import { toneWav } from './tones.js'

describe('toneWav', () => {
  it('is a WAV of the right length', () => {
    const w = toneWav({ ms: 100, tones: 3, gapMs: 50, rate: 10000 })
    const v = new DataView(w.buffer)
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF')
    expect(v.getUint32(24, true)).toBe(10000)
    expect(v.getUint32(40, true)).toBe((3 * 1000 + 2 * 500) * 2)
  })
})
