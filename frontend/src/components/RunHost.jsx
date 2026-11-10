// Where the guided run lives (BadgeFit), mounted once in App: full screen, or a bar at the bottom
// of every screen while minimised, so a run keeps its time when you check something else and is
// one tap from coming back (store/useRun.js). Saves the finished run to the run log.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { useRun } from '../store/useRun.js'
import { todayISO } from '../lib/format.js'
import { lazy, Suspense } from 'react'

const RunPlayer = lazy(() => import('./RunPlayer.jsx'))

export default function RunHost() {
  const run = useRun(s => s.run)
  const minimized = useRun(s => s.minimized)
  const P = useStore(s => s.S.police) || {}
  if (!run) return null
  const log = entry => {
    useStore.getState().update(s => {
      const p = s.police || {}
      s.police = { ...p, runLog: [...(p.runLog || []), { id: Date.now().toString(36), at: todayISO(), ...entry }].slice(-200) }
    })
    useRun.getState().close()
    useUI.getState().toast('Run saved. That is another level banked. 🏁')
  }
  return <Suspense fallback={null}><div className="pf">
    <RunPlayer key={run.id} run={run} age={P.age} runLog={P.runLog || []} musicMode={!!P.musicMode}
      minimized={minimized} onMinimize={() => useRun.getState().minimize()} onRestore={() => useRun.getState().restore()}
      onClose={() => useRun.getState().close()} onLog={log} />
  </div></Suspense>
}
