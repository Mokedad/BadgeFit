import { describe, it, expect } from 'vitest'
import { crewCard, crewLine, lastTrained, crewDate, crewDateLong, crewAgo, initialOf } from './crew.js'

const S = { workouts: [{ d: '2026-11-20', name: 'Full Body A' }, { d: '2026-11-22', name: 'Arms' }], police: { testDate: '2026-12-06', results: [], runLog: [{ at: '2026-11-23', run: { name: 'Easy run' } }] } }

describe('your crew card', () => {
  it('is the test date, a first name, the ring and the last day trained', () => {
    const c = crewCard(S, { id: 'u1', name: 'Jess Park' }, new Date('2026-11-23T10:00:00+11:00'))
    expect(c.test).toBe('2026-12-06')
    expect(c.name).toBe('Jess')
    expect(c.last).toBe('2026-11-23')
    expect(c.title).toBe('Easy run')
    expect(c.ready).toBeGreaterThanOrEqual(0)
    expect(typeof c.tz).toBe('number')
  })
  it('is nothing without a test date', () => {
    expect(crewCard({ ...S, police: {} }, { name: 'Jess' })).toBe(null)
  })
  it('is nothing on the Academy path, whose date is the Academy start', () => {
    expect(crewCard({ ...S, police: { ...S.police, track: 'academy' } }, { name: 'Jess' })).toBe(null)
  })
  it('picks the later of a workout and a run', () => {
    expect(lastTrained({ workouts: [{ d: '2026-11-24', name: 'Legs' }], police: { runLog: [{ at: '2026-11-23' }] } })).toEqual({ last: '2026-11-24', title: 'Legs' })
    expect(lastTrained({})).toBe(null)
  })
})

describe('the line on Home', () => {
  it('names who trained today, and says so when nobody has', () => {
    expect(crewLine([{ name: 'Jess', today: true }, { name: 'Moke', today: true }, { name: 'Tom' }])).toBe('Jess and Moke trained today')
    expect(crewLine([{ name: 'Jess', today: true }, { name: 'Moke', today: true }, { name: 'Tom', today: true }])).toBe('Jess, Moke and 1 more trained today')
    expect(crewLine([{ name: 'Tom' }, { name: 'Ava' }])).toBe('Nobody has trained yet today')
    expect(crewLine([{ name: 'Tom' }])).toBe('Tom is testing with you')
    expect(crewLine([])).toBe('')
  })
  it('says the date short', () => {
    expect(crewDate('2026-12-06')).toMatch(/6 Dec/)
  })
})

describe('the crew sheet says it short', () => {
  it('the date in full, the last day as yesterday or days ago, a letter each', () => {
    expect(crewDateLong('2026-12-06')).toMatch(/6 December/)
    expect(crewAgo('2026-11-22', '2026-11-23')).toBe('Yesterday')
    expect(crewAgo('2026-11-21', '2026-11-23')).toBe('2 days ago')
    expect(crewAgo('2026-11-10', '2026-11-23')).toMatch(/^Last 10 Nov/)
    expect(crewAgo(null, '2026-11-23')).toBe('Not started yet')
    expect(initialOf('jess')).toBe('J')
    expect(initialOf('')).toBe('?')
  })
})
