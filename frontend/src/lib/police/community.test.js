import { describe, it, expect } from 'vitest'
import { stageOf, stageLabel, planFromRoutines, planLine, addFollowedPlan, ago } from './community.js'

describe('community rules', () => {
  it('shows the chosen stage, else passed once said, else applicant', () => {
    expect(stageOf({})).toBe('applicant')
    expect(stageOf({ afterTest: 'passed' })).toBe('passed')
    expect(stageOf({ stage: 'graduate', afterTest: 'passed' })).toBe('graduate')
    expect(stageOf({ stage: 'boss' })).toBe('applicant')
    expect(stageLabel('academy')).toBe('Academy')
  })
  it('makes a plan to share from routines: ids and numbers only', () => {
    const p = planFromRoutines([{ name: 'Legs', ex: [{ id: '0043', sets: 3, reps: 12, repsMin: 10, weight: 80, note: 'secret' }, { id: '0463', mode: 'time', sets: 3, sec: 60 }] }, { name: 'Empty', ex: [] }], ' My legs ', 'pro')
    expect(p).toEqual({ name: 'My legs', level: 'beginner', routines: [{ name: 'Legs', ex: [{ id: '0043', sets: 3, reps: 12, repsMin: 10 }, { id: '0463', sets: 3, mode: 'time', sec: 60 }] }] })
    expect(planFromRoutines([], 'x')).toBe(null)
    expect(planLine(p, 12)).toBe('Beginner · 1 session · 12 following')
  })
  it('adds a followed plan to your workouts once, weights empty', () => {
    const s = { routines: [{ id: 'mine', name: 'Mine', ex: [] }], police: {} }
    const plan = { name: 'Base', routines: [{ name: 'A', ex: [{ id: '0043', sets: 3, reps: 12, repsMin: 10 }] }, { name: 'Run', ex: [{ id: '0685', mode: 'cardio', sets: 1, min: 20 }] }] }
    const ids = addFollowedPlan(s, 'p1', plan)
    expect(s.routines.map(r => r.name)).toEqual(['Mine', 'A', 'Run'])
    expect(s.routines[1].ex[0]).toEqual({ id: '0043', sets: 3, reps: 12, repsMin: 10, prog: 'double', weight: 0 })
    expect(s.routines[2].emoji).toBe('figureRun')
    expect(addFollowedPlan(s, 'p1', plan)).toEqual(ids)
    expect(s.routines).toHaveLength(3)
  })
  it('tells the time since a post', () => {
    expect([ago(0, 30e3), ago(0, 5 * 60e3), ago(0, 3 * 3600e3), ago(0, 2 * 86400e3)]).toEqual(['now', '5 min', '3 h', '2 d'])
  })
})
