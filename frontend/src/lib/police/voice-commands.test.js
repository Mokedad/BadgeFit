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

describe('parseSet: the weight is never dropped', () => {
  const cases = [
    ["that's 55 kg 12 reps", 55, 12], ['12 reps 55 kg', 55, 12], ['12 reps, 55 kilos', 55, 12],
    ['55 kg and 12 reps', 55, 12], ['55 kgs. 12 reps', 55, 12], ["that's 55, 12 reps", 55, 12],
    ['weight 55 reps 12', 55, 12], ['fifty two point five kg twelve reps', 52.5, 12],
    ["55 kg's 12 reps", 55, 12], ['55 k g 12 reps', 55, 12], ['55 kg with 12 reps', 55, 12],
    ['55 kg, I did 12 reps', 55, 12], ['8 at 60', 60, 8], ['20 kilos for 8', 20, 8], ['55 12', 55, 12],
  ]
  for (const [said, weight, reps] of cases) it(said, () => expect(parseCommand(said)).toEqual({ type: 'set', weight, reps }))
  it('a weight alone is a weight, not reps', () => expect(parseCommand('55 kg')).toEqual({ type: 'set', weight: 55 }))
  it('a bare number is reps', () => expect(parseCommand('12')).toEqual({ type: 'set', reps: 12 }))
})

describe('gym talk: change the rest, move on', () => {
  const rest = { '2 minutes rest instead': 120, 'two minutes rest instead': 120, 'rest 90 seconds': 90, 'cut the rest to a minute': 60,
    'only a minute rest': 60, 'a minute and a half rest': 90, 'rest is 3 minutes': 180, 'make it 2 minutes rest': 120 }
  for (const [said, sec] of Object.entries(rest)) it(said, () => expect(parseCommand(said)).toEqual({ type: 'setRest', sec }))
  for (const said of ['next exercise', "I'm done with this machine", 'done with this one', 'move on', 'skip this exercise', "machine's taken"]) {
    it(said, () => expect(parseCommand(said)).toEqual({ type: 'nextExercise' }))
  }
  it('still: what is next, add rest, swap, a set', () => {
    expect(parseCommand("what's next")).toEqual({ type: 'next' })
    expect(parseCommand('add 30 seconds')).toEqual({ type: 'addRest', sec: 30 })
    expect(parseCommand("machine's taken, switch to dumbbells").type).toBe('swap')
    expect(parseCommand('done')).toEqual({ type: 'set' })
  })
})
