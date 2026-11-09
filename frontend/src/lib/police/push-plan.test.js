import { describe, it, expect } from 'vitest'
import { buildPushPlan, nudgeBody, nudgeSettings } from './push-plan.js'
import { planStart } from './programme.js'

const P = { level: 'intermediate', testDate: '2026-12-06', testName: 'PCT', start: planStart(null, '2026-11-09'), nudge: { on: true, time: '06:45' } }

describe('planned reminders', () => {
  it('is off until switched on', () => {
    expect(buildPushPlan({ ...P, nudge: null }, '2026-11-09')).toEqual({ on: false })
    expect(nudgeSettings({ on: true, time: 'nope' })).toEqual({ on: true, time: '07:00' })
  })
  it('a nudge each morning with the session and the days left', () => {
    const plan = buildPushPlan(P, '2026-11-09', 'Australia/Sydney')
    expect(plan).toMatchObject({ on: true, tz: 'Australia/Sydney', built: '2026-11-09' })
    expect(plan.items).toHaveLength(10)
    expect(plan.items[0]).toMatchObject({ at: '2026-11-09 06:45', tag: 'bf-nudge' })
    expect(plan.items[0].body).toMatch(/27 days to your PCT\.$/)
    expect(nudgeBody(P, '2026-11-09')).toMatch(/^Chest/)
  })
  it('a nudge up to the test day, nothing after it', () => {
    const plan = buildPushPlan(P, '2026-12-01')
    expect(plan.items.map(i => i.tag).every(t => t === 'bf-nudge')).toBe(true)
    expect(plan.items.at(-1).at).toBe('2026-12-06 06:45')
  })
})
