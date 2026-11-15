import { describe, it, expect } from 'vitest'
import { cheerLine, cheerSummary, cheerSym, winText } from './cheer-text.js'

describe('cheer text', () => {
  it('says who and what', () => {
    expect(cheerLine({ from: 'Sam', kind: 'cheer', what: 'your win: Level 7.4' })).toBe('Sam cheered your win: Level 7.4')
    expect(cheerLine({ from: 'Sam', kind: 'reply', what: 'your question: grip?' })).toBe('Sam replied to your question: grip?')
    expect(cheerLine({ from: 'Ann', kind: 'love' })).toBe('Ann sent you a love')
    expect(cheerLine({ from: 'Ann', kind: 'like' })).toBe('Ann sent you a like')
    expect(cheerSym('love')).toBe('❤️')
  })

  it('reads several as one line, newest first', () => {
    expect(cheerSummary([{ from: 'A', kind: 'love' }, { from: 'B', kind: 'like' }, { from: 'C', kind: 'love' }])).toBe('C sent you a love, and 2 more')
    expect(cheerSummary([])).toBe('')
  })

  it('offers a win to share', () => {
    expect(winText({ kind: 'result', name: 'Push-ups', value: 27, unit: 'reps', pass: true })).toBe('Passed the push-ups standard! Push-ups: 27 reps')
    expect(winText({ kind: 'result', name: 'Beep test', value: '6.4', unit: 'level', best: true })).toBe('New best on the beep test. Beep test: 6.4')
    expect(winText({ kind: 'workout', name: 'Chest, Shoulders & Abs', week: 3, of: 12 })).toBe('Done for today: Chest, Shoulders & Abs. Week 3 of 12. One step closer to the badge.')
  })
})
