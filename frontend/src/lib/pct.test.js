// The police fitness test on the app side: saving a test day and the test-day notification.
import { describe, expect, it } from 'vitest'
import { saveResult, removeResult, fitnessStatus, fmtTest, buildTestDayNotification, TEST_DAY_ID } from './pct.js'

describe('saveResult', () => {
  it('keeps one entry per day, drops empty fields and cleans the beep level', () => {
    const s = {}
    expect(saveResult(s, '2026-11-04', { beep: '5,8', plank: '95', vjump: '', pushups: 22, bw: 91.04 })).toBe(true)
    expect(s.fitnessTest.results).toEqual([{ d: '2026-11-04', beep: '5.8', plank: 95, pushups: 22, bw: 91 }])
    saveResult(s, '2026-11-04', { beep: '6.1' })
    expect(s.fitnessTest.results).toEqual([{ d: '2026-11-04', beep: '6.1' }])
    expect(saveResult(s, '2026-11-05', { beep: '' })).toBe(false)
    removeResult(s, '2026-11-04')
    expect(s.fitnessTest.results).toEqual([])
  })
  it('a new profile starts on the NSW standard, every two weeks', () => {
    const s = {}
    saveResult(s, '2026-11-04', { pushups: 30 })
    const st = fitnessStatus(s.fitnessTest, '2026-11-11')
    expect(st.standard).toBe('NSW Police PCT')
    expect(st.nextTest).toBe('2026-11-18')
    expect(st.tests.find(x => x.test === 'pushups').pass).toBe(true)
  })
})

describe('fmtTest', () => {
  it('shows a level as level.shuttle and the rest with units', () => {
    expect(fmtTest('beep', '7.10')).toBe('7.10')
    expect(fmtTest('plank', 90)).toBe('90 s')
    expect(fmtTest('vjump', null)).toBe('–')
  })
})

describe('buildTestDayNotification', () => {
  const now = new Date(2026, 10, 11, 9)
  it('one notification on the next test date at the given time', () => {
    const S = { fitnessTest: { standard: 'nsw', every: 7, results: [{ d: '2026-11-10', beep: '5.8' }] } }
    const [n] = buildTestDayNotification(S, now, '07:30')
    expect(n.id).toBe(TEST_DAY_ID)
    expect([n.schedule.at.getDate(), n.schedule.at.getHours(), n.schedule.at.getMinutes()]).toEqual([17, 7, 30])
  })
  it('nothing before a first test, when switched off, or when the date has passed', () => {
    expect(buildTestDayNotification({ fitnessTest: { standard: 'nsw', results: [] } }, now)).toEqual([])
    expect(buildTestDayNotification({ fitnessTest: { standard: 'nsw', off: true, results: [{ d: '2026-11-10', beep: '5.8' }] } }, now)).toEqual([])
    expect(buildTestDayNotification({ fitnessTest: { standard: 'nsw', every: 7, results: [{ d: '2026-10-01', beep: '5.8' }] } }, now)).toEqual([])
  })
})
