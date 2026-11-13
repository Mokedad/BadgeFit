// Hayden's own voice when he reacts (a tap, a drop): no words, a few robot beeps and chirps in
// the tune of what he feels, the way a little robot "says" things. `chirps` is pure (tested);
// `beep` plays it with Web Audio. Volume is the member's: S.police.botBeeps 0 (off) to 1.
export const MOODS = ['happy', 'excited', 'curious', 'proud', 'sleepy', 'love', 'whoa']
export const CHIRP_LEVELS = [{ value: 0, label: 'Off' }, { value: 0.35, label: 'Quiet' }, { value: 0.8, label: 'Loud' }]
export const beepVolume = P => (P?.botBeeps == null ? 0.35 : Number(P.botBeeps) || 0)

// Each mood is a shape: how many syllables, where the pitch sits and which way it bends.
const SHAPE = {
  happy: { n: [3, 4], base: 880, spread: 360, bend: 1.25, dur: 0.09 },
  excited: { n: [5, 6], base: 1050, spread: 500, bend: 1.4, dur: 0.06 },
  curious: { n: [2, 3], base: 700, spread: 200, bend: 1.6, dur: 0.12, rise: true },
  proud: { n: [3, 3], base: 620, spread: 260, bend: 1.15, dur: 0.12 },
  sleepy: { n: [2, 2], base: 520, spread: 80, bend: 0.7, dur: 0.22 },
  love: { n: [2, 2], base: 760, spread: 120, bend: 1.3, dur: 0.16, warble: true },
  whoa: { n: [1, 1], base: 1300, spread: 0, bend: 0.45, dur: 0.38 },
}

/** The syllables for a mood: [{ f0, f1, dur, gap, wave }] (Hz, seconds). */
export function chirps(mood = 'happy', rand = Math.random) {
  const s = SHAPE[mood] || SHAPE.happy
  const n = s.n[0] + Math.floor(rand() * (s.n[1] - s.n[0] + 1))
  return Array.from({ length: n }, (_, i) => {
    const f0 = Math.round(s.base + (rand() - 0.5) * 2 * s.spread)
    const last = i === n - 1
    const bend = s.rise && last ? 1.8 : s.bend * (0.85 + rand() * 0.3)
    return { f0, f1: Math.round(f0 * bend), dur: +(s.dur * (0.8 + rand() * 0.5)).toFixed(3), gap: +(0.025 + rand() * 0.04).toFixed(3), wave: s.warble || i % 2 ? 'triangle' : 'square' }
  })
}

let ctx = null
/** Plays a mood's beeps at `volume` (0 to 1). Silent, and harmless, where audio is not allowed. */
export function beep(mood, volume = 0.35) {
  if (!(volume > 0)) return false
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') ctx.resume()
    let t = ctx.currentTime + 0.02
    for (const c of chirps(mood)) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = c.wave
      o.frequency.setValueAtTime(c.f0, t)
      o.frequency.exponentialRampToValueAtTime(Math.max(60, c.f1), t + c.dur)
      const peak = 0.18 * volume * (c.wave === 'square' ? 0.55 : 1)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, t + c.dur)
      o.connect(g).connect(ctx.destination)
      o.start(t); o.stop(t + c.dur + 0.02)
      t += c.dur + c.gap
    }
    return true
  } catch { return false }
}
