import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { listenOnce } from './listen.js'

// A fake recognition that only does what the test tells it to (like iPhone Safari: no `end`).
function fake({ endOnStop = false } = {}) {
  const made = []
  class R {
    constructor() { made.push(this); this.stopped = false; this.aborted = false }
    start() {}
    stop() { this.stopped = true; if (endOnStop) this.onend?.() }
    abort() { this.aborted = true }
    say(text) { this.onresult?.({ results: [[{ transcript: text }]] }) }
  }
  return { R, made }
}
const timing = { silenceMs: 100, noSpeechMs: 500, maxMs: 2000, endWaitMs: 50 }

describe('listenOnce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('sends what was heard after a silence, even when the phone never ends the turn', async () => {
    const { R, made } = fake()
    const seen = []
    const l = listenOnce(R, { timing, onInterim: t => seen.push(t) })
    made[0].say('what should I')
    made[0].say('what should I do today')
    vi.advanceTimersByTime(100)
    expect(made[0].stopped).toBe(true)
    vi.advanceTimersByTime(50)
    expect(await l.done).toEqual({ text: 'what should I do today' })
    expect(seen).toHaveLength(2)
  })
  it('gives up with nothing when no one speaks', async () => {
    const { R } = fake({ endOnStop: true })
    const l = listenOnce(R, { timing })
    vi.advanceTimersByTime(500)
    expect(await l.done).toEqual({ text: '' })
  })
  it('finish sends now, cancel drops it, errors come back', async () => {
    let f = fake({ endOnStop: true })
    let l = listenOnce(f.R, { timing })
    f.made[0].say('hi')
    l.finish()
    expect(await l.done).toEqual({ text: 'hi' })
    f = fake()
    l = listenOnce(f.R, { timing })
    f.made[0].say('hi')
    l.cancel()
    expect(await l.done).toEqual({ text: '' })
    f = fake()
    l = listenOnce(f.R, { timing })
    f.made[0].onerror({ error: 'not-allowed' })
    expect(await l.done).toEqual({ error: 'not-allowed' })
  })
})
