// A shuffle that stays the same all day and changes tomorrow: the Exercises list "mixed for
// today" (views/Library.jsx), so the order is fresh without jumping on every render.
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
function rng(seed) { let a = seed; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

/** A copy of `list` in an order fixed by `seed` (e.g. today's date). */
export function dailyShuffle(list, seed) {
  const out = (list || []).slice()
  const r = rng(hash(seed))
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]] }
  return out
}
