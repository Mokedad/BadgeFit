import { describe, it, expect } from 'vitest'
import { mondayOf, weekDays, shareKind } from './week-edit.js'

describe('the Week view', () => {
  it('finds the week a day is in, and the weeks around it', () => {
    expect(mondayOf('2026-11-19')).toBe('2026-11-16')
    expect(mondayOf('2026-11-22')).toBe('2026-11-16')
    expect(mondayOf('2026-11-19', 1)).toBe('2026-11-23')
    expect(weekDays('2026-11-16')).toEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'])
  })
  it('shares walks as runs', () => {
    expect(['gym', 'run', 'walk', 'rest'].map(shareKind)).toEqual(['gym', 'run', 'run', 'rest'])
  })
})
