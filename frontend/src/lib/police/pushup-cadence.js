// Push-ups to a cadence (components/TestDay.jsx): down on the low beep, up on the high beep, one
// rep every three seconds ("1 and 2, down, 1 and 2, up"), Hayden counting each rep. Stopping is
// where the member could not keep the pace; 25 at the pace is a pass.
export const REP_MS = 3000

/** Where the cadence is `ms` after the first beep: reps done so far and which half (down, up). */
export function cadenceAt(ms) {
  if (!(ms >= 0)) return { reps: 0, phase: 'ready' }
  return { reps: Math.floor(ms / REP_MS), phase: ms % REP_MS < REP_MS / 2 ? 'down' : 'up' }
}
