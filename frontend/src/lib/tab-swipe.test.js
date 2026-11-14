import { describe, it, expect } from 'vitest'
import { swipeStep, swipeTarget } from './tab-swipe.js'

const sw = o => swipeStep({ dx: 0, dy: 0, ms: 200, startX: 200, width: 390, ...o })

describe('tab swipe', () => {
  it('a quick sideways swipe steps one tab; left goes right', () => {
    expect(sw({ dx: -120 })).toBe(1)
    expect(sw({ dx: 120 })).toBe(-1)
  })
  it('ignores short, slow, slanted and edge touches', () => {
    expect(sw({ dx: -40 })).toBe(0)
    expect(sw({ dx: -120, ms: 1200 })).toBe(0)
    expect(sw({ dx: -120, dy: 90 })).toBe(0)
    expect(sw({ dx: 120, startX: 10 })).toBe(0)       // the back swipe's
    expect(sw({ dx: -120, startX: 380 })).toBe(0)
  })
  it('moves between the app tabs and stops at the ends', () => {
    expect(swipeTarget('/home', '', 1)).toEqual({ path: '/plan', search: '' })
    expect(swipeTarget('/plan', '', -1)).toEqual({ path: '/home', search: '' })
    expect(swipeTarget('/home', '', -1)).toBe(null)
    expect(swipeTarget('/library', '', 1)).toBe(null)
    expect(swipeTarget('/settings', '', 1)).toBe(null)
    expect(swipeTarget('/home', '', 0)).toBe(null)
  })
  it('BadgeFit\'s one bar: Today, Plan, the test, More, and no further', () => {
    expect(swipeTarget('/home', '', 1, true)).toEqual({ path: '/police', search: '?tab=plan' })
    expect(swipeTarget('/police', '?tab=plan', 1, true)).toEqual({ path: '/police', search: '?tab=tests' })
    expect(swipeTarget('/police', '?tab=plan', -1, true)).toEqual({ path: '/home', search: '' })
    expect(swipeTarget('/police', '?tab=more', 1, true)).toBe(null)
    // A page under More: a swipe either way goes back to More.
    const more = { path: '/police', search: '?tab=more', back: true }
    expect(swipeTarget('/police', '?tab=strength', -1, true)).toEqual(more)
    expect(swipeTarget('/police', '?tab=today', 1, true)).toEqual(more) // Hayden's page
    expect(swipeTarget('/stats', '', 1, true)).toEqual(more)
    expect(swipeTarget('/library', '', -1, true)).toEqual(more)
    expect(swipeTarget('/workout', '', 1, true)).toBe(null)
  })
  it('moves between the BadgeFit hub tabs', () => {
    expect(swipeTarget('/police', '', 1)).toEqual({ path: '/police', search: '?tab=plan' })
    expect(swipeTarget('/police', '?tab=plan', -1)).toEqual({ path: '/police', search: '' })
    expect(swipeTarget('/police', '?tab=more', 1)).toBe(null)
    expect(swipeTarget('/police', '?tab=food', 1)).toBe(null) // a page under More: not a tab
  })
})

import { swipeStep as ss } from './tab-swipe.js'
describe('BadgeFit: top of the screen only', () => {
  it('changes tab from the title, not from the middle or the bottom', () => {
    const base = { dx: -120, dy: 4, ms: 200, startX: 200, width: 390, top: 170 }
    expect(ss({ ...base, startY: 90 })).toBe(1)
    expect(ss({ ...base, startY: 400 })).toBe(0)
    expect(ss({ ...base, startY: 780 })).toBe(0)
  })
})

describe('BadgeFit: an easy swipe', () => {
  it('a shorter, slower, less straight swipe counts, from the edge too', () => {
    expect(ss({ dx: 55, dy: 30, ms: 900, startX: 10, width: 390, easy: true, edges: true })).toBe(-1)
    expect(ss({ dx: 55, dy: 30, ms: 900, startX: 10, width: 390 })).toBe(0)
    expect(ss({ dx: 30, dy: 0, ms: 200, startX: 200, width: 390, easy: true })).toBe(0)
    expect(ss({ dx: 80, dy: 70, ms: 200, startX: 200, width: 390, easy: true })).toBe(0)
  })
})
