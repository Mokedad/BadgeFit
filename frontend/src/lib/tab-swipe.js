// Swipe left or right to move between the tabs, as well as tapping them (BadgeFit). On the
// BadgeFit hub the swipe moves between its own tabs (Today, Plan, PCT, More); on the app's root
// screens between Home, Plan, Stats and Exercises. The screen edges are left to the back swipe
// (lib/edge-swipe-back.js), and anything that moves sideways itself (a swipe row, a slider, a
// chart you can scroll, a sheet) keeps its own gesture.

export const APP_TABS = ['/home', '/plan', '/stats', '/library']
export const HUB_TABS = ['today', 'plan', 'tests', 'more']

const EDGE = 28, MIN = 70, MAX_MS = 700

/** -1 (to the tab on the left), +1 (right) or 0 for a touch that is not a tab swipe. */
export function swipeStep({ dx, dy, ms, startX, width }) {
  if (startX < EDGE || startX > width - EDGE) return 0
  if (ms > MAX_MS || Math.abs(dx) < MIN || Math.abs(dx) < Math.abs(dy) * 2.2) return 0
  return dx < 0 ? 1 : -1
}

/** Where a swipe by `step` lands: { path, search } to go to, or null (no tab that way, not a tab screen). */
export function swipeTarget(pathname, search, step) {
  if (!step) return null
  if (pathname === '/police') {
    const cur = new URLSearchParams(search || '').get('tab') || 'today'
    const i = HUB_TABS.indexOf(cur)
    if (i < 0) return null
    const next = HUB_TABS[i + step]
    return next ? { path: '/police', search: next === 'today' ? '' : '?tab=' + next } : null
  }
  const i = APP_TABS.indexOf(pathname)
  if (i < 0) return null
  const next = APP_TABS[i + step]
  return next ? { path: next, search: '' } : null
}

const OWN = 'input, textarea, select, [contenteditable], .tswipe, .sheet, .rp, .rp-mini, .bfi, .tour, canvas, [role="slider"], [data-noswipe]'

/** Whether the touched element, or something around it, uses sideways movement itself. */
export function ownsSideways(el) {
  if (!el || !el.closest) return false
  if (el.closest(OWN)) return true
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 8) {
      const o = getComputedStyle(n).overflowX
      if (o === 'auto' || o === 'scroll') return true
    }
  }
  return false
}

/** Listens for tab swipes; `go({ path, search })` moves there. Returns the uninstall. */
export function installTabSwipe(where, go) {
  let t0 = null
  const start = e => {
    const t = e.touches?.[0]
    t0 = e.touches?.length === 1 && t && !ownsSideways(e.target) ? { x: t.clientX, y: t.clientY, at: Date.now() } : null
  }
  const end = e => {
    const s = t0; t0 = null
    const t = e.changedTouches?.[0]
    if (!s || !t) return
    const step = swipeStep({ dx: t.clientX - s.x, dy: t.clientY - s.y, ms: Date.now() - s.at, startX: s.x, width: window.innerWidth })
    const { pathname, search } = where()
    const to = swipeTarget(pathname, search, step)
    if (to) go(to)
  }
  const cancel = () => { t0 = null }
  document.addEventListener('touchstart', start, { passive: true })
  document.addEventListener('touchend', end, { passive: true })
  document.addEventListener('touchcancel', cancel, { passive: true })
  return () => { document.removeEventListener('touchstart', start); document.removeEventListener('touchend', end); document.removeEventListener('touchcancel', cancel) }
}
