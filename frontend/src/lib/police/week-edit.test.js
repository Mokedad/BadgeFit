import { describe, it, expect } from 'vitest'
import { mondayOf, weekDays, moveDay, moveLine, shareKind } from './week-edit.js'

describe('the Week view', () => {
  it('finds the week a day is in, and the weeks around it', () => {
    expect(mondayOf('2026-11-19')).toBe('2026-11-16')
    expect(mondayOf('2026-11-22')).toBe('2026-11-16')
    expect(mondayOf('2026-11-19', 1)).toBe('2026-11-23')
    expect(weekDays('2026-11-16')).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'])
  })
  it('moves a session to another day and puts that day\'s in its place', () => {
    const plan = { '2026-11-20': ['run'], '2026-11-21': [], '2026-11-22': ['long'] }
    const idsOf = d => plan[d] || []
    const s = { dayPlan: {} }
    expect(moveDay(s, '2026-11-20', '2026-11-21', idsOf)).toEqual(['2026-11-20', '2026-11-21'])
    expect(s.dayPlan).toEqual({ '2026-11-21': 'run', '2026-11-20': 'rest' })
    const t = { dayPlan: {} }
    moveDay(t, '2026-11-20', '2026-11-22', idsOf)
    expect(t.dayPlan).toEqual({ '2026-11-22': 'run', '2026-11-20': 'long' })
    expect(moveDay(t, '2026-11-20', '2026-11-20', idsOf)).toEqual([])
    expect(moveDay({}, '2026-11-21', '2026-11-23', idsOf)).toEqual([])
  })
  it('says what happens in plain words', () => {
    expect(moveLine('Steady run', 'Rest', 'Saturday', 'Friday')).toBe('Saturday was rest, so Friday becomes rest.')
    expect(moveLine('Steady run', 'Long run', 'Sunday', 'Friday')).toBe('Long run moves to Friday, so nothing is lost.')
    expect(['gym', 'run', 'walk', 'rest'].map(shareKind)).toEqual(['gym', 'run', 'run', 'rest'])
  })
})
