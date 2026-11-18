import { describe, it, expect, vi, afterEach } from 'vitest'
import { createPacer } from './pacer.js'

afterEach(() => vi.useRealTimers())

const fakeCtx = () => {
  const ctx = { currentTime: 0, state: 'running', resume: vi.fn(() => Promise.resolve()) }
  return ctx
}

describe('pacer', () => {
  it('books ticks a beat apart on the audio clock and follows a new beat', () => {
    vi.useFakeTimers()
    const ctx = fakeCtx()
    const at = []
    const p = createPacer({ getCtx: () => ctx, tick: (_c, t) => at.push(+t.toFixed(3)) })
    p.set({ spm: 120 }) // a tick every 0.5 s
    for (let i = 0; i < 80; i++) { ctx.currentTime += 0.025; vi.advanceTimersByTime(25) } // 2 s
    const gaps = at.slice(1).map((t, i) => +(t - at[i]).toFixed(3))
    expect(at.length).toBeGreaterThanOrEqual(4)
    expect(new Set(gaps)).toEqual(new Set([0.5]))
    // Faster: the next ticks come closer together.
    p.set({ spm: 240 })
    const before = at.length
    for (let i = 0; i < 40; i++) { ctx.currentTime += 0.025; vi.advanceTimersByTime(25) } // 1 s
    const later = at.slice(before)
    expect(later.length).toBeGreaterThanOrEqual(3)
    expect(+(later[2] - later[1]).toFixed(3)).toBe(0.25)
    p.stop()
    expect(p.running).toBe(false)
  })

  it('goes quiet for a part with no beat, and taps on every second step when asked', () => {
    vi.useFakeTimers()
    const ctx = fakeCtx()
    const at = []
    const p = createPacer({ getCtx: () => ctx, tick: (_c, t) => at.push(t) })
    p.set({ spm: null })
    vi.advanceTimersByTime(500)
    expect(at).toEqual([])
    expect(p.running).toBe(false)
    p.set({ spm: 120, every: 2 }) // every 1 s
    for (let i = 0; i < 120; i++) { ctx.currentTime += 0.025; vi.advanceTimersByTime(25) } // 3 s
    expect(+(at[1] - at[0]).toFixed(3)).toBe(1)
    p.stop()
  })

  it('buzzes instead of ticking', () => {
    vi.useFakeTimers()
    let ms = 0
    const buzz = vi.fn()
    const p = createPacer({ getCtx: () => null, buzz, clock: () => ms, tick: () => { throw new Error('no tick') } })
    p.set({ spm: 120, sound: 'buzz' })
    for (let i = 0; i < 80; i++) { ms += 25; vi.advanceTimersByTime(25) } // 2 s
    expect(buzz.mock.calls.length).toBeGreaterThanOrEqual(4)
    expect(buzz.mock.calls.length).toBeLessThanOrEqual(5)
    p.stop()
  })

  it('wakes a suspended context before booking', () => {
    vi.useFakeTimers()
    const ctx = fakeCtx(); ctx.state = 'suspended'
    const p = createPacer({ getCtx: () => ctx, tick: () => {} })
    p.set({ spm: 160 })
    expect(ctx.resume).toHaveBeenCalled()
    p.stop()
  })
})
