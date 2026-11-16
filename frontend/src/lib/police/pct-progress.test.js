import { describe, it, expect } from 'vitest'
import { gapText, trendLine } from './pct-progress.js'

describe('PCT progress', () => {
  it('says what is left to pass', () => {
    expect(gapText('pushups', 19)).toBe('6 more push-ups to pass')
    expect(gapText('pushups', 24)).toBe('1 more push-up to pass')
    expect(gapText('illinois', 21.4)).toBe('1.4 seconds faster to pass')
    expect(gapText('grip', { left: 31, right: 27 })).toBe('3 more kg to pass')
    expect(gapText('beep', '6.9', '7.1')).toBe('2 more shuttles to pass')
    expect(gapText('pushups', 30)).toBe('')
    expect(gapText('pushups', null)).toBe('')
  })
  it('draws attempts oldest first with the pass mark, rising when better', () => {
    const t = trendLine([{ id: 'pushups', v: 20, at: '2026-11-10' }, { id: 'pushups', v: 10, at: '2026-11-01' }, { id: 'pushups', v: 26, at: '2026-11-15' }], 'pushups')
    expect(t.dots.map(d => d.pass)).toEqual([false, false, true])
    expect(t.dots[0].y).toBeGreaterThan(t.dots[2].y)
    expect(t.passY).toBeGreaterThan(t.dots[2].y)
    expect(t.path.startsWith('M8 ')).toBe(true)
  })
  it('flips a timed course so faster is up, and needs two attempts', () => {
    const t = trendLine([{ id: 'illinois', v: 23, at: '2026-11-01' }, { id: 'illinois', v: 19.5, at: '2026-11-08' }], 'illinois')
    expect(t.dots[1].y).toBeLessThan(t.dots[0].y)
    expect(trendLine([{ id: 'illinois', v: 23, at: '2026-11-01' }], 'illinois')).toBe(null)
  })
})
