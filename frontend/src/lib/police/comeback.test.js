// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { freshState } from '../../store/useStore.js'
import { installPlanIn } from './install-plan.js'
import { missedInARow, showComeback, showCheckin } from './comeback.js'

const plan = () => { const s = freshState(); s.police = { level: 'beginner' }; installPlanIn(s, { level: 'beginner', today: '2026-11-09' }); return s }

describe("Hayden's comeback and check-in", () => {
  it('counts planned days missed in a row, skipping rest days and noted days', () => {
    const s = plan()
    // Week 2 Mon 16 to Thu 19: nothing logged.
    expect(missedInARow(s, '2026-11-19')).toBeGreaterThanOrEqual(2)
    expect(showComeback(s, '2026-11-19')).toBe(true)
    s.workouts = [{ id: 'w', d: '2026-11-18', entries: [] }]
    expect(missedInARow(s, '2026-11-19')).toBe(0)
    expect(showComeback(s, '2026-11-19')).toBe(false)
    s.workouts = [{ id: 'w', d: '2026-11-19', entries: [] }]
    expect(showComeback(s, '2026-11-19')).toBe(false)   // trained today
    s.workouts = []
    s.police.comebackOff = '2026-11-19'
    expect(showComeback(s, '2026-11-19')).toBe(false)   // waved off for today
  })
  it('never counts days before the plan started', () => {
    const s = plan()
    expect(missedInARow(s, '2026-11-09')).toBe(0)
  })
  it('asks the one question a week in, once, when signed in and training', () => {
    const s = plan()
    expect(showCheckin(s, '2026-11-19', true)).toBe(false)   // nothing trained yet
    s.workouts = [{ id: 'w', d: '2026-11-10', entries: [] }]
    expect(showCheckin(s, '2026-11-12', true)).toBe(false)   // under a week
    expect(showCheckin(s, '2026-11-19', true)).toBe(true)
    expect(showCheckin(s, '2026-11-19', false)).toBe(false)
    s.police.checkin = '2026-11-19'
    expect(showCheckin(s, '2026-11-19', true)).toBe(false)
  })
})
