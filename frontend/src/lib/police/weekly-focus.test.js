import { describe, it, expect } from 'vitest'
import { weeklyFocus } from './weekly-focus.js'

const base = { level: 'intermediate', start: '2026-11-09', testDate: '2026-12-06', testName: 'PCT' }
const results = [
  { id: 'grip', v: { left: 40, right: 42 }, at: '2026-11-09' },
  { id: 'pushups', v: 18, at: '2026-11-09' },
  { id: 'bridge', v: 95, at: '2026-11-09' },
  { id: 'jump', v: 28, at: '2026-11-09' },
  { id: 'illinois', v: 19.5, at: '2026-11-09' },
  { id: 'beep', v: '6.2', at: '2026-11-09' },
]

describe('weeklyFocus', () => {
  it('week 1 of 4: the three biggest gaps, with what trains them', () => {
    const f = weeklyFocus({ ...base, results }, '2026-11-09')
    expect(f).toMatchObject({ days: 27, week: 1, last: 4, final: false })
    expect(f.items).toHaveLength(3)
    expect(f.items[0].detail).toMatch(/^Train: /)
  })
  it('narrows as the test gets closer: two, then one, then nothing new', () => {
    expect(weeklyFocus({ ...base, results }, '2026-11-16').items).toHaveLength(2)
    const w3 = weeklyFocus({ ...base, results }, '2026-11-23')
    expect(w3.items).toHaveLength(1)
    expect(w3.headline).toMatch(/One thing to nail/)
    const fin = weeklyFocus({ ...base, results }, '2026-12-01')
    expect(fin.final).toBe(true)
    expect(fin.headline).toMatch(/Nothing new now/)
  })
  it('an untested standard comes first', () => {
    expect(weeklyFocus(base, '2026-11-09').items[0].title).toBe('Test day baseline')
  })
})
