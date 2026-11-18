// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { weekPlan, routineFor, buildPoliceProgramme, applyPhaseRange, planOptsOf, noGymPushUps, noGymFriday, NOGYM_TC_WEEK } from './programme.js'
import { runForDay, runById } from './runs.js'
import { installPlanIn } from './install-plan.js'
import { freshState } from '../../store/useStore.js'

const NG = { track: 'academy', noGym: true }

describe('the no-gym Academy plan (a coach\'s 3-day plan)', () => {
  it('trains Monday and Friday, and a Wednesday jog from the coach\'s week 6', () => {
    const w1 = weekPlan('beginner', 1, 30, NG).days
    expect(w1.map(d => d.kind)).toEqual(['gym', 'rest', 'rest', 'rest', 'gym', 'rest', 'rest'])
    const w5 = weekPlan('beginner', 5, 30, NG).days
    expect(w5.map(d => d.key)).toEqual(['ngMon', null, 'ngJog', null, 'ngFri', null, null])
    expect(runForDay(w5[2]).id).toBe('jog-70')
    // The gym Academy plan is untouched.
    expect(weekPlan('beginner', 1, 30, { track: 'academy' }).days[0].key).toBe('acadA')
  })

  it('follows the coach\'s push-ups and runs week by week', () => {
    expect(NOGYM_TC_WEEK.length).toBe(12)
    expect(noGymPushUps(3)).toEqual({ sets: 3, reps: 10 })
    expect(noGymPushUps(9)).toEqual({ sets: 3, reps: 20 })
    expect(noGymPushUps(9, true)).toEqual({ sets: 4, reps: 15 })
    expect(noGymPushUps(15)).toEqual({ sets: 3, reps: 25 })
    expect([3, 6, 8, 10, 12, 15].map(tc => noGymFriday(tc).id)).toEqual(['fartlek-2-2', 'int-4x200', 'int-4x400', 'int-6x400', 'int-8x800', 'int-6x400'])
    for (const tc of NOGYM_TC_WEEK) expect(runById(noGymFriday(tc).id)).not.toBeNull()
    const mon = weekPlan('beginner', 1, 30, NG).days[0]
    expect(mon.details[0]).toBe('Push-ups 3 sets: as many as you can, then 10, 10')
    const r = routineFor('ngMon', 'beginner', '10-12', 12)
    expect(r.ex.map(e => e.id)).toEqual(['0662', '0499', '0463', '0685', '2471'])
    expect(r.ex[0]).toMatchObject({ sets: 3, reps: 25 })
  })

  it('re-tests in weeks 4 and 8, on the Saturday', () => {
    expect(weekPlan('beginner', 4, 30, NG).days[5]).toMatchObject({ kind: 'test', key: null })
  })

  it('installs as its own programme and moves the push-ups on with the week', () => {
    const built = buildPoliceProgramme('beginner', 0, NG)
    expect(Object.keys(built.keys).sort()).toEqual(['ngMon', 'ngFri'].sort())
    expect(built.programme.name).toMatch(/no gym/)
    const late = applyPhaseRange(built.routines, 'beginner', 12, built.keys, 'academy')
    expect(late.find(r => r.police === 'ngMon').ex[0]).toMatchObject({ sets: 3, reps: 25 })
    expect(planOptsOf({ track: 'academy', academyStyle: 'nogym' }).noGym).toBe(true)
    expect(planOptsOf({ academyStyle: 'nogym' }).noGym).toBeUndefined()

    const s = freshState()
    s.police = { level: 'beginner', start: '2026-12-07', planV: 3, track: 'academy' }
    installPlanIn(s, { level: 'beginner', track: 'academy', noGym: true, today: '2026-12-08' })
    expect(s.police.academyStyle).toBe('nogym')
    expect(s.routines.some(r => r.name.startsWith('No-gym Monday'))).toBe(true)
    installPlanIn(s, { level: 'beginner', track: 'academy', today: '2026-12-08' })
    expect(s.police.academyStyle).toBeUndefined()
    expect(s.routines.some(r => r.name.startsWith('No-gym'))).toBe(false)
    expect(s.routines.some(r => r.name === 'Academy Circuit')).toBe(true)
  })
})
