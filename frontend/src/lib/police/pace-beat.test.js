import { describe, it, expect } from 'vitest'
import { beatFor, tickGap, paceSettings, paceLine, clampAdj, clampVol, PACE_DEFAULTS, ZONE_SPM, WALK_SPM, ADJ_MAX } from './pace-beat.js'
import { RUNS } from './runs.js'

const warm = { kind: 'warm', label: 'Warm-up jog', effort: 'z1' }
const go = { kind: 'work', label: '4 min hard', effort: 'z5' }
const jog = { kind: 'rest', label: '3 min easy jog', effort: 'z1' }
const walkBack = { kind: 'rest', dist: 100, label: 'Walk 100 m back', effort: 'z1' }
const brisk = { kind: 'work', label: 'Brisk walk', effort: 'z2' }
const cool = { kind: 'cool', label: 'Cool-down walk or jog', effort: 'z1' }

describe('pace beat', () => {
  it('sets the beat for each part from its effort', () => {
    expect(beatFor(warm)).toBe(160)
    expect(beatFor(go)).toBe(176)
    expect(beatFor(jog)).toBe(158)
    expect(beatFor({ kind: 'work', label: 'Tempo', effort: 'z3' })).toBe(ZONE_SPM.z3)
    expect(beatFor({ kind: 'work', label: 'Run' })).toBe(ZONE_SPM.z2)
  })

  it('has no beat while walking back or cooling down, and a walking beat for a brisk walk', () => {
    expect(beatFor(walkBack)).toBe(null)
    expect(beatFor(cool)).toBe(null)
    expect(beatFor(brisk)).toBe(WALK_SPM)
    expect(beatFor(null)).toBe(null)
  })

  it('moves every part by the member\'s nudge, within limits', () => {
    expect(beatFor(go, 4)).toBe(180)
    expect(beatFor(warm, -6)).toBe(154)
    expect(beatFor(go, 99)).toBe(176 + ADJ_MAX)
    expect(clampAdj(-50)).toBe(-ADJ_MAX)
    expect(clampAdj('3.4')).toBe(3)
  })

  it('spaces the ticks a step apart, or two steps apart', () => {
    expect(tickGap(120)).toBeCloseTo(0.5)
    expect(tickGap(120, 2)).toBeCloseTo(1)
    expect(tickGap(null)).toBe(null)
  })

  it('cleans what is stored', () => {
    expect(paceSettings(undefined)).toEqual({ ...PACE_DEFAULTS })
    expect(paceSettings({ pace: { on: true, sound: 'buzz', every: 2, adj: 7, vol: 3 } })).toEqual({ on: true, sound: 'buzz', every: 2, adj: 7, vol: 1 })
    expect(paceSettings({ pace: { on: 'yes', sound: 'drum', every: 5, vol: 'loud' } })).toEqual({ ...PACE_DEFAULTS })
    expect(clampVol(0)).toBe(0.05)
  })

  it('says what to do under the clock', () => {
    expect(paceLine(go)).toBe('Step on each tick · 176 a minute')
    expect(paceLine(go, { every: 2, sound: 'buzz' })).toBe('Same foot each buzz · 176 a minute')
    expect(paceLine(walkBack)).toBe('No beat while you walk')
    expect(paceLine(cool)).toBe('No beat on the cool-down')
  })

  it('gives every run in the library a beat somewhere', () => {
    for (const r of RUNS) expect(r.segments.some(s => beatFor(s) != null), r.id).toBe(true)
  })
})
