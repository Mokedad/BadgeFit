import { describe, it, expect } from 'vitest'
import { parseCommand, wordsToNumbers } from './voice-commands.js'

describe('wordsToNumbers', () => {
  it('reads spoken numbers', () => {
    expect(wordsToNumbers('fifteen reps at twenty kilos')).toBe('15 reps at 20 kilos')
    expect(wordsToNumbers('twenty two and a half')).toBe('22.5')
    expect(wordsToNumbers('a hundred and forty')).toBe('140')
    expect(wordsToNumbers('62 and a half kilos')).toBe('62.5 kilos')
  })
})

describe('parseCommand', () => {
  const cases = [
    ['Done 15 reps on 20kg', { type: 'set', reps: 15, weight: 20 }],
    ['did 6 reps on 20 kilos', { type: 'set', reps: 6, weight: 20 }],
    ['Hayden, 8 at 62.5', { type: 'set', reps: 8, weight: 62.5 }],
    ['80 kilos for 6', { type: 'set', reps: 6, weight: 80 }],
    ['twelve reps', { type: 'set', reps: 12 }],
    ['done', { type: 'set' }],
    ['Set done.', { type: 'set' }],
    ['same again', { type: 'same' }],
    ['skip rest', { type: 'skipRest' }],
    ["I'm ready", { type: 'skipRest' }],
    ['add 30 seconds', { type: 'addRest', sec: 30 }],
    ['give me another minute', { type: 'addRest', sec: 60 }],
    ["Hayden, machine is taken, switch to dumbbell incline bench", { type: 'swap', query: 'dumbbell incline bench' }],
    ['plate loaded machine busy, swap to cable', { type: 'swap', query: 'cable' }],
    ["what's next", { type: 'next' }],
    ['Hayden, wrap up workout', { type: 'finish' }],
    ['how much protein should I eat?', null],
  ]
  for (const [said, want] of cases) it(said, () => expect(parseCommand(said)).toEqual(want))
})
