import { describe, it, expect } from 'vitest'
import { botCard, sessionsThisWeek, weeksInARow } from './bot-card.js'

const NOW = new Date('2026-11-14T10:00:00')   // a Saturday; the week began Monday 9th
const S = { workouts: [{ d: '2026-11-10' }, { d: '2026-11-12' }, { d: '2026-11-04' }, { d: '2026-10-28' }, { d: '2026-10-14' }], police: {} }

describe("what a member's bot shares", () => {
  it('counts this week and the weeks in a row', () => {
    expect(sessionsThisWeek(S, NOW)).toBe(2)
    expect(weeksInARow(S, NOW)).toBe(3)
    expect(weeksInARow({ workouts: [{ d: '2026-11-04' }] }, NOW)).toBe(1)
  })
  it('a first name, a colour and the numbers, nothing more', () => {
    const c = botCard(S, { id: 'u1', name: 'Mo Ke' }, NOW)
    expect(Object.keys(c).sort()).toEqual(['colour', 'gear', 'name', 'stats'])
    expect(c.name).toBe('Mo')
    expect(c.colour).toMatch(/^#[0-9a-f]{6}$/i)
    expect(c.stats).toEqual({ week: 2, ready: 0, streak: 3 })
  })
})
