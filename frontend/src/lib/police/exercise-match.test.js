import { describe, it, expect } from 'vitest'
import { matchExercise, normWords } from './exercise-match.js'

const L = [
  { id: '0025', n: 'barbell bench press', eq: 'barbell', tg: 'pectorals', bp: 'chest' },
  { id: '0314', n: 'dumbbell incline bench press', eq: 'dumbbell', tg: 'pectorals', bp: 'chest' },
  { id: '3682', n: 'dumbbell incline alternate bicep curl', eq: 'dumbbell', tg: 'biceps', bp: 'upper arms' },
  { id: '0188', n: 'cable fly', eq: 'cable', tg: 'pectorals', bp: 'chest' },
  { id: '0149', n: 'cable alternate triceps extension', eq: 'cable', tg: 'triceps', bp: 'upper arms' },
  { id: '0577', n: 'lever chest press', eq: 'leverage machine', tg: 'pectorals', bp: 'chest' },
]
const bench = L[0]

describe('matchExercise', () => {
  it('reads gym words', () => {
    expect(normWords('DB incline bench, please')).toEqual(['dumbbell', 'incline', 'bench'])
  })
  it('finds the named exercise', () => {
    expect(matchExercise('dumbbell incline bench', L, { current: bench })?.id).toBe('0314')
  })
  it('a bare equipment word keeps the muscle being trained', () => {
    expect(matchExercise('cable', L, { current: bench })?.id).toBe('0188')
  })
  it('never returns the exercise being replaced, and nothing for nonsense', () => {
    expect(matchExercise('barbell bench press', L, { current: bench })?.id).not.toBe('0025')
    expect(matchExercise('banana', L, { current: bench })).toBeNull()
  })
  it('prefers what you have done before', () => {
    expect(matchExercise('chest press', L, { current: bench, done: new Set(['0577']) })?.id).toBe('0577')
  })
})
