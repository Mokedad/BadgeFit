// Where the guided run lives (BadgeFit), mounted once in App: full screen, or a bar at the bottom
// of every screen while minimised, so a run keeps its time when you check something else and is
// one tap from coming back (store/useRun.js). Saves the finished run to the run log.
import { useStore } from '../store/useStore.js'
import { useRun } from '../store/useRun.js'
import { todayISO } from '../lib/format.js'
import { lazy, Suspense, useEffect } from 'react'
import { pocketKeep } from '../lib/police/pocket.js'
import { effectiveRoutineIds } from '../lib/history.js'
import { runCredits, runWorkout } from '../lib/police/run-workout.js'
import { stampWorkout } from '../lib/sync-merge.js'

const RunPlayer = lazy(() => import('./RunPlayer.jsx'))

export default function RunHost() {
  const run = useRun(s => s.run)
  const minimized = useRun(s => s.minimized)
  const P = useStore(s => s.S.police) || {}
  // Hayden in your pocket (the iPhone app): awake behind the lock screen for as long as a run, a
  // walk or a gym session is on, so his lines still play (lib/police/pocket.js).
  const training = useStore(s => !!s.S.active) || !!run
  useEffect(() => { pocketKeep(training) }, [training])
  if (!run) return null
  // Saved the moment the run ends (finished or stopped early), so it counts; the effort and the
  // distance added on the done screen update the same entry.
  // It is also saved as the day's workout (lib/police/run-workout.js), so the day reads complete
  // wherever a workout does, and the planned run is ticked off.
  const log = entry => {
    const id = Date.now().toString(36)
    useStore.getState().update(s => {
      const p = s.police || {}
      const at = todayISO()
      const row = { id, at, ...entry }
      // The route is kept for the last 10 runs only: 200 routes would weigh the synced profile down.
      const log = [...(p.runLog || []), row].slice(-200)
      const keep = new Set(log.filter(r => r.route).slice(-10).map(r => r.id))
      s.police = { ...p, runLog: log.map(r => (r.route && !keep.has(r.id) ? (({ route, ...rest }) => rest)(r) : r)) }
      let ids = []
      try { ids = runCredits(p, effectiveRoutineIds(s, at), entry.run, at) } catch { /* no plan */ }
      s.workouts = [...(s.workouts || []), stampWorkout(runWorkout({ run, entry: row, routineIds: ids }))]
    })
    return id
  }
  const unlog = id => useStore.getState().update(s => {
    const p = s.police || {}
    s.police = { ...p, runLog: (p.runLog || []).filter(r => r.id !== id) }
    s.workouts = (s.workouts || []).filter(w => w.runLogId !== id)
  })
  const update = (id, patch) => useStore.getState().update(s => {
    const p = s.police || {}
    s.police = { ...p, runLog: (p.runLog || []).map(r => (r.id === id ? { ...r, ...patch } : r)) }
    if ('km' in patch) {
      s.workouts = (s.workouts || []).map(w => (w.runLogId !== id ? w : stampWorkout({ ...w, entries: w.entries.map(e => ({ ...e, sets: e.sets.map(x => { const y = { ...x }; if (patch.km) y.km = patch.km; else delete y.km; return y }) })) })))
    }
  })
  return <Suspense fallback={null}><div className="pf">
    <RunPlayer key={run.id} run={run} age={P.age} runLog={P.runLog || []} gps={!!P.gpsRuns} onGps={on => useStore.getState().update(s => { s.police = { ...(s.police || {}), gpsRuns: on } })}
      musicMode={!!P.musicMode} onMusic={on => useStore.getState().update(s => { s.police = { ...(s.police || {}), musicMode: on } })}
      minimized={minimized} onMinimize={() => useRun.getState().minimize()} onRestore={() => useRun.getState().restore()}
      onClose={() => useRun.getState().close()} onLog={log} onUpdate={update} onUnlog={unlog} />
  </div></Suspense>
}
