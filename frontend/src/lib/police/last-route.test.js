import { describe, it, expect } from 'vitest'
import { restoreTarget, rememberable } from './last-route.js'

describe('back on the same screen after iOS restarts the app', () => {
  it('goes back within 10 minutes, to a real screen, from the start screen only', () => {
    expect(restoreTarget({ h: '#/police?tab=plan', at: 1000 }, '#/home', 1000 + 60000)).toBe('#/police?tab=plan')
    expect(restoreTarget({ h: '#/workout', at: 1000 }, '', 2000)).toBe('#/workout')
    expect(restoreTarget({ h: '#/police?tab=plan', at: 1000 }, '#/home', 1000 + 11 * 60000)).toBe(null)
    expect(restoreTarget({ h: '#/police?tab=plan', at: 1000 }, '#/stats', 2000)).toBe(null)
    expect(restoreTarget(null, '#/home', 2000)).toBe(null)
  })
  it('never to Home itself or the sign-in screens', () => {
    expect(rememberable('#/home')).toBe(false)
    expect(rememberable('#/login')).toBe(false)
    expect(rememberable('#/link-app')).toBe(false)
    expect(rememberable('#/community')).toBe(true)
  })
})
