import { describe, it, expect } from 'vitest'
import { pickSurprise, gearGained, TIPS, GEAR_NAMES } from './surprise.js'
import { ICON_NAMES } from '../../components/Icon.jsx'

describe('the surprise after a workout', () => {
  it('celebrates gear first', () => {
    expect(pickSurprise({ newGear: ['headband'], bests: ['squat'], sessions: 10 })).toEqual({ kind: 'gear', icon: 'gift', gear: 'headband', title: 'New for your Hayden: Sweatband', sub: 'For training 4 weeks.' })
  })

  it('then a new best', () => {
    expect(pickSurprise({ bests: ['barbell squat'], sessions: 10 }).title).toBe('New best: Barbell squat')
    const many = pickSurprise({ bests: ['squat', 'bench press', 'row', 'deadlift'] })
    expect(many.title).toBe('4 new bests')
    expect(many.sub).toBe('Squat, Bench press, Row and more')
  })

  it('then a round number of sessions', () => {
    expect(pickSurprise({ sessions: 1 }).title).toBe('First session done')
    expect(pickSurprise({ sessions: 25 }).title).toBe('25 sessions done')
  })

  it('else one of Hayden\'s tips, a different one as the sessions add up', () => {
    const a = pickSurprise({ sessions: 7 }), b = pickSurprise({ sessions: 8 })
    expect(a.kind).toBe('tip')
    expect(TIPS).toContain(a.sub)
    expect(a.sub).not.toBe(b.sub)
  })

  it('only ever names gear it knows, with real icons', () => {
    expect(pickSurprise({ newGear: ['santa'], sessions: 3 }).kind).toBe('tip')
    for (const s of [pickSurprise({ newGear: ['bolt'] }), pickSurprise({ bests: ['x'] }), pickSurprise({ sessions: 5 }), pickSurprise({ sessions: 6 })]) expect(ICON_NAMES).toContain(s.icon)
    expect(Object.keys(GEAR_NAMES)).toContain('cap')
  })

  it('finds the gear a session added', () => {
    expect(gearGained(['headband'], ['headband', 'whistle'])).toEqual(['whistle'])
    expect(gearGained([], [])).toEqual([])
  })

  it('writes plain English with no dashes in the tips', () => {
    for (const t of TIPS) expect(t).not.toMatch(/—/)
  })
})
