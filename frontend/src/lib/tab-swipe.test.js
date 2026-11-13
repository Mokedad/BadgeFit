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
    expect(swipeTarget('/police', '?tab=strength', -1, true)).toBe(null) // a page under More
    expect(swipeTarget('/stats', '', 1, true)).toBe(null)
  })
  it('moves between the BadgeFit hub tabs', () => {
    expect(swipeTarget('/police', '', 1)).toEqual({ path: '/police', search: '?tab=plan' })
    expect(swipeTarget('/police', '?tab=plan', -1)).toEqual({ path: '/police', search: '' })
    expect(swipeTarget('/police', '?tab=more', 1)).toBe(null)
    expect(swipeTarget('/police', '?tab=food', 1)).toBe(null) // a page under More: not a tab
  })
})
