// Today's box on Home (BadgeFit): swipe it left for Remove, or hold it for Remove / Swap, the way
// a list row is cleared on a phone. Remove makes today a rest day (nothing is deleted from the
// history). A tap still reaches the row inside.
import { useRef, useState } from 'react'

const OPEN = 96, HOLD_MS = 550

export default function TodaySwipe({ enabled, onRemove, onHold, children }) {
  const [dx, setDx] = useState(0)
  const g = useRef(null)
  const ate = useRef(false) // the click that ends a swipe or a hold is not a tap
  if (!enabled) return children
  const down = e => {
    g.current = { x: e.clientX, y: e.clientY, base: dx, moved: false, held: false }
    g.current.timer = setTimeout(() => { if (g.current && !g.current.moved) { g.current.held = true; ate.current = true; try { navigator.vibrate?.(15) } catch { /* none */ } onHold() } }, HOLD_MS)
  }
  const move = e => {
    const s = g.current
    if (!s) return
    const mx = e.clientX - s.x, my = e.clientY - s.y
    if (!s.moved && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) { s.moved = true; clearTimeout(s.timer) }
    else if (!s.moved && Math.abs(my) > 8) { clearTimeout(s.timer); g.current = null; return }
    if (s.moved) setDx(Math.max(-OPEN * 1.3, Math.min(0, s.base + mx)))
  }
  const up = () => {
    const s = g.current
    g.current = null
    if (!s) return
    clearTimeout(s.timer)
    if (s.moved) { ate.current = true; setDx(dx < -OPEN / 2 ? -OPEN : 0) }
  }
  // A swipe or a hold is not also a tap on the row.
  // A tap on an open row closes it.
  const click = e => {
    if (ate.current) { ate.current = false; e.stopPropagation(); e.preventDefault(); return }
    if (dx !== 0) { e.stopPropagation(); e.preventDefault(); setDx(0) }
  }
  return <div className="tswipe">
    <button type="button" className="tswipe-del" onClick={() => { setDx(0); onRemove() }} tabIndex={dx ? 0 : -1} aria-hidden={dx ? undefined : true}>🗑<span>Remove</span></button>
    <div className="tswipe-fg" style={{ transform: `translateX(${dx}px)`, transition: g.current ? 'none' : 'transform .2s' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={click}
      onContextMenu={e => e.preventDefault()}>{children}</div>
  </div>
}
