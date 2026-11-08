import { describe, it, expect } from 'vitest'
import { checkinCall, adjustNote, checkinLine, addCheckin, isCheckin } from './checkin.js'

const gym = { kind: 'gym' }, run = { kind: 'run' }, rest = { kind: 'rest' }
describe('morning check-in', () => {
  it('reads go, easy or light', () => {
    expect(checkinCall({ sleep: 3, sore: 3, energy: 3 })).toBe('go')
    expect(checkinCall({ sleep: 3, sore: 1, energy: 3 })).toBe('easy') // very sore is never go
    expect(checkinCall({ sleep: 2, sore: 2, energy: 2 })).toBe('easy')
    expect(checkinCall({ sleep: 1, sore: 2, energy: 1 })).toBe('light')
    expect(checkinCall({ sleep: 4, sore: 2, energy: 2 })).toBeNull()
    expect(isCheckin(null)).toBe(false)
  })
  it('adjusts the day', () => {
    expect(adjustNote(gym, 'easy')).toMatch(/half the sets/)
    expect(adjustNote(run, 'light')).toMatch(/20 minute walk/)
    expect(adjustNote(rest, 'go')).toBe('')
    expect(adjustNote({ kind: 'test' }, 'go')).toBe('')
    expect(checkinLine({ sleep: 1, sore: 1, energy: 1 }, gym)).toMatch(/^Rough morning\..*Light day/)
  })
  it('keeps the last 21 days', () => {
    let all = {}
    for (let d = 1; d <= 25; d++) all = addCheckin(all, `2026-11-${String(d).padStart(2, '0')}`, { sleep: 2, sore: 2, energy: 2 })
    expect(Object.keys(all)).toHaveLength(21)
    expect(all['2026-11-25']).toBeTruthy()
    expect(all['2026-11-01']).toBeUndefined()
  })
})
