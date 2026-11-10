import { describe, it, expect } from 'vitest'
import { answerOffline } from './offline-jarvis.js'

const brief = {
  daysToTest: 27,
  today: { title: 'Chest, Shoulders & Abs', kind: 'gym', minutes: 63, details: ['Main lifts in the 10-12 reps range'] },
  tomorrow: { title: 'VO2 max: 4 x 4 min', kind: 'run', minutes: 32, details: [] },
  gaps: [{ standard: 'Beep test (20 m shuttle)', latest: '6.4', pct: 82, pass: false, area: 'Aerobic engine', train: 'VO2 intervals, 20 m shuttles, easy base runs' }, { standard: 'Push-ups', pass: true, pct: 100 }],
  foodToday: { kcal: 900, protein: 80, kcalTarget: 2600, proteinTarget: 230 },
  weight: { start: 114, now: 113.2, change: -0.8, unit: 'kg' },
}

describe('Hayden without the AI', () => {
  it('answers from the plan', () => {
    expect(answerOffline('what should I do today?', brief)).toMatch(/^Today: Chest, Shoulders & Abs, about 63 minutes\..*27 days/)
    expect(answerOffline('what about tomorrow', brief)).toMatch(/^Tomorrow: VO2/)
    expect(answerOffline('what should I focus on', brief)).toMatch(/Beep test.*82 percent.*VO2 intervals/)
    expect(answerOffline('am I ready for the PCT?', brief)).toMatch(/27 days.*1 of 2.*Beep test/)
    expect(answerOffline('how much protein', brief)).toMatch(/230 grams/)
    expect(answerOffline('how is my weight loss going', brief)).toMatch(/113.2 kg, down 0.8/)
    expect(answerOffline('my knee hurts', brief)).toMatch(/stop that exercise/)
  })
  it('never invents numbers it does not have', () => {
    expect(answerOffline('what should I focus on', {})).toMatch(/Run a Test day first/)
    expect(answerOffline('tell me a joke', {})).toMatch(/Ask me again/)
  })
})
