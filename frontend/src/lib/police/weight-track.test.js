import { describe, it, expect } from 'vitest'
import { weightTrack } from './weight-track.js'

const base = { startKg: 114, goalKg: 110, startISO: '2026-11-09', testISO: '2026-12-06' }
describe('weightTrack', () => {
  it('draws the line from start to test day', () => {
    const w = weightTrack({ ...base, nowKg: 113, todayISO: '2026-11-23' })
    expect(w.expected).toBeCloseTo(112, 0)
    expect(w.onTrack).toBe(false)
    expect(w.perWeek).toBeCloseTo(1, 0)
    expect(weightTrack({ ...base, nowKg: 111.8, todayISO: '2026-11-23' }).onTrack).toBe(true)
  })
  it('flags a cut faster than 1% of body weight a week', () => {
    expect(weightTrack({ ...base, goalKg: 104, nowKg: 114, todayISO: '2026-11-09' }).tooFast).toBe(true)
    expect(weightTrack({ ...base, nowKg: 114, todayISO: '2026-11-09' }).tooFast).toBe(false)
  })
  it('needs every number', () => {
    expect(weightTrack({ ...base, nowKg: null, todayISO: '2026-11-09' })).toBeNull()
  })
})
