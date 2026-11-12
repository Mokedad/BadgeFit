import { describe, it, expect } from 'vitest'
import { metresBetween, emptyTrack, addFix, paceOf, fmtPace, kmOf, livePace, thinRoute, routePath } from './gps.js'

// A straight line north from a point: 1 degree of latitude is about 111.2 km.
const north = (m, t, acc = 8) => ({ lat: -33.75 + m / 111195, lon: 150.77, acc, t })

describe('gps', () => {
  it('measures metres between points', () => {
    expect(metresBetween(north(0, 0), north(1000, 0))).toBeCloseTo(1000, 0)
  })
  it('adds up a run and closes a split each kilometre', () => {
    const tr = emptyTrack()
    for (let i = 0; i <= 220; i++) addFix(tr, north(i * 10, i * 3000)) // 10 m every 3 s: 5:00 per km
    expect(tr.m).toBeCloseTo(2200, 0)
    expect(tr.splits).toEqual([{ km: 1, sec: 300 }, { km: 2, sec: 300 }])
    expect(fmtPace(paceOf(tr.m, 660))).toBe('5:00')
    expect(kmOf(tr.m)).toBe(2.2)
  })
  it('ignores jitter, bad fixes and impossible jumps', () => {
    const tr = emptyTrack()
    addFix(tr, north(0, 0))
    addFix(tr, north(2, 1000))            // under 4 m: standing still
    addFix(tr, north(50, 2000, 80))       // poor accuracy
    addFix(tr, north(500, 3000))          // 500 m in a second
    expect(tr.m).toBe(0)
    addFix(tr, north(10, 4000))
    expect(tr.m).toBeCloseTo(10, 0)
  })
  it('a pause adds no distance, and the run picks up from where it resumes', () => {
    const tr = emptyTrack()
    addFix(tr, north(0, 0)); addFix(tr, north(20, 6000))
    addFix(tr, north(60, 30000), { paused: true })   // walked 40 m while paused
    addFix(tr, north(80, 36000))                     // first fix after: anchors, no distance
    addFix(tr, north(100, 42000))
    expect(tr.m).toBeCloseTo(40, 0)
  })
  it('gives a live pace, a thinned route and a path to draw', () => {
    const tr = emptyTrack()
    for (let i = 0; i <= 40; i++) addFix(tr, north(i * 10, i * 3000))
    expect(fmtPace(livePace(tr, 40 * 3000))).toBe('5:00')
    const route = thinRoute(tr.pts, 10)
    expect(route.length).toBeLessThanOrEqual(11)
    expect(route[0]).toEqual([-33.75, 150.77])
    expect(routePath(route)).toMatch(/^M[\d.]+ [\d.]+L/)
    expect(routePath([[1, 1]])).toBe('')
    expect(fmtPace(null)).toBe('–')
  })
})
