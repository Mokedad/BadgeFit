import { describe, it, expect } from 'vitest'
import { shouldAutoListen } from './hands-free-rule.js'

describe('when Hayden listens on his own', () => {
  it('with headphones in, unless tapped off', () => {
    expect(shouldAutoListen({ setting: undefined, headphones: true })).toBe(true)
    expect(shouldAutoListen({ setting: true, headphones: true })).toBe(true)
    expect(shouldAutoListen({ setting: false, headphones: true })).toBe(false)
  })
  it('not without headphones on the phone', () => {
    expect(shouldAutoListen({ setting: undefined, headphones: false })).toBe(false)
    expect(shouldAutoListen({ setting: true, headphones: false })).toBe(false)
  })
  it('as before where the phone cannot tell, and never without recognition', () => {
    expect(shouldAutoListen({ setting: undefined, headphones: null })).toBe(true)
    expect(shouldAutoListen({ setting: undefined, headphones: true, recognition: false })).toBe(false)
  })
})
