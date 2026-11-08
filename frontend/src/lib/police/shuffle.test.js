import { describe, it, expect } from 'vitest'
import { dailyShuffle } from './shuffle.js'

describe('dailyShuffle', () => {
  const list = Array.from({ length: 30 }, (_, i) => i)
  it('same day, same order; another day, another order; nothing lost', () => {
    const a = dailyShuffle(list, '2026-11-08')
    expect(dailyShuffle(list, '2026-11-08')).toEqual(a)
    expect(dailyShuffle(list, '2026-11-09')).not.toEqual(a)
    expect(a.slice().sort((x, y) => x - y)).toEqual(list)
    expect(a).not.toEqual(list)
    expect(list[0]).toBe(0) // the input is not changed
  })
})
