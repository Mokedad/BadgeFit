import { describe, it, expect } from 'vitest'
import { splitWake } from './wake-word.js'
import { parseCommand } from './voice-commands.js'

describe('splitWake', () => {
  it('hears his name, and what comes after it', () => {
    expect(splitWake("Hayden, that's 20kg 4 reps")).toEqual({ woke: true, rest: "that's 20kg 4 reps" })
    expect(splitWake('ok haydn done')).toEqual({ woke: true, rest: 'done' })
    expect(splitWake('Hayden')).toEqual({ woke: true, rest: '' })
    expect(splitWake('hey den, 20 kilos 4 reps').rest).toBe('20 kilos 4 reps')
  })
  it('ignores everything not said to him', () => {
    expect(splitWake('20 kg 4 reps')).toEqual({ woke: false, rest: '' })
    expect(splitWake('turn the music up')).toEqual({ woke: false, rest: '' })
  })
  it("that's 20 kg 4 reps logs a set", () => {
    expect(parseCommand(splitWake("Hayden, that's 20kg 4 reps").rest)).toEqual({ type: 'set', reps: 4, weight: 20 })
    expect(parseCommand(splitWake('Hayden 4 reps at 20 kilos').rest)).toEqual({ type: 'set', reps: 4, weight: 20 })
  })
})

describe('splitWake: Hey and H call him too', () => {
  it('Hey at the start', () => {
    expect(splitWake('Hey, 55 kilos 12 reps')).toEqual({ woke: true, rest: '55 kilos 12 reps', short: true })
    expect(splitWake('hey')).toEqual({ woke: true, rest: '', short: true })
    expect(parseCommand(splitWake('Hey 55 kg 12 reps').rest)).toEqual({ type: 'set', reps: 12, weight: 55 })
  })
  it('H at the start, however it is spelled', () => {
    expect(splitWake('H, skip rest').rest).toBe('skip rest')
    expect(splitWake('H 60 for 8').rest).toBe('60 for 8')
    expect(splitWake('aitch done').rest).toBe('done')
    expect(splitWake('Haitch, wrap up').rest).toBe('wrap up')
  })
  it('not in the middle of a sentence, and not words that start with h', () => {
    expect(splitWake('I said hey to him').woke).toBe(false)
    expect(splitWake('heavy set today').woke).toBe(false)
    expect(splitWake('hello there').woke).toBe(false)
    expect(splitWake('he did 12 reps').woke).toBe(false)
  })
})
