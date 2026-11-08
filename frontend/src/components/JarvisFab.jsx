// Jarvis, always around (BadgeFit): a gold button in the Home header, and a floating orb on every
// other screen. Tap it and the call runs right there, no pop-up: the orb shows sound waves while
// he listens and talks (components/JarvisOrb.jsx), a tap sends or stops, ✕ ends the call
// (store/useJarvis.js). The call itself is components/JarvisLive.jsx, mounted here. Drag the
// orb anywhere; it snaps to the nearest side, and pushed against the edge it tucks half away. Its place is remembered on this device. Other screens
// open it with openJarvis() (e.g. the BadgeFit hub's "Ask Jarvis"). Shown to BadgeFit members
// with the Coach switched on.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { isOn } from '../lib/modules.js'
import { snapOrb, ORB } from '../lib/police/orb.js'
import { useJarvis, tapJarvis } from '../store/useJarvis.js'
import JarvisOrb, { JarvisEnd, PHASE_LABEL } from './JarvisOrb.jsx'

const JarvisLive = lazy(() => import('./JarvisLive.jsx'))
const KEY = 'badgefit_jarvis_orb'

/** Starts (or taps) Jarvis from anywhere: the Home header, the BadgeFit hub. */
export const openJarvis = () => tapJarvis()

const loadPos = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } }
const savePos = p => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* private mode */ } }
const view = () => ({ w: window.innerWidth, h: window.innerHeight })

export default function JarvisFab() {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const loc = useLocation()
  const active = useJarvis(s => s.active)
  const phase = useJarvis(s => s.phase)
  const [pos, setPos] = useState(() => snapOrb(loadPos() || { side: 'right', y: 0.72, tucked: false }, view()))
  const drag = useRef(null)
  const on = !!user && !!S.police?.level && isOn(S, 'coach')

  useEffect(() => {
    const r = () => setPos(p => snapOrb(p, view()))
    window.addEventListener('resize', r)
    return () => window.removeEventListener('resize', r)
  }, [])

  useEffect(() => { if (!on && active) useJarvis.getState().end() }, [on, active])
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
    if (!d.moved) { tapJarvis(); return }
    const p = snapOrb({ drop: { x: e.clientX, y: e.clientY } }, view())
    setPos(p); savePos(p)
  }

  const style = pos.free
    ? { left: pos.free.x - ORB / 2, top: pos.free.y - ORB / 2 }
    : { top: pos.top, [pos.side]: pos.tucked ? -ORB * 0.55 : 12 }
  // Home has Jarvis in its header (views/Home.jsx), so no floating orb there.
  const onHome = loc.pathname === '/home' || loc.pathname === '/'
  return <>
    {!onHome && <div className={'jarvis-fab' + (pos.free ? ' dragging' : '') + (pos.tucked && !active ? ' tucked' : '') + (active ? ' live' : '')} style={pos.tucked && active ? { ...style, [pos.side]: 12 } : style}>
      <button type="button" className="jarvis-fab-b"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; setPos(p => snapOrb(p.free ? { drop: p.free } : p, view())) }}
        aria-label={active ? PHASE_LABEL[phase] : 'Talk to Jarvis'} title="Jarvis: tap to talk, drag to move">
        <JarvisOrb />
      </button>
      <JarvisEnd />
    </div>}
    {active && <Suspense fallback={null}><div className="pf"><JarvisLive /></div></Suspense>}
  </>
}
