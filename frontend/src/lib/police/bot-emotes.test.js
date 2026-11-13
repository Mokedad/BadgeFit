import { describe, it, expect } from 'vitest'
import { EMOTES, nextEmote, haydenOn } from './bot-emotes.js'

describe('Hayden moves', () => {
  it('never repeats the last move', () => {
    for (let last = 0; last < EMOTES.length; last++)
      for (const r of [0, 0.3, 0.6, 0.99]) {
        const i = nextEmote(last, () => r)
        expect(i).not.toBe(last); expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(EMOTES.length)
      }
  })
  it('is on until turned off', () => {
    expect(haydenOn({})).toBe(true)
    expect(haydenOn({ police: { haydenOff: true } })).toBe(false)
  })
})

import { exerciseAct } from './bot-emotes.js'
describe('Hayden copies the exercise', () => {
  it('knows the common lifts and runs', () => {
    expect(exerciseAct({ n: 'barbell bench press' })).toBe('bench')
    expect(exerciseAct({ n: 'push-up' })).toBe('bench')
    expect(exerciseAct({ n: 'barbell full squat' })).toBe('squat')
    expect(exerciseAct({ n: 'dumbbell biceps curl' })).toBe('curl')
    expect(exerciseAct({ n: 'cable wide grip lat pulldown' })).toBe('pull')
    expect(exerciseAct({ n: 'cable rope seated row' })).toBe('pull')
    expect(exerciseAct({ n: 'dumbbell seated shoulder press' })).toBe('press')
    expect(exerciseAct({ n: 'run' })).toBe('run')
    expect(exerciseAct({ n: 'plank' })).toBe(null)
    expect(exerciseAct(null)).toBe(null)
  })
})
