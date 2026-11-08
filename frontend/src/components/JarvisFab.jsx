// Jarvis's question-and-answer call (BadgeFit): no button of its own. The 🎤 in the workout
// header starts it (tapJarvis, store/useJarvis.js); the call itself is components/JarvisLive.jsx,
// mounted here, outside any screen, so a reply still arrives when you move on. Ended when the
// member stops being one or the admin switches the Coach off. The spoken workout cues are
// components/JarvisWorkout.jsx.
import { lazy, Suspense, useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { isOn } from '../lib/modules.js'
import { useJarvis, tapJarvis } from '../store/useJarvis.js'

const JarvisLive = lazy(() => import('./JarvisLive.jsx'))

/** Starts (or taps) Jarvis's call from anywhere. */
export const openJarvis = () => tapJarvis()

export default function JarvisFab() {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const active = useJarvis(s => s.active)
  const on = !!user && !!S.police?.level && isOn(S, 'coach')
  useEffect(() => { if (!on && active) useJarvis.getState().end() }, [on, active])
  if (!on || !active) return null
  return <Suspense fallback={null}><div className="pf"><JarvisLive /></div></Suspense>
}
