import { describe, it, expect } from 'vitest'
import { cardModel, wrapLines } from './share-card.js'

describe('the BadgeFit share card', () => {
  it('says what the session was, how long, and the countdown', () => {
    const m = cardModel({ title: 'Hill repeats', minutes: 36.4, km: 4.26, daysToTest: 23, week: 2, weeks: 5 })
    expect(m.title).toBe('Hill repeats')
    expect(m.facts).toBe('36 min  ·  4.3 km')
    expect(m.count).toBe('23')
    expect(m.countLabel).toBe('days to my PCT')
    expect(m.week).toBe('Week 2 of 5')
  })
  it('leaves out what it does not know, and never a place', () => {
    const m = cardModel({ title: 'Squats & Push Power' })
    expect(m.facts).toBe('')
    expect(m.count).toBe(null)
    expect(m.week).toBe(null)
    expect(JSON.stringify(m)).not.toMatch(/lat|lng|route/i)
  })
  it('one day, and test day, read right', () => {
    expect(cardModel({ daysToTest: 1 }).countLabel).toBe('day to my PCT')
    expect(cardModel({ daysToTest: 0, testName: 'PAT' }).countLabel).toBe('PAT today')
    expect(cardModel({ daysToTest: -3 }).count).toBe(null)
  })
  it('wraps a long title to the width', () => {
    expect(wrapLines('Arms, Back, Shoulders & Abs', t => t.length * 10, 120)).toEqual(['Arms, Back,', 'Shoulders &', 'Abs'])
  })
})
