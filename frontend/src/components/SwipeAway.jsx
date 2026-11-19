// Swipe a card or a pop-up sideways to put it away (BadgeFit): instead of a "Not now", "Skip" or
// "Done" button. The card follows the finger; past a third of its width it slides off and
// `onAway` runs. A mostly vertical move is a scroll and leaves it be. A small ✕ stays for anyone
// who does not swipe (and for keyboards and screen readers).
import { useRef, useState } from 'react'
import Icon from './Icon.jsx'

export default function SwipeAway({ onAway, children, className = '', label = 'Hide', x = true }) {
  const at = useRef(null)
  const [dx, setDx] = useState(0)
  const [gone, setGone] = useState(false)
  const el = useRef(null)
  const away = dir => { setGone(true); setDx(dir * (el.current?.offsetWidth || 400) * 1.2); setTimeout(onAway, 180) }
  const down = e => { if (e.target.closest('button,a,input,textarea,select,[role="switch"]')) return; at.current = { x: e.clientX, y: e.clientY, on: false } }
  const move = e => {
    const s = at.current
    if (!s) return
    const mx = e.clientX - s.x, my = e.clientY - s.y
    if (!s.on) { if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { at.current = null; return } if (Math.abs(mx) > 10) s.on = true }
    if (s.on) setDx(mx)
  }
  const up = () => {
    const s = at.current; at.current = null
    if (!s?.on) return
    const w = el.current?.offsetWidth || 300
    if (Math.abs(dx) > w / 3) away(Math.sign(dx)); else setDx(0)
  }
  return <div ref={el} className={'swipe-away ' + className} style={{ transform: dx ? `translateX(${dx}px)` : undefined, opacity: dx ? Math.max(0.2, 1 - Math.abs(dx) / 400) : undefined, transition: at.current?.on ? 'none' : 'transform .18s ease, opacity .18s ease' }}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { at.current = null; setDx(0) }} aria-hidden={gone || undefined}>
    {x && <button type="button" className="swipe-x" aria-label={label} onClick={() => away(1)}><Icon name="xmark" /></button>}
    {children}
  </div>
}

/**
 * A flick that closes something: down for a sheet that sits at the bottom, up for a pop-up at the
 * top. Spread the result on the element. Returns pointer handlers; a short tap does nothing.
 */
export function useFlick(onClose, dir = 'down') {
  const at = useRef(null)
  return {
    onPointerDown: e => { at.current = { x: e.clientX, y: e.clientY } },
    onPointerUp: e => {
      const s = at.current; at.current = null
      if (!s) return
      const dx = e.clientX - s.x, dy = e.clientY - s.y
      const vertical = Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)
      if (vertical && (dir === 'down' ? dy > 0 : dy < 0)) onClose()
      else if (dir === 'up' && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) onClose()
    },
    onPointerCancel: () => { at.current = null },
  }
}
