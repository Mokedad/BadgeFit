import { describe, it, expect } from 'vitest'
import { buildBell, featuredOf, rowsOf } from './bell.js'

const NOW = Date.parse('2026-11-19T12:00:00Z')
const H = 3600000, D = 24 * H

describe('the bell', () => {
  it('features your most-reacted post once 2 or more people reacted', () => {
    const list = [
      { id: 1, kind: 'cheer', who: 'a', from: 'Ann', ref: 'p1', what: 'your post: Week 1', at: NOW - H },
      { id: 2, kind: 'fire', who: 'b', from: 'Bob', ref: 'p1', what: 'your post: Week 1', at: NOW - 2 * H },
      { id: 3, kind: 'love', who: 'a', from: 'Ann', ref: 'p2', what: 'your comment: hi', at: NOW - 3 * H },
    ]
    const f = featuredOf(list)
    expect([f.ref, f.people.map(p => p.from), f.kinds]).toEqual(['p1', ['Ann', 'Bob'], ['love', 'fire']])
    expect(featuredOf(list.slice(2))).toBe(null)
  })
  it('stacks reactions from one person and puts several follows on one line', () => {
    const rows = rowsOf([
      { id: 1, kind: 'fire', who: 'm', from: 'Moke' }, { id: 2, kind: 'love', who: 'm', from: 'Moke' }, { id: 3, kind: 'fire', who: 'm', from: 'Moke' },
      { id: 4, kind: 'follow', who: 'j', from: 'Josh' }, { id: 5, kind: 'reply', who: 'l', from: 'Lady' }, { id: 6, kind: 'follow', who: 'k', from: 'Kim' },
    ])
    expect(rows.map(r => r.kind === 'follows' ? ['follows', r.people.map(p => p.from)] : [r.from, r.kinds || r.kind, r.n])).toEqual([
      ['Moke', ['fire', 'love'], 3], ['follows', ['Josh', 'Kim']], ['Lady', 'reply', undefined],
    ])
  })
  it('splits Today, This week and Earlier, leaving out empty ones', () => {
    const b = buildBell([{ id: 1, kind: 'fire', who: 'm', from: 'Moke', at: NOW - H }, { id: 2, kind: 'follow', who: 'j', from: 'Josh', at: NOW - 3 * D }], NOW)
    expect(b.sections.map(s => s.title)).toEqual(['Today', 'This week'])
    expect(buildBell([], NOW).sections).toEqual([])
  })
})
