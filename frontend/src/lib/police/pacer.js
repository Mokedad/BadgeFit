// The pace sound's clock (components/PaceButton.jsx). A metronome cannot run on page timers alone:
// they drift and stall by tens of milliseconds, which a runner hears. So ticks are booked a little
// ahead on the Web Audio clock, topped up every 25 ms, the usual way a web metronome is built.
// A tick is short, soft and high, so it sits under music; the page's audio already mixes with
// whatever plays (lib/sound.js), so Spotify keeps going. "Buzz" taps the phone on each beat
// instead (lib/sound.js vibrate: a light tap on iPhone, a short buzz on Android).
import { vibrate } from '../sound.js'
import { tickGap } from './pace-beat.js'

const AHEAD = 0.12   // seconds of ticks booked ahead
const EVERY_MS = 25  // how often the booking is topped up

/** One soft tick at `t` (seconds on the context's clock). */
export function playTick(ctx, t, vol = 0.35) {
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = 'triangle'
  o.frequency.setValueAtTime(1900, t)
  o.frequency.exponentialRampToValueAtTime(1150, t + 0.03)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.002, vol), t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
  o.connect(g); g.connect(ctx.destination)
  o.start(t); o.stop(t + 0.06)
}

/**
 * `getCtx` gives the run's AudioContext (made by the tap on Start). `set` changes the beat at any
 * time, the next tick follows it; a beat of null (a walk, the cool-down) or `stop` goes quiet.
 */
export function createPacer({ getCtx, buzz = vibrate, tick = playTick, clock = () => performance.now(), every = EVERY_MS } = {}) {
  let timer = null
  let gap = null, vol = 0.35, sound = 'tick'
  let next = 0      // the next tick, on the audio clock
  let nextBuzz = 0  // the next buzz, on the page clock (ms)
  const pump = () => {
    if (!gap) return
    if (sound === 'buzz') {
      const n = clock()
      if (!nextBuzz || nextBuzz < n - 500) nextBuzz = n
      while (nextBuzz <= n + every) {
        const wait = Math.max(0, nextBuzz - n)
        setTimeout(() => buzz(18), wait)
        nextBuzz += gap * 1000
      }
      return
    }
    const ctx = getCtx?.()
    if (!ctx) return
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}) } catch { /* */ } }
    const t = ctx.currentTime
    if (next < t) next = t + 0.05
    while (next < t + AHEAD) { tick(ctx, next, vol); next += gap }
  }
  const stop = () => { if (timer) clearInterval(timer); timer = null; next = 0; nextBuzz = 0 }
  return {
    /** { spm, every, vol, sound }; spm null or 0 is quiet. */
    set({ spm, every: e = 1, vol: v = vol, sound: s = 'tick' } = {}) {
      const g = tickGap(spm, e)
      if (!g) { gap = null; stop(); return }
      if (s !== sound) { next = 0; nextBuzz = 0 }
      gap = g; vol = v; sound = s
      if (!timer) { timer = setInterval(pump, every); pump() }
    },
    stop() { gap = null; stop() },
    get running() { return !!timer },
  }
}
