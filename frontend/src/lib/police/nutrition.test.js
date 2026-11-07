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
