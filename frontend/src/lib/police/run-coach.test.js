import { describe, it, expect } from 'vitest'
import { checkInMinutes, checkInLine, statLines, intenseLine } from './run-coach.js'

describe('Hayden on a run', () => {
  it('checks in at 2, 5, 7, 10, then every 5', () => {
    expect(checkInMinutes(30)).toEqual([2, 5, 7, 10, 15, 20, 25])
    expect(checkInMinutes(8)).toEqual([2, 5, 7])
  })
  it('never says the same thing twice in a run', () => {
    const said = new Set()
    for (const m of checkInMinutes(60)) { const l = checkInLine({ cat: 'vo2', minute: m, said, totalMin: 60, seed: 7 }); expect(said.has(l)).toBe(false); said.add(l) }
    expect(said.size).toBe(checkInMinutes(60).length)
  })
  it('brings in your own numbers, and the countdown at the end', () => {
    const runLog = [{ run: 'vo2-4x4', at: '2026-11-07', min: 40, rpe: 8, km: 5.1 }, { run: 'easy-30', at: '2026-11-08', min: 30 }]
    const stats = statLines({ run: { id: 'vo2-4x4' }, runLog, today: '2026-11-09', minutesSoFar: 5 })
    expect(stats[0]).toMatch(/run number 3 this week.*75 minutes/)
    expect(stats.join(' ')).toMatch(/rated it 8 out of 10/)
    const line = checkInLine({ cat: 'vo2', minute: 5, stats, totalMin: 40, seed: 7 })
    expect(typeof line).toBe('string')
    expect(checkInLine({ cat: 'vo2', minute: 5, stats, totalMin: 40, seed: 7 })).toBe(line)
    expect(checkInLine({ cat: 'base', minute: 25, totalMin: 28 })).toBe('3 minutes to go. Finish strong!')
    expect(intenseLine('intervals', 1)).toBeTruthy()
  })
})
