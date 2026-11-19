// @vitest-environment happy-dom
// The bell groups reactions from one person in a row into one line (views/Community.jsx).
import { describe, it, expect } from 'vitest'
import { groupBell } from './Community.jsx'

describe('the bell, grouped', () => {
  it('stacks reactions from the same person in a row; anything else stays its own line', () => {
    const rows = groupBell([
      { id: 1, who: 'm', from: 'MrMoke', kind: 'fire', at: 3 },
      { id: 2, who: 'm', from: 'MrMoke', kind: 'love', at: 2 },
      { id: 3, who: 'm', from: 'MrMoke', kind: 'cheer', at: 1 },
      { id: 4, who: 'l', from: 'LadyBug', kind: 'follow', at: 1 },
      { id: 5, who: 'l', from: 'LadyBug', kind: 'strong', at: 0 },
      { id: 6, who: 'm', from: 'MrMoke', kind: 'wow', at: 0 },
    ])
    expect(rows.map(r => [r.from, r.kinds || r.kind, r.n || 1])).toEqual([
      ['MrMoke', ['fire', 'love', 'love'], 3], ['LadyBug', 'follow', 1], ['LadyBug', ['strong'], 1], ['MrMoke', ['wow'], 1],
    ])
  })
})
