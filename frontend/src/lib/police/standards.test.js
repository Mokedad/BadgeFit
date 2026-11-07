import { describe, it, expect } from 'vitest'
import { STANDARDS, DEFAULT_BEEP_GOAL, BEEP_LEVELS, parseBeep, beepShuttles, beepDistance, evaluate, readiness, bestResult, latestResult, fmtResult } from './standards.js'

describe('beep test', () => {
  it('matches the shuttle table: speeds, seconds per shuttle', () => {
    expect(BEEP_LEVELS[0]).toEqual({ level: 1, shuttles: 7, speed: 8, secPerShuttle: 9 })
    expect(BEEP_LEVELS[1].secPerShuttle).toBe(8.47)
    expect(BEEP_LEVELS[8].speed).toBe(12)
    expect(BEEP_LEVELS[8].secPerShuttle).toBe(6)
  })
  it('parses level.shuttle without treating it as a decimal', () => {
    expect(parseBeep('7.5')).toEqual({ level: 7, shuttle: 5 })
    expect(parseBeep('8.10')).toEqual({ level: 8, shuttle: 10 })
    expect(parseBeep('6')).toEqual({ level: 6, shuttle: 1 })
    expect(parseBeep('1.9')).toBeNull() // level 1 has 7 shuttles
    expect(parseBeep('abc')).toBeNull()
  })
  it('orders 7.10 after 7.9 and counts distance', () => {
    expect(beepShuttles(parseBeep('7.10'))).toBeGreaterThan(beepShuttles(parseBeep('7.9')))
    expect(beepDistance(parseBeep('1.7'))).toBe(140)
    expect(beepDistance(parseBeep('2.8'))).toBe(300)
  })
})

describe('evaluate', () => {
  it('needs both hands over 30 kg for grip', () => {
    expect(evaluate('grip', { left: 32, right: 31 }).pass).toBe(true)
    expect(evaluate('grip', { left: 35, right: 28 }).pass).toBe(false)
    expect(evaluate('grip', { left: 35 })).toBeNull()
  })
  it('passes the agility run at 20 s or under', () => {
    expect(evaluate('illinois', 20).pass).toBe(true)
    expect(evaluate('illinois', 21.5).pass).toBe(false)
    expect(evaluate('illinois', 25).pct).toBe(80)
  })
  it('reads simple minimums', () => {
    expect(evaluate('pushups', 25).pass).toBe(true)
    expect(evaluate('pushups', 20)).toMatchObject({ pass: false, pct: 80 })
    expect(evaluate('bridge', 90).pass).toBe(true)
    expect(evaluate('jump', 29).pass).toBe(false)
  })
  it('judges the beep test against the chosen target', () => {
    // pass mark 7.1 by default
    expect(evaluate('beep', '7.1').pass).toBe(true)
    expect(evaluate('beep', '6.10').pass).toBe(false)
    expect(evaluate('beep', '7.4', '7.5').pass).toBe(false)
    expect(evaluate('beep', '8.1', DEFAULT_BEEP_GOAL).pass).toBe(true)
  })
})

describe('readiness', () => {
  const results = [
    { id: 'pushups', v: 18, at: '2026-01-01' },
    { id: 'pushups', v: 27, at: '2026-02-01' },
    { id: 'illinois', v: 19.2, at: '2026-02-01' },
    { id: 'illinois', v: 22, at: '2026-01-01' },
    { id: 'bridge', v: 45, at: '2026-02-01' },
  ]
  it('uses the latest attempt and finds the weakest standard', () => {
    const r = readiness(results)
    expect(r.passed).toBe(2)
    expect(r.total).toBe(STANDARDS.length)
    // untested standards count as 0 and are the weakest
    expect(r.weakest.id).toBe('grip')
  })
  it('best and latest', () => {
    expect(bestResult(results, 'illinois').v).toBe(19.2)
    expect(latestResult(results, 'pushups').v).toBe(27)
  })
  it('formats', () => {
    expect(fmtResult('grip', { left: 30, right: 32 })).toBe('L 30 / R 32 kg')
    expect(fmtResult('pushups', 25)).toBe('25 reps')
  })
})
