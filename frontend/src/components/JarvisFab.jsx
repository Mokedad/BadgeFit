// Jarvis, always around (BadgeFit): a small gold orb above the tab bar on every screen, one tap
// to the live conversation (components/JarvisLive.jsx). Lazy: the conversation's code loads on
// the first tap. Shown to BadgeFit members with the Coach switched on; hidden on the BadgeFit hub
// (Jarvis has his own card there) and during a guided run (the run screen covers it anyway).
import { lazy, Suspense, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { isOn } from '../lib/modules.js'

const JarvisLive = lazy(() => import('./JarvisLive.jsx'))

export default function JarvisFab() {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  if (!user || !S.police?.level || !isOn(S, 'coach')) return null
  const onHub = loc.pathname === '/police'
  const inWorkout = loc.pathname === '/workout'
  const greet = (() => { const h = new Date().getHours(); return h < 12 ? 'Morning.' : h < 18 ? 'Afternoon.' : 'Evening.' })()
  return <>
    {!onHub && !open && <button type="button" className={'jarvis-fab' + (inWorkout ? ' in-workout' : '')} onClick={() => setOpen(true)} aria-label="Talk to Jarvis" title="Talk to Jarvis">
      <span className="jarvis-fab-orb" aria-hidden="true" />
    </button>}
    {open && <Suspense fallback={null}><div className="pf"><JarvisLive opener={inWorkout ? `${greet} How is the session going?` : `${greet} What do you need?`} onClose={() => setOpen(false)} /></div></Suspense>}
  </>
}
