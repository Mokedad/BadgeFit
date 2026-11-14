import { describe, it, expect } from 'vitest'
import { equipmentOf, CATALOGUE } from './exercises.js'

describe('equipment filters in gym order', () => {
  it('machines first, then the bars, dumbbells and cables, the odd kit last', () => {
    const all = equipmentOf(CATALOGUE)
    expect(all.slice(0, 9)).toEqual(['leverage machine', 'smith machine', 'sled machine', 'barbell', 'ez barbell', 'olympic barbell', 'trap bar', 'dumbbell', 'cable'])
    expect(all.indexOf('body weight')).toBeLessThan(all.indexOf('band'))
    expect(all.at(-1)).toBe('macebell')
  })
})
