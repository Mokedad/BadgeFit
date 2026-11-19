// @vitest-environment happy-dom
// "Share my week": this week's seven days as gym, run or rest, and its gym sessions to try.
import { describe, it, expect } from 'vitest'
import { freshState } from '../store/useStore.js'
import { installPlanIn } from '../lib/police/install-plan.js'
import { weekToShare } from './ShareWeek.jsx'

describe('Share my week', () => {
  it('reads the week from the plan as it stands, a day per block', () => {
    const s = freshState()
    s.police = { level: 'beginner' }
    installPlanIn(s, { level: 'beginner', today: '2026-11-16' })
    const { week, routines } = weekToShare(s, '2026-11-19')
    expect(week.label).toBe('Week 1 of 12')
    expect(week.days).toHaveLength(7)
    expect(week.days.every(d => ['gym', 'run', 'rest'].includes(d.k))).toBe(true)
    expect(week.days.filter(d => d.k === 'gym').length).toBe(routines.length)
    // A day changed to rest is shared as rest.
    s.dayPlan = { ...(s.dayPlan || {}), '2026-11-16': 'rest' }
    expect(weekToShare(s, '2026-11-19').week.days[0]).toEqual({ k: 'rest', name: 'Rest' })
  })
})
