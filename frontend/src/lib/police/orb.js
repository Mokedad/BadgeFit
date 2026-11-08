// Where Jarvis's floating orb sits (components/JarvisFab.jsx): always on the left or right side,
// at a height kept clear of the top bar and the tab bar, and "tucked" half off the screen when it
// was dropped against the edge. Positions are stored as a side plus a height fraction, so they
// survive a rotation or a different window size.
export const ORB = 52
const EDGE = 28 // dropped this close to the edge = tucked away
const TOP = 130, BOTTOM = 150 // clear of the header (and a screen's own tabs) and the tab bar

/** From a stored { side, y, tucked } or a drop { drop: { x, y } }: { side, y, tucked, top }. */
export function snapOrb(p, { w, h }) {
  let side = p?.side === 'left' ? 'left' : 'right'
  let y = Number.isFinite(p?.y) ? p.y : 0.72
  let tucked = !!p?.tucked
  if (p?.drop) {
    side = p.drop.x < w / 2 ? 'left' : 'right'
    tucked = p.drop.x < EDGE || p.drop.x > w - EDGE
    y = h > 0 ? p.drop.y / h : 0.72
  }
  const lo = TOP, hi = Math.max(lo, h - BOTTOM - ORB)
  const top = Math.round(Math.min(hi, Math.max(lo, y * h - ORB / 2)))
  return { side, y: h > 0 ? Math.min(1, Math.max(0, (top + ORB / 2) / h)) : y, tucked, top }
}
