import { describe, it, expect } from 'vitest'
import { RUNS, CATEGORIES, runById, runsIn, runMinutes, hrFor, runForDay, runsThisWeek } from './runs.js'
import { weekPlan } from './programme.js'

describe('run library', () => {
  it('has every category, unique ids, and only valid segments', () => {
    for (const c of CATEGORIES) expect(runsIn(c.id).length).toBeGreaterThan(0)
    expect(new Set(RUNS.map(r => r.id)).size).toBe(RUNS.length)
    for (const r of RUNS) for (const s of r.segments) {
      expect(['warm', 'work', 'rest', 'cool']).toContain(s.kind)
      expect((s.sec > 0) !== (s.dist > 0)).toBe(true) // timed or distance, never both
      expect(s.label).toBeTruthy()
    }
  })
  it('4×4: warm-up, four hard four-minute blocks, three recoveries, cool-down', () => {
    const r = runById('vo2-4x4')
    expect(r.segments.filter(s => s.kind === 'work').map(s => s.sec)).toEqual([240, 240, 240, 240])
    expect(r.segments.filter(s => s.kind === 'rest').length).toBe(3)
    expect(runMinutes(r)).toBe(10 + 16 + 9 + 5)
  })
  it('distance reps are tapped through', () => {
    const r = runById('int-100s')
    expect(r.segments.filter(s => s.dist === 100 && s.kind === 'work').length).toBe(10)
  })
  it('heart rate zones from age', () => {
    expect(hrFor('z2', 30)).toEqual({ lo: 114, hi: 143 })
    expect(hrFor('z5', 30)).toEqual({ lo: 171, hi: 190 })
    expect(hrFor('z2', null)).toBeNull()
  })
})

describe('runForDay', () => {
  it('maps every run day of the programme to a library run', () => {
    for (const lvl of ['beginner', 'intermediate']) for (const beepFocus of [false, true]) for (let w = 1; w <= 12; w++) {
      for (const d of weekPlan(lvl, w, 28, { beepFocus }).days) {
        if (['vo2', 'vo2b', 'easy', 'tempo', 'walk'].includes(d.key)) expect(runForDay(d), `${lvl} w${w} ${d.title}`).toBeTruthy()
      }
    }
  })
  it('picks the specific session', () => {
    const tue = weekPlan('beginner', 1).days.find(d => d.day === 2)
    expect(runForDay(tue).id).toBe('vo2-4x4')
    expect(runForDay(weekPlan('beginner', 9).days.find(d => d.day === 2)).id).toBe('shuttle-sprints')
    expect(runForDay({ key: 'chest' })).toBeNull()
  })
  it('counts this week\'s runs', () => {
    expect(runsThisWeek([{ at: '2026-11-08' }, { at: '2026-11-02' }, { at: '2026-11-01' }], '2026-11-08')).toHaveLength(2)
  })
})
