import { describe, it, expect } from 'vitest'
import { runResult } from './run-result.js'
import { runById } from './runs.js'

const run = runById('easy-30')
describe('runResult', () => {
  it('a finished run, with the week', () => {
    const r = runResult({ run, ranSec: 30 * 60, completed: true, runLog: [{ at: '2026-11-09', min: 40 }], today: '2026-11-10', seed: 0 })
    expect(r).toMatchObject({ min: 30, pct: 100, completed: true, weekRuns: 2, weekMin: 70 })
    expect(r.headline).toMatch(/🥳/)
    expect(r.line).toMatch(/all 30 minutes.*run number 2 this week, 70 minutes/)
  })
  it('stopped early still counts', () => {
    const r = runResult({ run, ranSec: 18 * 60, completed: false, today: '2026-11-10', seed: 0 })
    expect(r).toMatchObject({ min: 18, pct: 60, completed: false, weekRuns: 1 })
    expect(r.line).toMatch(/18 of 30 minutes.*60 percent.*first run this week/)
  })
})
