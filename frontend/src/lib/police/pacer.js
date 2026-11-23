// The pace sound's clock (components/PaceButton.jsx). A metronome cannot run on page timers alone:
// they drift and stall by tens of milliseconds, which a runner hears. So ticks are booked ahead on
// the Web Audio clock and topped up every 25 ms, the usual way a web metronome is built. The
// booking reaches 1.5 s ahead: Low Power Mode slows page timers down, and a short booking ran dry
// between top-ups, so the tick went quiet. A new beat takes back the ticks booked for the old one,
// so a change of pace still lands at once.
// A tick is short, soft and high, so it sits under music; the page's audio already mixes with
// whatever plays (lib/sound.js), so Spotify keeps going. "Buzz" taps the phone on each beat
// instead (lib/sound.js vibrate: a light tap on iPhone, a short buzz on Android).
import { vibrate } from '../sound.js'
import { tickGap } from './pace-beat.js'

const AHEAD = 1.5    // seconds of ticks booked ahead
const BUZZ_AHEAD = 1000 // ms of buzzes booked ahead
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
  return o
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
  let booked = []   // ticks booked and not yet heard: { t, node }
  let buzzes = []   // buzzes booked: timeout ids
  // Takes back what was booked for later (a new beat, a stop): those ticks never sound.
  const unbook = () => {
    const ctx = getCtx?.()
    const now = ctx ? ctx.currentTime : 0
    const keep = []
    for (const b of booked) {
      if (b.t > now + 0.02) { try { b.node?.stop?.(0) } catch { /* already gone */ } } else keep.push(b)
    }
    booked = keep
    for (const id of buzzes) clearTimeout(id)
    buzzes = []
    return keep.length ? keep[keep.length - 1].t : null
  }
  const pump = () => {
    if (!gap) return
    if (sound === 'buzz') {
      const n = clock()
      if (!nextBuzz || nextBuzz < n - 500) nextBuzz = n
      buzzes = buzzes.slice(-64)
      while (nextBuzz <= n + BUZZ_AHEAD) {
        const wait = Math.max(0, nextBuzz - n)
        buzzes.push(setTimeout(() => buzz(18), wait))
        nextBuzz += gap * 1000
      }
      return
    }
    const ctx = getCtx?.()
    if (!ctx) return
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}) } catch { /* */ } }
    const t = ctx.currentTime
    if (next < t) next = t + 0.05
    booked = booked.filter(b => b.t > t - 0.1)
    while (next < t + AHEAD) { booked.push({ t: next, node: tick(ctx, next, vol) }); next += gap }
  }
  const stop = () => { if (timer) clearInterval(timer); timer = null; unbook(); next = 0; nextBuzz = 0 }
  return {
    /** { spm, every, vol, sound }; spm null or 0 is quiet. */
    set({ spm, every: e = 1, vol: v = vol, sound: s = 'tick' } = {}) {
      const g = tickGap(spm, e)
      if (!g) { gap = null; stop(); return }
      if (g !== gap || v !== vol || s !== sound) {
        // The old beat's booked ticks go; the new one starts a beat after the last one heard.
        const last = unbook()
        next = last != null && s === sound ? last + g : 0
        nextBuzz = 0
      }
      gap = g; vol = v; sound = s
      if (!timer) { timer = setInterval(pump, every); pump() }
    },
    stop() { gap = null; stop() },
    get running() { return !!timer },
  }
}
