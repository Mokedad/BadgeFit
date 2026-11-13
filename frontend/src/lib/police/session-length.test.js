import { describe, it, expect } from 'vitest'
import { restFor, fitSession, sessionMinutes, restLabel, entryMinutes } from './session-length.js'

const lift = (id, n, reps) => ({ id, sets: Array.from({ length: n }, () => ({ r: reps })), target: { reps } })
const chest = [lift('0025', 4, 6), lift('0314', 3, 6), lift('0426', 3, 6), lift('0334', 3, 8), lift('1236', 3, 8),
  lift('0662', 3, 15), lift('0472', 3, 12), { id: '0463', sets: [{ mode: 'time' }, { mode: 'time' }, { mode: 'time' }], target: { mode: 'time', sec: 60 } }]

describe('rests follow the kind of exercise', () => {
  it('heavy lifting rests longest, light sets and explosive or body-weight work least', () => {
    expect(restFor(lift('0025', 3, 5))).toBe(210)
    expect(restFor(lift('0025', 3, 8))).toBe(150)
    expect(restFor(lift('0025', 3, 12))).toBe(90)
    expect(restFor(lift('0025', 3, 15))).toBe(60)
    expect(restFor(lift('0514', 3, 6))).toBe(45) // jump squat: keep moving
    expect(restFor(chest[7])).toBe(45)           // plank hold
  })
  it('keeps a rest the member set, and never rests a run', () => {
    expect(restFor({ id: '0025', sets: [{}], target: { reps: 5, restSec: 100 } })).toBe(100)
    expect(restFor({ id: '0685', sets: [{ mode: 'cardio', min: 30 }] })).toBe(0)
  })
  it('says a rest in plain words', () => {
    expect([restLabel(45), restLabel(90), restLabel(150), restLabel(180), restLabel(210)]).toEqual(['45 s', '90 s', '2½ min', '3 min', '3½ min'])
  })
})

describe('fitting today into the time there is', () => {
  it('a heavy day over 45 minutes comes down to 45, keeping the big lifts and the test practice', () => {
    expect(sessionMinutes(chest)).toBeGreaterThan(45)
    const fit = fitSession(chest, 45)
    expect(fit.reduce((a, e) => a + entryMinutes(e), 0)).toBeLessThanOrEqual(45)
    expect(fit.slice(0, 2).map(e => e.id)).toEqual(['0025', '0314'])
    expect(fit.map(e => e.id)).toContain('0662')
    expect(fit.every(e => e.sets.length <= 3)).toBe(true)
    expect(fit.every(e => e.target.restSec > 0)).toBe(true)
  })
  it('more time keeps more; Full keeps all, with rests set', () => {
    expect(fitSession(chest, 60).length).toBeGreaterThan(fitSession(chest, 45).length)
    const full = fitSession(chest, 0)
    expect(full.length).toBe(chest.length)
    expect(full[0].sets.length).toBe(4)
  })
  it('a short day is left whole, and a run is never cut', () => {
    const run = { id: '0685', sets: [{ mode: 'cardio', min: 40 }] }
    expect(fitSession([lift('0025', 3, 10)], 45).length).toBe(1)
    expect(fitSession([...chest, run], 45).at(-1)).toBe(run)
  })
})
