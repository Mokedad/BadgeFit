import { describe, it, expect } from 'vitest'
import { scoreVoice, pickVoice, voiceOptions } from './voice.js'

const v = (name, lang, extra = {}) => ({ name, lang, voiceURI: name, localService: true, ...extra })
const IPHONE = [v('Karen', 'en-AU'), v('Lee', 'en-AU'), v('Lee (Premium)', 'en-AU'), v('Daniel', 'en-GB'), v('Samantha', 'en-US'), v('Thomas', 'fr-FR')]
const EDGE = [v('Microsoft Natasha Online (Natural) - English (Australia)', 'en-AU', { localService: false }), v('Microsoft William Online (Natural) - English (Australia)', 'en-AU', { localService: false }), v('Microsoft David - English (United States)', 'en-US')]
const CHROME = [v('Google US English', 'en-US'), v('Google UK English Male', 'en-GB'), v('Google UK English Female', 'en-GB')]

describe('Hayden voice', () => {
  it('iPhone: the premium male voice', () => {
    expect(pickVoice(IPHONE).name).toBe('Lee (Premium)')
  })
  it('Edge: William (Natural), not Natasha', () => {
    expect(pickVoice(EDGE).name).toMatch(/William/)
  })
  it('Chrome: the male voice', () => {
    expect(pickVoice(CHROME).name).toBe('Google UK English Male')
  })
  it('a saved choice wins while the device still has it', () => {
    expect(pickVoice(IPHONE, 'Daniel').name).toBe('Daniel')
    expect(pickVoice(IPHONE, 'Gone voice').name).toBe('Lee (Premium)')
  })
  it('only English voices are offered, best first', () => {
    const opts = voiceOptions(IPHONE)
    expect(opts.some(x => x.lang === 'fr-FR')).toBe(false)
    expect(opts[0].name).toBe('Lee (Premium)')
    expect(scoreVoice(v('Karen', 'en-AU'))).toBeLessThan(scoreVoice(v('Lee', 'en-AU')))
    expect(scoreVoice(v('Aaron (Enhanced)', 'en-US'))).toBeGreaterThan(scoreVoice(v('Lee', 'en-AU')))
    expect(pickVoice([])).toBeNull()
  })
})
