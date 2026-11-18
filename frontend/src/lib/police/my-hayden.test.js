import { describe, it, expect } from 'vitest'
import { gearShelf, SHELF } from './my-hayden.js'
import { myColour, lineColour, LINE_COLOURS, GUEST_COLOUR, weeksTrained } from './bot-look.js'

const weeksAgo = n => new Date(Date.now() - n * 7 * 864e5).toISOString().slice(0, 10)
const sessions = n => Array.from({ length: n }, (_, i) => ({ id: 'w' + i, d: weeksAgo(i) }))

describe('My Hayden', () => {
  it('starts with nothing earned and the sweatband next', () => {
    const shelf = gearShelf({ workouts: sessions(2), police: {} })
    expect(shelf.map(i => i.id)).toEqual(SHELF.map(i => i.id))
    expect(shelf.every(i => !i.earned)).toBe(true)
    expect(shelf.find(i => i.next).id).toBe('headband')
    expect(shelf[0].progress).toEqual({ pct: 50, text: '2 of 4 weeks' })
  })

  it('moves on as gear is earned, and says how close the next one is', () => {
    const S = { workouts: sessions(4), police: { results: [{ id: 'pushups', v: 20, at: '2026-11-01' }, { id: 'beep', v: '6.4', at: '2026-11-01' }] } }
    const shelf = gearShelf(S)
    expect(shelf.find(i => i.id === 'headband').earned).toBe(true)
    expect(shelf.find(i => i.next).id).toBe('whistle')
    expect(shelf.find(i => i.id === 'whistle').progress.text).toBe('Closest: beep 87%')
    expect(shelf.find(i => i.id === 'bolt').progress.text).toBe('Beep 6.4 of 7.2')
  })

  it('counts the badge once both its pieces are on', () => {
    const shelf = gearShelf({ workouts: sessions(4), police: { pctPassed: true } })
    expect(shelf.find(i => i.id === 'badge').earned).toBe(true)
  })

  it('gives a guest nothing and no next', () => {
    const shelf = gearShelf({ workouts: sessions(6), police: {} }, { guest: true })
    expect(shelf.every(i => !i.earned && !i.next && !i.progress)).toBe(true)
  })

  it('keeps the colour a member picked, and grey for a guest', () => {
    expect(myColour({ botColour: LINE_COLOURS[4] }, 'u1')).toBe(LINE_COLOURS[4])
    expect(myColour({ botColour: '#123456' }, 'u1')).toBe(lineColour('u1'))
    expect(myColour({}, 'u1')).toBe(lineColour('u1'))
    expect(myColour({ botColour: LINE_COLOURS[4] }, null)).toBe(GUEST_COLOUR)
  })

  it('counts different weeks, not sessions', () => {
    expect(weeksTrained({ workouts: [{ d: weeksAgo(0) }, { d: weeksAgo(0) }, { d: weeksAgo(1) }] })).toBe(2)
  })
})
