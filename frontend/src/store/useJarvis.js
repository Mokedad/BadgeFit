// Jarvis's call (BadgeFit), shared by the places that show him: the button in the Home header and
// the floating orb on the other screens (components/JarvisFab.jsx). The call itself runs in
// components/JarvisLive.jsx, which puts its phase and its tap action here. No pop-up by default:
// the button itself shows what is happening; `panel` opens the small card only when typing is
// needed (no speech recognition, or the microphone is blocked).
import { create } from 'zustand'

export const useJarvis = create(set => ({
  active: false,
  phase: 'idle', // idle | listening | thinking | speaking
  panel: false,
  tap: null, // set by the running call: finish listening, stop talking, or listen again
  start: () => set(s => (s.active ? s : { active: true, phase: 'idle', panel: false })),
  end: () => set({ active: false, phase: 'idle', panel: false, tap: null }),
}))

/** The button's tap: start a call, or act on the one running. */
export function tapJarvis() {
  const j = useJarvis.getState()
  if (!j.active) j.start()
  else if (j.tap) j.tap()
}
