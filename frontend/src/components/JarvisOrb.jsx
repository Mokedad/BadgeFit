// What Jarvis's button shows (BadgeFit), in the Home header and on the floating orb: the gold orb
// at rest, sound waves while he listens or talks, a pulse while he thinks. English only.
import { useJarvis } from '../store/useJarvis.js'
import '../police.css'

export const PHASE_LABEL = { idle: 'Talk to Jarvis', listening: 'Jarvis is listening. Tap when done', thinking: 'Jarvis is thinking', speaking: 'Jarvis is talking. Tap to stop' }

export default function JarvisOrb() {
  const active = useJarvis(s => s.active)
  const phase = useJarvis(s => s.phase)
  const live = active && (phase === 'listening' || phase === 'speaking')
  return <span className={'jo ' + (active ? phase : 'off')} aria-hidden="true">
    {live ? <span className="jo-waves"><i /><i /><i /><i /></span> : <span className="jarvis-fab-orb" />}
  </span>
}
