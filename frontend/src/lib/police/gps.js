// GPS for a run or walk (BadgeFit), the way a running app tracks one: distance, pace, a split per
// kilometre and the route. Pure: fixes in ({ lat, lon, acc, t }), numbers out. The phone's GPS
// jitters while you stand still and jumps when it loses the sky, so a fix only counts when it is
// accurate enough, far enough from the last one, and not faster than anyone runs.

const R = 6371000
const rad = d => d * Math.PI / 180
/** Metres between two points (haversine). */
export function metresBetween(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const GPS = { maxAcc: 35, minMove: 4, maxSpeed: 9 } // metres, metres, m/s (a 1:51 km)
export const emptyTrack = () => ({ pts: [], m: 0, splits: [], lastSplitT: null, lastSplitM: 0 })

/**
 * Adds a fix to a track (returns the same track, changed): distance grows, and each kilometre
 * passed closes a split ({ km, sec }). `paused`: the fix moves the anchor but adds no distance,
 * so a walk to the tap during a pause is not run.
 */
export function addFix(track, fix, { paused = false } = {}) {
  if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lon)) return track
  if (fix.acc != null && fix.acc > GPS.maxAcc) return track
  const last = track.pts[track.pts.length - 1]
  if (!last) { track.pts.push({ ...fix, skip: paused }); track.lastSplitT = fix.t; return track }
  const d = metresBetween(last, fix)
  const dt = Math.max(0.001, (fix.t - last.t) / 1000)
  if (d < GPS.minMove) return track
  if (d / dt > GPS.maxSpeed) return track
  if (paused || last.skip) { track.pts.push({ ...fix, skip: paused }); if (!paused) track.lastSplitT ??= fix.t; return track }
  track.m += d
  track.pts.push(fix)
  while (track.m - track.lastSplitM >= 1000) {
    // The moment the kilometre was crossed, between the last two fixes.
    const over = track.m - track.lastSplitM - 1000
    const tCross = fix.t - (over / d) * (fix.t - last.t)
    track.splits.push({ km: track.splits.length + 1, sec: Math.round((tCross - track.lastSplitT) / 1000) })
    track.lastSplitT = tCross
    track.lastSplitM += 1000
  }
  return track
}

/** Seconds per kilometre for a distance in metres over seconds, or null (too short to say). */
export const paceOf = (m, sec) => (m >= 50 && sec > 0 ? sec / (m / 1000) : null)
/** "5:42" for seconds per km. */
export const fmtPace = p => (p == null || !Number.isFinite(p) ? '–' : `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, '0')}`.replace(/:60$/, ':59'))
/** Kilometres to two places, as a number. */
export const kmOf = m => Math.round(m / 10) / 100

/** The pace over the last `windowSec` of running, from the track's own fixes. */
export function livePace(track, now, windowSec = 30) {
  const pts = track.pts.filter(p => !p.skip && now - p.t <= windowSec * 1000)
  if (pts.length < 2) return null
  let m = 0
  for (let i = 1; i < pts.length; i++) m += metresBetween(pts[i - 1], pts[i])
  return paceOf(m, (pts[pts.length - 1].t - pts[0].t) / 1000)
}

/** The route thinned to at most `max` points ([lat, lon] to 5 places), to keep with the run. */
export function thinRoute(pts, max = 250) {
  const use = pts.filter(p => !p.skip)
  if (!use.length) return []
  const step = Math.max(1, Math.ceil(use.length / max))
  const out = use.filter((_, i) => i % step === 0 || i === use.length - 1)
  return out.map(p => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5])
}

/** An SVG path for a route ([lat, lon] pairs) fitted into w × h, north up. '' for under 2 points. */
export function routePath(route, w = 300, h = 160, pad = 10) {
  if (!route || route.length < 2) return ''
  const lat0 = route.reduce((a, p) => a + p[0], 0) / route.length
  const xy = route.map(([lat, lon]) => [lon * Math.cos(rad(lat0)), -lat])
  const xs = xy.map(p => p[0]), ys = xy.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const s = Math.min((w - 2 * pad) / Math.max(1e-9, maxX - minX), (h - 2 * pad) / Math.max(1e-9, maxY - minY))
  const ox = (w - (maxX - minX) * s) / 2, oy = (h - (maxY - minY) * s) / 2
  return xy.map(([x, y], i) => `${i ? 'L' : 'M'}${((x - minX) * s + ox).toFixed(1)} ${((y - minY) * s + oy).toFixed(1)}`).join('')
}
