import { describe, it, expect } from 'vitest'
import { macroTargets, DIETS, dietById } from './nutrition.js'

describe('macroTargets', () => {
  it('builds a deficit with high protein for fat loss', () => {
    const m = macroTargets({ weightKg: 90, goal: 'lose', activity: 'high' })
    expect(m.maintenance).toBe(3240)
    expect(m.kcal).toBe(2590)
    expect(m.protein).toBe(198)
    expect(m.fat).toBe(72)
    expect(m.carbs).toBe(Math.round((2590 - 198 * 4 - 72 * 9) / 4))
    expect(m.water).toBe(3.2)
  })
  it('uses Mifflin-St Jeor with height and age: a 500 kcal deficit', () => {
    // 110 kg, 180 cm, 28, male: BMR 2090, × 1.55 = 3240 maintenance, − 500
    const m = macroTargets({ weightKg: 110, goal: 'lose', heightCm: 180, age: 28, sex: 'male' })
    expect(m).toMatchObject({ method: 'mifflin', maintenance: 3240, kcal: 2740, protein: 242 })
    expect(macroTargets({ weightKg: 60, heightCm: 165, age: 25, sex: 'female', goal: 'maintain' }).kcal).toBe(Math.round(Math.round(10 * 60 + 6.25 * 165 - 125 - 161) * 1.55 / 10) * 10)
  })
  it('adds energy for a gain and rejects nonsense weights', () => {
    expect(macroTargets({ weightKg: 70, goal: 'gain' }).kcal).toBeGreaterThan(macroTargets({ weightKg: 70, goal: 'maintain' }).kcal)
    expect(macroTargets({ weightKg: 0 })).toBeNull()
    expect(macroTargets()).toBeNull()
  })
})

describe('diets', () => {
  it('offers intermittent fasting and high protein', () => {
    expect(dietById('if-16-8').how.length).toBeGreaterThan(3)
    expect(dietById('high-protein')).toBeTruthy()
    expect(new Set(DIETS.map(d => d.id)).size).toBe(DIETS.length)
  })
})

import { proteinFor, proteinTable, creatineFor, SUPPLEMENTS } from './nutrition.js'

describe('protein and creatine', () => {
  it('protein at 0.8, 1.6 and 2.2 g per kg', () => {
    const p = proteinFor(110)
    expect(p.map(x => x.grams)).toEqual([88, 176, 242])
    expect(p[2].perMeal).toBe(61)
    expect(proteinFor(0)).toBeNull()
  })
  it('a table from 50 to 150 kg', () => {
    const t = proteinTable()
    expect(t).toHaveLength(11)
    expect(t[0]).toEqual({ weight: 50, normal: 40, active: 80, build: 110 })
  })
  it('creatine: loading 15-30 g for a week, then maintenance', () => {
    expect(creatineFor(110)).toMatchObject({ loading: 30, loadingPerDose: 7.5, maintenance: 3.5 })
    expect(creatineFor(70)).toMatchObject({ loading: 21, maintenance: 3 })
    expect(creatineFor(40).loading).toBe(15)
  })
  it('every supplement says why and how much', () => {
    for (const s of SUPPLEMENTS) { expect(s.dose).toBeTruthy(); expect(s.why).toBeTruthy() }
  })
})
