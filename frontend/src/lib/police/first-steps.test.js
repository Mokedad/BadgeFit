import { describe, it, expect } from 'vitest'
import { firstStepsView, seenPatch, PAGE_INTRO, comfort } from './first-steps.js'

const S = (police, workouts = []) => ({ police: { start: '2026-11-09', ...police }, workouts })

describe('the first steps', () => {
  it('nothing done: four to try, the first session next', () => {
    const v = firstStepsView(S({}))
    expect([v.done, v.total, v.next.id]).toEqual([0, 4, 'session'])
  })
  it('a session and two places seen: one left', () => {
    const v = firstStepsView(S({ seen: { hayden: 1, plan: 1 } }, [{ d: '2026-11-10' }]))
    expect([v.done, v.next.id]).toEqual([3, 'tests'])
  })
  it('all four done, or no plan yet: no strip', () => {
    expect(firstStepsView(S({ seen: { hayden: 1, plan: 1, tests: 1 } }, [{ d: '2026-11-10' }]))).toBe(null)
    expect(firstStepsView({ police: {}, workouts: [] })).toBe(null)
  })
  it('ticks a place once, and only real places', () => {
    expect(seenPatch({ start: 'x' }, 'plan')).toEqual({ seen: { plan: 1 } })
    expect(seenPatch({ start: 'x', seen: { plan: 1 } }, 'plan')).toBe(null)
    expect(seenPatch({ start: 'x' }, 'session')).toBe(null)
    expect(seenPatch({ start: 'x' }, 'nowhere')).toBe(null)
    expect(seenPatch({}, 'plan')).toBe(null)
  })
  it('the simple plan first: the rest opens after five sessions, or for someone who asked', () => {
    expect(comfort(S({ level: 'beginner' }, [{}, {}]))).toEqual({ sessions: 2, need: 5, ready: false })
    expect(comfort(S({ level: 'beginner' }, [{}, {}, {}, {}, {}, {}])).ready).toBe(true)
    expect(comfort(S({ level: 'intermediate' })).ready).toBe(true)
    expect(comfort(S({ level: 'beginner', planChoice: 'run' })).ready).toBe(true)
    expect(comfort(S({ level: 'beginner', planChoice: 'badgefit' })).ready).toBe(false)
    expect(comfort(S({ level: 'beginner', seen: { full: 1 } })).ready).toBe(true)
    expect(seenPatch({ start: 'x' }, 'full')).toEqual({ seen: { full: 1 } })
  })
  it('every intro is one short plain line', () => {
    for (const line of Object.values(PAGE_INTRO)) { expect(line.length).toBeLessThan(100); expect(line).not.toMatch(/VO2|zone 2|RPE|hypertrophy/i) }
  })
})
