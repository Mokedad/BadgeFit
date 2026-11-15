// The Start sheet's round buttons (components/StartPicker.jsx) and the run tab's row of run
// types: which picks to show, in what order, and which one is lit as today's suggestion.
import { runById } from './runs.js'

// One icon per kind of run (components/Icon.jsx), drawn on the round buttons.
export const CAT_ICON = {
  base: 'figureRun', vo2: 'flame', intervals: 'bolt', tempo: 'gauge',
  beep: 'speaker', recovery: 'heart', walk: 'steps',
}

// Every pick the sheet knows, in the order used when nothing has been done yet.
export const PICKS = {
  today: { id: 'today', label: 'Today' },
  run: { id: 'run', label: 'Run', icon: 'figureRun' },
  beep: { id: 'beep', label: 'Beep test', icon: 'speaker' },
  gym: { id: 'gym', label: 'Gym', icon: 'dumbbell' },
  walk: { id: 'walk', label: 'Walk', icon: 'steps' },
}
const ORDER = ['run', 'beep', 'gym', 'walk']

/** How often each pick was used lately: runs and walks from the run log, beep tests, workouts. */
export function pickCounts(S) {
  const P = S?.police || {}
  const c = { run: 0, beep: 0, gym: 0, walk: 0 }
  for (const r of (P.runLog || []).slice(-60)) {
    const cat = runById(r.run)?.cat
    if (cat === 'walk') c.walk++
    else if (cat === 'beep') c.beep++
    else c.run++
  }
  c.beep += (P.results || []).slice(-60).filter(r => r.id === 'beep').length
  c.gym += (S?.workouts || []).slice(-60).length
  return c
}

/**
 * The four round buttons. `today` is today's planned session ({ kind: 'run' | 'gym', done }) or
 * null on a rest day. Today's session comes first while it is still to do; the rest follow by
 * how often they were used, the default order breaking ties. `guest` leaves Gym out unless it is
 * today's session (a guest keeps to the simple plan). `lit` is the one Hayden suggests: today's
 * session, or a walk on a rest day.
 */
export function topPicks(S, { today = null, guest = false } = {}) {
  const counts = pickCounts(S)
  const rest = ORDER.filter(id => !(guest && id === 'gym'))
    .map((id, i) => ({ id, i, n: counts[id] }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map(x => x.id)
  const todo = today && !today.done
  const picks = (todo ? ['today', ...rest] : rest).slice(0, 4)
    .map(id => id === 'today' ? { ...PICKS.today, icon: today.kind === 'run' ? 'figureRun' : 'dumbbell' } : PICKS[id])
  const lit = todo ? 'today' : !today ? 'walk' : null
  return { picks, lit: picks.some(p => p.id === lit) ? lit : null }
}
