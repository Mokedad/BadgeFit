import { describe, it, expect } from 'vitest'
import { RUN_CARE, findCare } from './run-care.js'

describe('run care', () => {
  it('every topic has what, why, what to do and when to see someone', () => {
    const items = RUN_CARE.flatMap(g => g.items)
    expect(items.length).toBe(17)
    for (const i of items) { expect(i.what && i.why && i.see).toBeTruthy(); expect(i.do.length).toBeGreaterThan(0) }
    expect(new Set(items.map(i => i.id)).size).toBe(items.length)
  })
  it('finds topics from plain words', () => {
    expect(findCare('my shins hurt after running').map(i => i.id)).toEqual(['shins'])
    expect(findCare('stabbing pain in my heel in the morning').map(i => i.id)).toContain('plantar')
    expect(findCare('Achilles is stiff').map(i => i.id)).toContain('achilles')
    expect(findCare('')).toEqual([])
  })
})
