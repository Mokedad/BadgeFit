import { describe, it, expect } from 'vitest'
import { cadenceAt, REP_MS } from './pushup-cadence.js'

describe('push-ups to a cadence', () => {
  it('goes down, then up, and counts a rep each full beat', () => {
    expect(cadenceAt(-500)).toEqual({ reps: 0, phase: 'ready' })
    expect(cadenceAt(0)).toEqual({ reps: 0, phase: 'down' })
    expect(cadenceAt(REP_MS * 0.6)).toEqual({ reps: 0, phase: 'up' })
    expect(cadenceAt(REP_MS * 25 + 10)).toEqual({ reps: 25, phase: 'down' })
  })
})
