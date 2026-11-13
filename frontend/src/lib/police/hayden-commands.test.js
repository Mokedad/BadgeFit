import { describe, it, expect } from 'vitest'
import { haydenCommand } from './hayden-commands.js'

describe('Hayden takes orders', () => {
  it('starts the workout on the ways people say it', () => {
    for (const s of ['Start', "Let's go", 'lets go!', "Let's do my workout", 'start my workout', 'begin', "I'm ready", "let's get started", 'do my session']) expect(haydenCommand(s)).toBe('start')
  })
  it('opens the plan and the test', () => {
    expect(haydenCommand('show my plan')).toBe('plan')
    expect(haydenCommand('plan')).toBe('plan')
    expect(haydenCommand('open the test')).toBe('tests')
  })
  it('a question is a question', () => {
    expect(haydenCommand('when do I start running?')).toBe(null)
    expect(haydenCommand('what should I eat')).toBe(null)
    expect(haydenCommand('')).toBe(null)
  })
})
