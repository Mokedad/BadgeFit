// The vertical jump, estimated with the phone (components/TestDay.jsx JumpMeter). Held flat to the
// chest, the phone feels almost no gravity while you are in the air (free fall), then a spike when
// you land. The time in the air gives the height: h = g t² / 8. It reads a little under the wall
// test (no arm swing), so the member checks the number before it is kept.

export const FREE_G = 0.35        // below this (in g) the phone is falling with you
export const MIN_AIR_MS = 150     // shorter is a wobble, not a jump
export const MAX_AIR_MS = 900     // longer is the phone dropped, not a jump

/** Seconds in the air from samples [{ t: ms, g: total acceleration in g }]: the longest jump-length run of free fall. */
export function airTime(samples) {
  let best = 0, from = null
  const close = end => {
    if (from == null) return
    const ms = end - from
    if (ms >= MIN_AIR_MS && ms <= MAX_AIR_MS && ms > best) best = ms
    from = null
  }
  for (const s of samples || []) {
    if (!Number.isFinite(s?.g) || !Number.isFinite(s?.t)) continue
    if (s.g < FREE_G) { if (from == null) from = s.t } else close(s.t)
  }
  return best / 1000
}

/** Centimetres from seconds in the air, rounded; 0 for no jump. */
export const jumpCm = sec => (sec > 0 ? Math.round((9.81 * sec * sec / 8) * 100) : 0)

/** Total acceleration in g from a devicemotion event (with gravity), or NaN. */
export function gOf(e) {
  const a = e?.accelerationIncludingGravity
  if (!a || a.x == null) return NaN
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) / 9.81
}
