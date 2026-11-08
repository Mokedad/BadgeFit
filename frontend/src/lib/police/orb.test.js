import { describe, it, expect } from 'vitest'
import { snapOrb, ORB } from './orb.js'

const v = { w: 400, h: 800 }
describe('snapOrb', () => {
  it('snaps a drop to the nearest side and keeps it clear of the bars', () => {
    expect(snapOrb({ drop: { x: 100, y: 400 } }, v)).toMatchObject({ side: 'left', tucked: false, top: 400 - ORB / 2 })
    expect(snapOrb({ drop: { x: 300, y: 5 } }, v)).toMatchObject({ side: 'right', top: 130 })
    expect(snapOrb({ drop: { x: 300, y: 799 } }, v).top).toBe(800 - 150 - ORB)
  })
  it('tucks away when dropped against the edge', () => {
    expect(snapOrb({ drop: { x: 395, y: 400 } }, v)).toMatchObject({ side: 'right', tucked: true })
    expect(snapOrb({ drop: { x: 3, y: 400 } }, v)).toMatchObject({ side: 'left', tucked: true })
  })
  it('a stored place survives a new window size, and junk falls back to the right side', () => {
    const p = snapOrb({ drop: { x: 100, y: 400 } }, v)
    expect(snapOrb(p, { w: 800, h: 600 })).toMatchObject({ side: 'left', top: 300 - ORB / 2 })
    expect(snapOrb(null, v)).toMatchObject({ side: 'right', tucked: false })
  })
})
