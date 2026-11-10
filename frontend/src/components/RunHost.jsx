// Where the guided run lives (BadgeFit), mounted once in App: full screen, or a bar at the bottom
// of every screen while minimised, so a run keeps its time when you check something else and is
// one tap from coming back (store/useRun.js). Saves the finished run to the run log.
import { useStore } from '../store/useStore.js'
import { useRun } from '../store/useRun.js'
import { todayISO } from '../lib/format.js'
import { lazy, Suspense } from 'react'

const RunPlayer = lazy(() => import('./RunPlayer.jsx'))

export default function RunHost() {
  const run = useRun(s => s.run)
  const minimized = useRun(s => s.minimized)
  const P = useStore(s => s.S.police) || {}
  if (!run) return null
  // Saved the moment the run ends (finished or stopped early), so it counts; the effort and the
  // distance added on the done screen update the same entry.
  const log = entry => {
    const id = Date.now().toString(36)
    useStore.getState().update(s => {
      const p = s.police || {}
      s.police = { ...p, runLog: [...(p.runLog || []), { id, at: todayISO(), ...entry }].slice(-200) }
    })
    return id
  }
  const update = (id, patch) => useStore.getState().update(s => {
    const p = s.police || {}
    s.police = { ...p, runLog: (p.runLog || []).map(r => (r.id === id ? { ...r, ...patch } : r)) }
  })
  return <Suspense fallback={null}><div className="pf">
    <RunPlayer key={run.id} run={run} age={P.age} runLog={P.runLog || []} musicMode={!!P.musicMode}
      minimized={minimized} onMinimize={() => useRun.getState().minimize()} onRestore={() => useRun.getState().restore()}
      onClose={() => useRun.getState().close()} onLog={log} onUpdate={update} />
  </div></Suspense>
}
