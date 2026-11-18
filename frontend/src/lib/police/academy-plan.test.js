// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { weekPlan, routineFor, buildPoliceProgramme, applyPhaseRange, phaseOf, planOptsOf, ACADEMY_PHASES } from './programme.js'
import { runForDay } from './runs.js'
import { installPlanIn, onBadgeFitPlan } from './install-plan.js'
import { afterPatch } from './after-test.js'
import { freshState } from '../../store/useStore.js'

const A = { track: 'academy' }

describe('the Academy prep plan', () => {
  it('trains more running and more lifting, seven days in order', () => {
    const wk = weekPlan('beginner', 1, 30, A)
    expect(wk.days.map(d => d.key)).toEqual(['acadA', 'steady', 'circuit', 'vo2', 'acadB', 'long', null])
    expect(wk.days.map(d => d.kind)).toEqual(['gym', 'run', 'gym', 'run', 'gym', 'run', 'rest'])
    expect(wk.days[0].title).toBe('Strength A: Squat & Pull')
    expect(wk.days[2].details[0]).toMatch(/^3 rounds/)
    expect(weekPlan('intermediate', 1, 30, A).days[2].details[0]).toMatch(/^4 rounds/)
    // The PCT plan is untouched.
    expect(weekPlan('beginner', 1, 30, {}).days[0].key).toBe('chest')
  })

  it('builds the runs up slowly over the 12 weeks', () => {
    const km = (lv, w, i) => Number(/(\d+) km/.exec(weekPlan(lv, w, 30, A).days[i].title)[1])
    expect([km('beginner', 1, 1), km('beginner', 12, 1)]).toEqual([4, 6])
    expect([km('beginner', 1, 5), km('beginner', 11, 5)]).toEqual([6, 9])
    expect([km('intermediate', 1, 1), km('intermediate', 12, 1)]).toEqual([5, 7])
    expect([km('intermediate', 1, 5), km('intermediate', 11, 5)]).toEqual([7, 10])
    // Never more than a kilometre more than the long run before (weeks 4 and 8 re-test instead).
    const weeks = [1, 2, 3, 5, 6, 7, 9, 10, 11]
    for (let i = 1; i < weeks.length; i++) expect(km('intermediate', weeks[i], 5) - km('intermediate', weeks[i - 1], 5)).toBeLessThanOrEqual(1)
    for (let w = 2; w <= 12; w++) expect(km('intermediate', w, 1) - km('intermediate', w - 1, 1)).toBeLessThanOrEqual(1)
  })

  it('re-tests the six standards at the end of each block', () => {
    for (const w of [4, 8]) expect(weekPlan('beginner', w, 30, A).days[5]).toMatchObject({ kind: 'test', title: 'Test day: keep all six standards' })
    expect(weekPlan('beginner', 5, 30, A).days[5].kind).toBe('run')
  })

  it('ends on the Academy start day, with an easy day before', () => {
    const wk = weekPlan('beginner', 12, 30, { ...A, planWeeks: 12, testDow: 1, testName: 'Academy' })
    expect(wk.days.find(d => d.day === 1)).toMatchObject({ kind: 'test', title: 'Academy starts' })
    expect(wk.days.find(d => d.day === 0)).toMatchObject({ kind: 'rest', title: 'Easy day before the Academy' })
    expect(wk.final).toBe(true)
  })

  it('runs the circuit as one group with a minute between rounds', () => {
    const r = routineFor('circuit', 'beginner', '10-12')
    expect(r.ex.length).toBe(7)
    expect(r.ex.every(e => e.sg === 'circuit' && e.restSec === 60 && e.sets === 3)).toBe(true)
    // Pull-ups have their own, lower rep range.
    const pull = routineFor('acadA', 'beginner', '10-12').ex.find(e => e.id === '0652')
    expect([pull.repsMin, pull.reps]).toEqual([3, 6])
    expect(routineFor('acadA', 'intermediate', '10-12').ex.find(e => e.id === '0652').reps).toBe(10)
  })

  it('opens guided runs for its run days', () => {
    const w1 = weekPlan('beginner', 1, 30, A).days, w12 = weekPlan('beginner', 11, 30, A).days
    expect(runForDay(w1[1]).id).toBe('steady-30')
    expect(runForDay(weekPlan('intermediate', 12, 30, A).days[1]).id).toBe('steady-40')
    expect(runForDay(w1[5]).id).toBe('easy-45')
    expect(runForDay(w12[5]).id).toBe('long-60')
    expect(runForDay(w1[3])).not.toBeNull()
  })

  it('makes its own routines and programme, and keeps the circuit off the phase rep range', () => {
    const built = buildPoliceProgramme('intermediate', 0, A)
    expect(Object.keys(built.keys).sort()).toEqual(['acadA', 'acadB', 'circuit', 'long', 'steady', 'vo2'])
    expect(built.programme.name).toMatch(/Academy prep, Intermediate/)
    const late = applyPhaseRange(built.routines, 'intermediate', 10, built.keys, 'academy')
    const squat = late.find(r => r.police === 'acadA').ex.find(e => e.id === '0043')
    expect([squat.repsMin, squat.reps]).toEqual([4, 6])
    const swing = late.find(r => r.police === 'circuit').ex.find(e => e.id === '0549')
    const swing0 = built.routines.find(r => r.police === 'circuit').ex.find(e => e.id === '0549')
    expect(swing.reps).toBe(swing0.reps)
    expect(phaseOf('intermediate', 10, 'academy')).toBe(ACADEMY_PHASES.intermediate[2])
    expect(planOptsOf({ track: 'academy' }).track).toBe('academy')
    expect(planOptsOf({}).track).toBeUndefined()
  })

  it('takes over a member\'s plan when they pass, and goes back for a re-test', () => {
    const s = freshState()
    s.police = { level: 'beginner', start: '2026-09-07', planV: 3, testDate: '2026-11-30' }
    installPlanIn(s, { level: 'beginner', today: '2026-11-18' })
    const pctKeys = Object.keys(s.police.keys)
    expect(pctKeys).toContain('chest')
    s.police = { ...s.police, ...afterPatch('passed', s.police, '2026-12-02') }
    installPlanIn(s, { level: 'beginner', track: 'academy', today: '2026-12-02' })
    expect(s.police.track).toBe('academy')
    expect(Object.keys(s.police.keys)).toContain('circuit')
    expect(s.programme.id).toBe(s.police.programmeId)
    // The PCT routines are gone, the Academy ones are there.
    expect(s.routines.some(r => r.name === 'Chest, Shoulders & Abs')).toBe(false)
    expect(s.routines.some(r => r.name === 'Academy Circuit')).toBe(true)
    installPlanIn(s, { level: 'beginner', today: '2026-12-09' })
    expect(s.police.track).toBeUndefined()
    expect(Object.keys(s.police.keys)).toContain('chest')
    expect(onBadgeFitPlan({ planChoice: 'upload' })).toBe(false)
    expect(onBadgeFitPlan({ planChoice: 'run' })).toBe(true)
  })
})
