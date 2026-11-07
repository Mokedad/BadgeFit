import { describe, it, expect } from 'vitest'
import { addMeal, removeMeal, dayTotals, lastDays, cleanMeal, quickMeals, PRESET_MEALS, KEEP_DAYS, bodyProgress, estimateMinutes } from './meals.js'
import { routineFor } from './programme.js'

describe('meal tracker', () => {
  it('adds, totals and removes', () => {
    let m = addMeal({}, '2026-11-07', PRESET_MEALS[0])
    m = addMeal(m, '2026-11-07', { name: 'Steak', kcal: '650', protein: '90' })
    const t = dayTotals(m, '2026-11-07', { kcal: 2740, protein: 242 })
    expect(t).toMatchObject({ kcal: 1170, protein: 132, count: 2, kcalLeft: 1570, proteinLeft: 110, kcalPct: 43, proteinPct: 55 })
    m = removeMeal(m, '2026-11-07', m['2026-11-07'][0].id)
    expect(dayTotals(m, '2026-11-07').kcal).toBe(650)
    m = removeMeal(m, '2026-11-07', m['2026-11-07'][0].id)
    expect(m['2026-11-07']).toBeUndefined()
  })
  it('refuses meals without a name or calories, and silly numbers', () => {
    expect(cleanMeal({ name: '', kcal: 100 })).toBeNull()
    expect(cleanMeal({ name: 'x', kcal: '' })).toBeNull()
    expect(cleanMeal({ name: 'x', kcal: 99999 })).toBeNull()
    expect(cleanMeal({ name: 'Apple', kcal: 80 })).toEqual({ name: 'Apple', kcal: 80, protein: 0 })
  })
  it(`keeps ${KEEP_DAYS} days`, () => {
    const m = addMeal({ '2026-01-01': [{ id: 'a', name: 'old', kcal: 1, protein: 0 }] }, '2026-11-07', { name: 'new', kcal: 1 })
    expect(Object.keys(m)).toEqual(['2026-11-07'])
  })
  it('the last 7 days, oldest first', () => {
    const d = lastDays(addMeal({}, '2026-11-05', { name: 'x', kcal: 500, protein: 40 }), '2026-11-07')
    expect(d.map(x => x.day)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'])
    expect(d[4]).toMatchObject({ kcal: 500, logged: true })
  })
  it('your own meals come first', () => {
    const q = quickMeals([{ id: 'm1', name: 'Mine', kcal: 1, protein: 1 }], ['p-porridge'])
    expect(q[0].id).toBe('m1')
    expect(q.some(x => x.id === 'p-porridge')).toBe(false)
  })
})

describe('bodyProgress', () => {
  const bw = [{ d: '2026-09-07', w: 114 }, { d: '2026-10-01', w: 112.4 }, { d: '2026-11-06', w: 110 }]
  it('reads 114 → 110 against a 100 kg goal', () => {
    expect(bodyProgress(bw, { goal: 100 })).toMatchObject({ start: 114, now: 110, change: -4, toGoal: 10, pct: 29 })
  })
  it('starts from the programme start when given', () => {
    expect(bodyProgress(bw, { startISO: '2026-10-01' }).start).toBe(112.4)
    expect(bodyProgress([], {})).toBeNull()
  })
})

describe('estimateMinutes', () => {
  it('estimates a gym day and a run', () => {
    const gym = routineFor('chest', 'intermediate', '4-6')
    expect(estimateMinutes(gym)).toBeGreaterThan(50)
    expect(estimateMinutes(gym)).toBeLessThan(90)
    expect(estimateMinutes(routineFor('walk', 'beginner', '12-15'))).toBe(40)
  })
})
