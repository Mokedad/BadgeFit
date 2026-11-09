import { describe, it, expect } from 'vitest'
import { splitWake } from './wake-word.js'
import { parseCommand } from './voice-commands.js'

describe('splitWake', () => {
  it('hears his name, and what comes after it', () => {
    expect(splitWake("Jarvis, that's 20kg 4 reps")).toEqual({ woke: true, rest: "that's 20kg 4 reps" })
    expect(splitWake('ok javis done')).toEqual({ woke: true, rest: 'done' })
    expect(splitWake('Jarvis')).toEqual({ woke: true, rest: '' })
  })
  it('ignores everything not said to him', () => {
    expect(splitWake('20 kg 4 reps')).toEqual({ woke: false, rest: '' })
    expect(splitWake('turn the music up')).toEqual({ woke: false, rest: '' })
  })
  it("that's 20 kg 4 reps logs a set", () => {
    expect(parseCommand(splitWake("Jarvis, that's 20kg 4 reps").rest)).toEqual({ type: 'set', reps: 4, weight: 20 })
    expect(parseCommand(splitWake('Jarvis 4 reps at 20 kilos').rest)).toEqual({ type: 'set', reps: 4, weight: 20 })
  })
})
