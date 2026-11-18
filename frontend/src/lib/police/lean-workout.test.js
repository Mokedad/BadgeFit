import { describe, it, expect } from 'vitest'
import { nextSetIdx, lastDoneIdx, dotStates, stripStates, cleanLater, nextExercise, putOff, isLastSet, stepValue, buttonLabel, laterKey, clock } from './lean-workout.js'

const ex = (id, done) => ({ id, rid: 'r', sets: done.map(d => ({ done: d })) })

describe('lean workout', () => {
  it('finds the next and the last ticked set', () => {
    const e = ex('a', [true, false, false])
    expect(nextSetIdx(e)).toBe(1)
    expect(lastDoneIdx(e)).toBe(0)
    expect(nextSetIdx(ex('a', [true]))).toBe(-1)
    expect(lastDoneIdx(ex('a', [false]))).toBe(-1)
  })

  it('shows done, current and later', () => {
    expect(dotStates(ex('a', [true, false, false]))).toEqual(['done', 'cur', 'todo'])
    const list = [ex('a', [true]), ex('b', [false]), ex('c', [false]), ex('d', [false])]
    expect(stripStates(list, 1, [laterKey(list[3])])).toEqual(['done', 'cur', 'todo', 'later'])
  })

  it('goes to the next exercise, leaving the ones put off for the end', () => {
    const list = [ex('a', [false]), ex('b', [false]), ex('c', [true]), ex('d', [false])]
    expect(nextExercise(list, 0, [laterKey(list[1])])).toBe(3)
    expect(nextExercise(list, 3, [laterKey(list[1])])).toBe(0)
    // Only the put-off one left: it comes back.
    const two = [ex('a', [true]), ex('b', [false]), ex('c', [false])]
    expect(nextExercise(two, 2, [laterKey(two[1])])).toBe(1)
    expect(nextExercise([ex('a', [false])], 0, [])).toBe(null)
  })

  it('swipe left puts it at the back, unless it is the only one left', () => {
    const list = [ex('a', [false]), ex('b', [false])]
    expect(putOff(list, 0, [])).toEqual({ later: ['r|a'], next: 1 })
    expect(putOff([ex('a', [false]), ex('b', [true])], 0, [])).toEqual({ later: [], next: null })
  })

  it('drops finished exercises from the later list', () => {
    const list = [ex('a', [true]), ex('b', [false])]
    expect(cleanLater(list, ['r|a', 'r|b', 'r|b', 'r|gone'])).toEqual(['r|b'])
  })

  it('knows the very last set', () => {
    expect(isLastSet([ex('a', [true]), ex('b', [true, false])], 1)).toBe(true)
    expect(isLastSet([ex('a', [false]), ex('b', [true, false])], 1)).toBe(false)
  })

  it('steps numbers', () => {
    expect(stepValue(22.5, 'w', 1)).toBe(25)
    expect(stepValue(45, 'w', -1, 'lb')).toBe(40)
    expect(stepValue(0, 'r', -1)).toBe(0)
    expect(stepValue(10, 'r', 1)).toBe(11)
    expect(stepValue(45, 'sec', 1)).toBe(50)
  })

  it('labels the one button', () => {
    expect(buttonLabel({ mode: 'reps', setNo: 2 })).toBe('Set 2 done')
    expect(buttonLabel({ mode: 'time', sec: 45 })).toBe('Start 45 s')
    expect(buttonLabel({ mode: 'reps', warm: true })).toBe('Warm-up done')
    expect(buttonLabel({ mode: 'reps', setNo: 3, last: true })).toBe('Finish workout')
    expect(buttonLabel({ mode: 'reps', setNo: 1, side: 'L' })).toBe('Set 1 left done')
    expect(clock(72)).toBe('1:12')
  })
})
