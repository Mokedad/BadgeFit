// Jarvis, always around (BadgeFit): a small gold orb floating on every screen. Tap it and the
// conversation opens as a floating panel (components/JarvisLive.jsx) over the bottom of the
// screen, not over all of it; – minimises it back to the orb and the chat carries on (a reply
// still arrives and is spoken). Drag the orb anywhere; it snaps to the nearest side, and pushed
// against the edge it tucks half away. Its place is remembered on this device. Other screens
// open it with openJarvis() (e.g. the BadgeFit hub's "Ask Jarvis"). Shown to BadgeFit members
// with the Coach switched on.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { isOn } from '../lib/modules.js'
import { snapOrb, ORB } from '../lib/police/orb.js'

const JarvisLive = lazy(() => import('./JarvisLive.jsx'))
const KEY = 'badgefit_jarvis_orb'
const EVENT = 'badgefit:jarvis'

/** Opens Jarvis from anywhere, with an optional first line from him. */
export const openJarvis = opener => window.dispatchEvent(new CustomEvent(EVENT, { detail: { opener } }))

const loadPos = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
const savePos = p => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* private mode */ } }
const view = () => ({ w: window.innerWidth, h: window.innerHeight })

export default function JarvisFab() {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const loc = useLocation()
  const [mounted, setMounted] = useState(null) // { opener } once opened, until closed
  const [shown, setShown] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [pos, setPos] = useState(() => snapOrb(loadPos() || { side: 'right', y: 0.72, tucked: false }, view()))
  const drag = useRef(null)
  const on = !!user && !!S.police?.level && isOn(S, 'coach')

  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Morning.' : h < 18 ? 'Afternoon.' : 'Evening.' }
  const open = opener => {
    setMounted(m => m || { opener: opener || `${greet()} ${loc.pathname === '/workout' ? 'How is the session going?' : 'What do you need?'}` })
    setShown(true)
  }
  useEffect(() => {
    const h = e => open(e.detail?.opener)
    window.addEventListener(EVENT, h)
    return () => window.removeEventListener(EVENT, h)
  }) // re-bound each render so `open` sees the current screen
  useEffect(() => {
    const r = () => setPos(p => snapOrb(p, view()))
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])

  if (!on) return null

  const down = e => {
    drag.current = { x0: e.clientX, y0: e.clientY, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = e => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 8) return
    d.moved = true
    setPos({ free: { x: e.clientX, y: e.clientY } })
  }
  const up = e => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) { open(); return }
    const p = snapOrb({ drop: { x: e.clientX, y: e.clientY } }, view())
    setPos(p); savePos(p)
  }

  const style = pos.free
    ? { left: pos.free.x - ORB / 2, top: pos.free.y - ORB / 2 }
    : { top: pos.top, [pos.side]: pos.tucked ? -ORB * 0.55 : 12 }
  const busy = mounted && phase !== 'idle'
  return <>
    {!shown && <button type="button" className={'jarvis-fab' + (pos.free ? ' dragging' : '') + (pos.tucked ? ' tucked' : '') + (busy ? ' busy' : '') + (mounted ? ' live' : '')} style={style}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; setPos(p => snapOrb(p.free ? { drop: p.free } : p, view())) }}
      aria-label={mounted ? 'Open Jarvis (conversation running)' : 'Talk to Jarvis'} title="Jarvis: tap to talk, drag to move">
      <span className="jarvis-fab-orb" aria-hidden="true" />
    </button>}
    {mounted && <Suspense fallback={null}><div className="pf">
      <JarvisLive opener={mounted.opener} hidden={!shown} onPhase={setPhase} onMinimize={() => setShown(false)} onClose={() => { setShown(false); setMounted(null); setPhase('idle') }} />
    </div></Suspense>}
  </>
}
