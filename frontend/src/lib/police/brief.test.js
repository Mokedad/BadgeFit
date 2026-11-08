import { describe, it, expect } from 'vitest'
import { policeBrief, AREAS } from './brief.js'
import { STANDARDS } from './standards.js'

const S = {
  unit: 'kg', targetW: 100,
  bodyweight: [{ d: '2026-10-10', w: 114 }, { d: '2026-11-07', w: 110 }],
  police: {
    level: 'intermediate', start: '2026-09-14', testDate: '2026-12-05', age: 28, weightKg: 110, heightCm: 180, sex: 'male',
    results: [{ id: 'pushups', v: 22, at: '2026-11-01' }, { id: 'beep', v: '6.8', at: '2026-11-02' }, { id: 'bridge', v: 95, at: '2026-11-02' }],
    runLog: [{ run: 'vo2-4x4', at: '2026-11-03', min: 40, rpe: 8 }],
    meals: { '2026-11-08': [{ id: 'a', name: 'Porridge', kcal: 520, protein: 42 }] },
  },
}

describe('policeBrief', () => {
  it('is null for someone who is not a member', () => {
    expect(policeBrief({ police: {} }, '2026-11-08')).toBeNull()
    expect(policeBrief({}, '2026-11-08')).toBeNull()
  })
  it('knows the day, the test and the gaps by body area', () => {
    const b = policeBrief(S, '2026-11-08') // a Sunday, week 8
    expect(b.week).toBe(8)
    expect(b.phase).toEqual({ n: 2, range: '6-8' })
    expect(b.daysToTest).toBe(27)
    expect(b.today.title).toMatch(/walk/i)
    expect(b.todayRun.name).toMatch(/Incline walk/)
    expect(b.tomorrow.title).toBe('Chest, Shoulders & Abs')
    // failing standards first, furthest from the mark first; the passed bridge last
    expect(b.gaps[0].pass).toBe(false)
    expect(b.gaps.at(-1)).toMatchObject({ id: 'bridge', pass: true })
    expect(b.gaps.find(g => g.id === 'pushups')).toMatchObject({ area: 'Chest, shoulders and triceps', pct: 88, latest: '22 reps' })
    expect(b.runsThisWeek.count).toBe(1)
    expect(b.foodToday).toMatchObject({ kcal: 520, protein: 42, proteinTarget: 242 })
    expect(b.weight).toMatchObject({ start: 114, now: 110, change: -4, goal: 100 })
  })
  it('every standard maps to a body area', () => {
    for (const s of STANDARDS) expect(AREAS[s.id]?.area).toBeTruthy()
  })
})
