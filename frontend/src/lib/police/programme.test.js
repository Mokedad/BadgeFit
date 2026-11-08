import { describe, it, expect } from 'vitest'
import { weekPlan, zone2, phaseOf, buildPoliceProgramme, applyPhaseRange, weekNumber, vo2For, routineFor } from './programme.js'
import { EXIDX } from '../exercises.js'

describe('weekPlan', () => {
  it('has seven days, Monday first, with the owner\'s split', () => {
    const w = weekPlan('intermediate', 1)
    expect(w.days.map(d => d.day)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(w.days.map(d => d.key)).toEqual(['chest', 'vo2', 'legs', 'easy', 'arms', 'tempo', 'walk'])
  })
  it('gives beginners a full rest day and no hard steady run', () => {
    const w = weekPlan('beginner', 2)
    expect(w.days.find(d => d.day === 0).kind).toBe('rest')
    expect(w.days.some(d => d.key === 'tempo')).toBe(false)
  })
  it('re-tests the standards at the end of each phase', () => {
    expect(weekPlan('beginner', 4).test).toBe(true)
    expect(weekPlan('beginner', 5).test).toBe(false)
    expect(weekPlan('beginner', 12).days.some(d => d.kind === 'test')).toBe(true)
  })
  it('moves through the rep ranges by phase', () => {
    expect(phaseOf('beginner', 1).range).toBe('12-15')
    expect(phaseOf('beginner', 9).range).toBe('6-8')
    expect(phaseOf('intermediate', 12).range).toBe('4-6')
  })
  it('clamps the week and rotates the VO2 format within each phase', () => {
    expect(weekPlan('beginner', 40).week).toBe(12)
    expect(vo2For(1).name).not.toBe(vo2For(2).name)
    expect(vo2For(9).name).toBe('Shuttle sprints')
    expect(new Set([1, 2, 3, 4].map(w => vo2For(w).name)).size).toBe(4)
  })
  it('gives a zone 2 heart rate from age', () => {
    expect(zone2(30)).toEqual({ max: 190, target: 143, lo: 133, hi: 152 })
    expect(zone2('')).toBeNull()
    expect(weekPlan('beginner', 1, 30).days.find(d => d.key === 'easy').details.join(' ')).toContain('143 bpm')
  })
  it('balances pressing with pulling', () => {
    const { routines } = buildPoliceProgramme('beginner', 1)
    const ids = routines.flatMap(r => r.ex.map(e => e.id))
    expect(ids).toEqual(expect.arrayContaining(['2291', '1323', '1236', '0739']))
  })
})

describe('beep focus', () => {
  it('turns Saturday into a second interval session', () => {
    const w = weekPlan('intermediate', 5, null, { beepFocus: true })
    const sat = w.days.find(d => d.day === 6)
    expect(sat).toMatchObject({ kind: 'run', key: 'vo2b' })
    expect(sat.title).toContain('400-300-200')
    expect(w.days.filter(d => d.kind === 'run').length).toBe(3)
  })
  it('gives beginners the recovery walk on Sunday instead of a full rest', () => {
    const w = weekPlan('beginner', 1, null, { beepFocus: true })
    expect(w.days.find(d => d.day === 0).key).toBe('walk')
    expect(buildPoliceProgramme('beginner', 1, { beepFocus: true }).routines.map(r => r.police)).toContain('vo2b')
  })
  it('test weeks still re-test on Saturday', () => {
    expect(weekPlan('beginner', 8, null, { beepFocus: true }).days.find(d => d.day === 6).kind).toBe('test')
  })
})

describe('buildPoliceProgramme', () => {
  it('builds real routines on catalogue exercises and a 12-week programme', () => {
    const { routines, programme, keys } = buildPoliceProgramme('intermediate', 1)
    expect(routines).toHaveLength(7)
    for (const r of routines) for (const e of r.ex) expect(EXIDX[e.id], e.id).toBeTruthy()
    expect(programme.weeks).toHaveLength(12)
    expect(programme.days[1]).toEqual([keys.chest])
    expect(programme.days[0]).toEqual([keys.walk])
  })
  it('starts the lifts in the phase-1 range under double progression', () => {
    const { routines } = buildPoliceProgramme('beginner', 1)
    const bench = routines.find(r => r.police === 'chest').ex.find(e => e.id === '0025')
    expect(bench).toMatchObject({ repsMin: 12, reps: 15, prog: 'double' })
    expect(routines.find(r => r.police === 'chest').ex.find(e => e.id === '0463').mode).toBe('time')
  })
  it('applyPhaseRange moves only the lifts', () => {
    const { routines } = buildPoliceProgramme('intermediate', 1)
    const next = applyPhaseRange(routines, 'intermediate', 9)
    const chest = next.find(r => r.police === 'chest')
    expect(chest.ex.find(e => e.id === '0025')).toMatchObject({ repsMin: 4, reps: 6 })
    expect(chest.ex.find(e => e.id === '0662')).toMatchObject({ repsMin: 12, reps: 20 })
    expect(next.find(r => r.police === 'vo2')).toEqual(routines.find(r => r.police === 'vo2'))
  })
  it('applyPhaseRange finds untagged routines by their ids', () => {
    const { routines, keys } = buildPoliceProgramme('beginner', 1)
    const bare = routines.map(({ police, ...r }) => r)
    const legs = applyPhaseRange(bare, 'beginner', 5, keys).find(r => r.id === keys.legs)
    expect(legs.ex.find(e => e.id === '0043')).toMatchObject({ repsMin: 10, reps: 12 })
  })
  it('cardio routines carry minutes and speed', () => {
    expect(routineFor('walk', 'beginner', '12-15').ex[0]).toMatchObject({ mode: 'cardio', min: 30, incline: 12 })
  })
})

describe('weekNumber', () => {
  it('counts weeks from the start date', () => {
    expect(weekNumber('2026-01-05', '2026-01-05')).toBe(1)
    expect(weekNumber('2026-01-05', '2026-01-12')).toBe(2)
    expect(weekNumber('2026-01-05', '2026-12-01')).toBe(12)
    expect(weekNumber('2026-01-05', '2026-01-01')).toBeNull()
  })
})

import { startForTest, daysUntil, TAPER } from './programme.js'
describe('test countdown', () => {
  it('puts the test in week 12, so 4 weeks out is week 9', () => {
    const start = startForTest('2026-12-05') // a Saturday
    expect(start).toBe('2026-09-14') // a Monday
    expect(weekNumber(start, '2026-12-05')).toBe(12)
    expect(weekNumber(start, '2026-11-30')).toBe(12) // the Monday of test week
    expect(weekNumber(start, '2026-11-29')).toBe(11)
    expect(weekNumber(start, '2026-11-09')).toBe(9)
    expect(daysUntil('2026-12-05', '2026-11-07')).toBe(28)
    expect(startForTest('nope')).toBeNull()
  })
  it('tapers week 12', () => {
    expect(weekPlan('beginner', 12).days[0].details.join(' ')).toMatch(/Final week/)
    expect(weekPlan('beginner', 11).days[0].details.join(' ')).not.toMatch(/Final week/)
    expect(TAPER.length).toBe(4)
  })
})

import { planOptsOf } from './programme.js'
describe('the test on its real day', () => {
  it('a Wednesday PCT lands on Wednesday of week 12, the Tuesday is easy, no Saturday re-test', () => {
    const o = planOptsOf({ testDate: '2026-12-02', testName: 'PCT' })
    expect(o.testDow).toBe(3)
    const w = weekPlan('intermediate', 12, 28, o)
    expect(w.days.find(d => d.day === 3)).toMatchObject({ kind: 'test', title: 'PCT day' })
    expect(w.days.find(d => d.day === 2)).toMatchObject({ kind: 'rest' })
    expect(w.days.filter(d => d.kind === 'test')).toHaveLength(1)
    expect(weekNumber(startForTest('2026-12-02'), '2026-12-02')).toBe(12)
  })
  it('a named event, and nothing changes before week 12', () => {
    const o = planOptsOf({ testDate: '2026-12-06', testName: 'Hyrox' })
    expect(weekPlan('beginner', 12, null, o).days.find(d => d.day === 0).title).toBe('Hyrox day')
    expect(weekPlan('beginner', 11, null, o).days.some(d => d.kind === 'test')).toBe(false)
    expect(planOptsOf({}).testDow).toBeNull()
  })
})

import { planWeekOf } from './programme.js'
describe('planWeekOf', () => {
  it('a test 20 weeks away: week 1 on repeat until the 12 weeks start', () => {
    const P = { start: startForTest('2027-03-27') }
    expect(planWeekOf(P, '2026-11-08')).toMatchObject({ week: 1, before: true })
    expect(planWeekOf(P, '2026-11-08').startsIn).toBeGreaterThan(50)
    expect(planWeekOf({ ...P, testDate: '2027-03-27' }, '2027-03-27')).toMatchObject({ week: 12, before: false, final: true })
    expect(planWeekOf({}, '2026-11-08').week).toBeNull()
  })
})

import { planStart, finalWeekOf } from './programme.js'
describe('a test less than 12 weeks away', () => {
  // Today is Sunday 8 November 2026; the PCT is Saturday 5 December, four weeks on.
  const P = { testDate: '2026-12-05', testName: 'PCT', start: planStart('2026-12-05', '2026-11-08') }
  it('starts at week 1 and ends on the test week', () => {
    expect(P.start).toBe('2026-11-09') // joined on a Sunday: week 1 is next week
    expect(planStart('2026-12-05', '2026-11-04')).toBe('2026-11-02') // a Wednesday: this week
    expect(finalWeekOf(P)).toBe(4)
    expect(planWeekOf(P, '2026-11-08')).toMatchObject({ week: 1, before: true, startsIn: 1 })
    expect(planWeekOf(P, '2026-11-09')).toMatchObject({ week: 1, last: 4, final: false })
    expect(planWeekOf(P, '2026-12-05')).toMatchObject({ week: 4, final: true, after: false })
  })
  it('the final week is light, with the test on its day; earlier weeks are normal', () => {
    const o = planOptsOf(P)
    const fin = weekPlan('beginner', 4, null, o)
    expect(fin.final).toBe(true)
    expect(fin.days.find(d => d.day === 6)).toMatchObject({ kind: 'test', title: 'PCT day' })
    expect(fin.days.find(d => d.day === 5).kind).toBe('rest')
    expect(fin.days[0].details.join(' ')).toMatch(/Final week: light training/)
    const w3 = weekPlan('beginner', 3, null, o)
    expect(w3.final).toBe(false)
    expect(w3.days[0].details.join(' ')).not.toMatch(/Final week/)
    expect(weekPlan('beginner', 1, null, o).phase.range).toBe('12-15')
  })
  it('a test 12 or more weeks away keeps the full 12, ending on test week', () => {
    const far = { testDate: '2027-03-27', start: planStart('2027-03-27', '2026-11-08') }
    expect(far.start).toBe(startForTest('2027-03-27'))
    expect(finalWeekOf(far)).toBe(12)
    expect(planWeekOf(far, '2026-11-08')).toMatchObject({ week: 1, before: true })
    expect(finalWeekOf({ start: '2026-11-02' })).toBe(12)
  })
  it('keeps going after the test, never repeating the final week', () => {
    expect(planWeekOf(P, '2026-12-06')).toMatchObject({ week: 4, final: true }) // Sunday of test week
    const after = ['2026-12-07', '2026-12-14', '2026-12-21'].map(d => planWeekOf(P, d))
    expect(after.map(w => w.week)).toEqual([5, 6, 7])
    expect(after.every(w => w.after && !w.final)).toBe(true)
    const full = { testDate: '2026-12-05', start: startForTest('2026-12-05') }
    expect(['2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28'].map(d => planWeekOf(full, d).week)).toEqual([10, 11, 9, 10])
  })
})
