import { describe, it, expect } from 'vitest'
import { topPicks, pickCounts, CAT_ICON } from './start-picks.js'
import { CATEGORIES } from './runs.js'
import { ICON_NAMES } from '../../components/Icon.jsx'

const ids = r => r.picks.map(p => p.id)

describe('start picks', () => {
  it('has a real icon for every kind of run', () => {
    for (const c of CATEGORIES) expect(ICON_NAMES).toContain(CAT_ICON[c.id])
  })

  it('puts today first and lights it while it is still to do', () => {
    const r = topPicks({}, { today: { kind: 'gym', done: false } })
    expect(ids(r)).toEqual(['today', 'run', 'beep', 'gym'])
    expect(r.lit).toBe('today')
    expect(r.picks[0].icon).toBe('dumbbell')
  })

  it('draws a run day with the runner', () => {
    expect(topPicks({}, { today: { kind: 'run' } }).picks[0].icon).toBe('figureRun')
  })

  it('leaves today out once it is done, and lights nothing', () => {
    const r = topPicks({}, { today: { kind: 'gym', done: true } })
    expect(ids(r)).toEqual(['run', 'beep', 'gym', 'walk'])
    expect(r.lit).toBe(null)
  })

  it('suggests a walk on a rest day', () => {
    expect(topPicks({}, { today: null }).lit).toBe('walk')
  })

  it('orders the rest by what was done most', () => {
    const S = { workouts: [{}, {}, {}], police: { runLog: [{ run: 'walk-20' }, { run: 'walk-30' }, { run: 'easy-30' }] } }
    expect(pickCounts(S)).toEqual({ run: 1, beep: 0, gym: 3, walk: 2 })
    expect(ids(topPicks(S, {}))).toEqual(['gym', 'walk', 'run', 'beep'])
  })

  it('counts beep test results as beep tests', () => {
    const S = { police: { results: [{ id: 'beep', v: '7.1' }, { id: 'pushups', v: 20 }] } }
    expect(pickCounts(S).beep).toBe(1)
    expect(ids(topPicks(S, {}))[0]).toBe('beep')
  })

  it('keeps a guest to the simple plan: no Gym button', () => {
    expect(ids(topPicks({ workouts: [{}, {}] }, { guest: true }))).not.toContain('gym')
  })
})
