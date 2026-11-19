// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { freshState } from '../../store/useStore.js'
import { installPlanIn } from './install-plan.js'
import { missedInARow, showComeback, showCheckin, visitPatch } from './comeback.js'

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
  it('asks the question only after 3+ days away, and at most once a week', () => {
    expect(visitPatch({}, '2026-11-10')).toEqual({ seenOn: '2026-11-10' })
    expect(visitPatch({ seenOn: '2026-11-10' }, '2026-11-10')).toBe(null)
    expect(visitPatch({ seenOn: '2026-11-10' }, '2026-11-12')).toEqual({ seenOn: '2026-11-12' })
    expect(visitPatch({ seenOn: '2026-11-12' }, '2026-11-15')).toEqual({ seenOn: '2026-11-15', askOn: '2026-11-15' })
    const s = plan()
    s.workouts = [{ id: 'w', d: '2026-11-10', entries: [] }]
    s.police.askOn = '2026-11-15'
    expect(showCheckin(s, '2026-11-15', true)).toBe(true)
    expect(showCheckin(s, '2026-11-16', true)).toBe(false)   // only on the day they came back
    expect(showCheckin(s, '2026-11-15', false)).toBe(false)
    s.police.askedOn = '2026-11-10'
    expect(showCheckin(s, '2026-11-15', true)).toBe(false)   // asked under a week ago
    s.police.askedOn = '2026-11-08'
    expect(showCheckin(s, '2026-11-15', true)).toBe(true)
  })
})
