// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { NativeRecognition, pickRecognition } from './native-ear.js'
import { listenOnce } from './listen.js'

afterEach(() => { delete window.Capacitor })

function fakeApp({ partials = [], final = '', error = null } = {}) {
  let onHeard = null
  const p = {
    addListener: async (_, fn) => { onHeard = fn; return { remove: async () => {} } },
    listen: async () => { for (const t of partials) onHeard?.({ text: t }); return error ? { error } : { text: final } },
    stop: vi.fn(), cancel: vi.fn(),
  }
  window.Capacitor = { isNativePlatform: () => true, isPluginAvailable: n => n === 'HaydenEar', registerPlugin: () => p }
  return p
}

describe("Hayden's ears in the iPhone app", () => {
  it('listens with Apple recognition when the app has it, else the browser', () => {
    expect(pickRecognition()).not.toBe(NativeRecognition)
    fakeApp()
    expect(pickRecognition()).toBe(NativeRecognition)
  })
  it('a set said out loud reaches the listener', async () => {
    fakeApp({ partials: ['20 kilos', '20 kilos 10 reps'], final: '20 kilos 10 reps' })
    const out = await listenOnce(NativeRecognition, { timing: { silenceMs: 50, noSpeechMs: 1000, maxMs: 2000, endWaitMs: 50 } }).done
    expect(out).toEqual({ text: '20 kilos 10 reps' })
  })
  it('a permission said no is told', async () => {
    fakeApp({ error: 'not-allowed' })
    const out = await listenOnce(NativeRecognition, { timing: { silenceMs: 50, noSpeechMs: 1000, maxMs: 2000, endWaitMs: 50 } }).done
    expect(out).toEqual({ error: 'not-allowed' })
  })
})
