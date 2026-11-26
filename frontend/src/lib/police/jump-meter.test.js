import { describe, it, expect } from 'vitest'
import { airTime, jumpCm, gOf } from './jump-meter.js'

const run = (pattern, dt = 10) => pattern.map((g, i) => ({ t: i * dt, g }))
const still = n => Array(n).fill(1)
const air = n => Array(n).fill(0.1)

describe('the jump from the phone', () => {
  it('times the free fall between push-off and landing', () => {
    const s = run([...still(50), 2.5, 2.5, ...air(50), 3.5, ...still(30)])
    expect(airTime(s)).toBeCloseTo(0.5, 2)
    expect(jumpCm(0.5)).toBe(31)
  })
  it('ignores a wobble and a dropped phone', () => {
    expect(airTime(run([...still(20), ...air(5), ...still(20)]))).toBe(0)
    expect(airTime(run([...still(20), ...air(150), ...still(20)]))).toBe(0)
  })
  it('keeps the best of two jumps', () => {
    const s = run([...still(20), ...air(40), ...still(40), ...air(55), ...still(20)])
    expect(airTime(s)).toBeCloseTo(0.55, 2)
  })
  it('reads g from a motion event', () => {
    expect(gOf({ accelerationIncludingGravity: { x: 0, y: 0, z: -9.81 } })).toBeCloseTo(1, 3)
    expect(gOf({})).toBeNaN()
  })
})
