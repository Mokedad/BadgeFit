import { describe, it, expect } from 'vitest'
import { ensureRunRoutine, isRunRoutine, runForRoutine } from './run-routines.js'

describe('runs on a day', () => {
  it('a picked run becomes one routine, made once', () => {
    const s = { routines: [], police: { level: 'beginner' } }
    const id = ensureRunRoutine(s, 'vo2-4x4')
    expect(s.routines).toHaveLength(1)
    expect(s.routines[0]).toMatchObject({ id, name: '4×4 intervals', emoji: 'figureRun' })
    expect(s.routines[0].ex[0].mode).toBe('cardio')
    expect(ensureRunRoutine(s, 'vo2-4x4')).toBe(id)
    expect(s.routines).toHaveLength(1)
    expect(ensureRunRoutine(s, 'nope')).toBeNull()
  })
  it('knows which routines are runs, and opens the right run', () => {
    const s = { routines: [], police: { level: 'intermediate', start: '2026-11-09', testDate: '2026-12-06', keys: { vo2: 'r-vo2', chest: 'r-chest' } } }
    const id = ensureRunRoutine(s, 'easy-45')
    expect(isRunRoutine(s.police, id)).toBe(true)
    expect(isRunRoutine(s.police, 'r-vo2')).toBe(true)
    expect(isRunRoutine(s.police, 'r-chest')).toBe(false)
    expect(runForRoutine(s.police, id, '2026-11-10').id).toBe('easy-45')
    expect(runForRoutine(s.police, 'r-vo2', '2026-11-10').cat).toBe('vo2')
    expect(runForRoutine(s.police, 'r-chest', '2026-11-10')).toBeNull()
  })
})
