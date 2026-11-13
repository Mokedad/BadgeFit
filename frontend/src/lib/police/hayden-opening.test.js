import { describe, it, expect } from 'vitest'
import { openingLine } from './hayden-opening.js'

describe('Hayden\'s opening', () => {
  it('greets by the time of day and first name, with the countdown and today', () => {
    const s = openingLine({ daysToTest: 23, today: { kind: 'run', title: 'Hill repeats', minutes: 36 }, todayRun: { name: 'Hill repeats', minutes: 36 } }, { name: 'Sam Lee', hour: 8, seed: 0 })
    expect(s).toMatch(/^Morning, Sam\./)
    expect(s).toContain('23 days')
    expect(s).toContain('Hill repeats, about 36 minutes')
  })
  it('names the gap to fix, and changes its wording with the seed', () => {
    const b = { daysToTest: 40, today: { kind: 'gym', title: 'Squats', minutes: 50 }, gaps: [{ pass: true, standard: 'Push-ups' }, { pass: false, standard: 'Beep test' }] }
    expect(openingLine(b, { seed: 1 })).toContain('fix is beep test')
    expect(openingLine(b, { seed: 1 })).not.toBe(openingLine(b, { seed: 2 }))
  })
  it('test week, test day, no date, rest day, done and after the test each have their own words', () => {
    expect(openingLine({ daysToTest: 3 }, {})).toMatch(/3 days/)
    expect(openingLine({ daysToTest: 0 }, {})).toContain('Test day')
    expect(openingLine({}, {})).toMatch(/build/i)
    expect(openingLine({ daysToTest: 20, today: { kind: 'rest' } }, {})).toContain('rest day')
    expect(openingLine({ daysToTest: 20, today: { kind: 'gym', title: 'Squats' } }, { done: true })).not.toContain('Squats')
    expect(openingLine({ afterTest: true }, { hour: 19 })).toMatch(/^Evening\..*academy/)
  })
})
