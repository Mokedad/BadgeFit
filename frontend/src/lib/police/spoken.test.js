import { describe, it, expect } from 'vitest'
import { spoken } from './spoken.js'

describe('spoken', () => {
  it('says it the way people talk', () => {
    expect(spoken('Rest is up. Set 2. Let us go.')).toBe("Rest is up. Set 2. Let's go.")
    expect(spoken('That is the pass mark. You are doing great, do not stop.')).toBe("That's the pass mark. You're doing great, don't stop.")
    expect(spoken('I cannot get to my full brain right now.')).toBe("I can't get to my full brain right now.")
  })
  it('leaves "you have to" and numbers alone', () => {
    expect(spoken('You have 3 sets left.')).toBe('You have 3 sets left.')
    expect(spoken('you have to brace')).toBe('you have to brace')
  })
})
