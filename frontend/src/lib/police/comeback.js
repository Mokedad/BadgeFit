// Hayden's two small cards on Home (BadgeFit), the "trigger" that brings someone back:
//  - the comeback: two or more planned days missed in a row before today. Said kindly, once a day,
//    with a short session to get going again;
//  - the check-in: one question a week after starting, once, so the owner hears what nearly made
//    people stop (POST /api/feedback, shown on the owner's numbers page).
import { effectiveRoutineIds } from '../history.js'
import { excusedOn } from '../day-notes.js'

const DAY = 86400000
const back = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') - n * DAY).toISOString().slice(0, 10)
const trainedOn = (S, iso) => (S.workouts || []).some(w => w.d === iso) || (S.police?.runLog || []).some(r => r.at === iso)

/** Planned days missed in a row just before `today` (a rest day or a day with a note does not
 *  break the run or count). Stops at the plan's start and at a week back. */
export function missedInARow(S, today) {
  const start = S.police?.start || '0000'
  let n = 0
  for (let i = 1; i <= 7; i++) {
    const d = back(today, i)
    if (d < start) break
    if (trainedOn(S, d)) break
    if (excusedOn(S, d) || !effectiveRoutineIds(S, d).length) continue
    n++
  }
  return n
}

/** Show the comeback card today: 2+ missed, nothing trained yet today, not waved off today. */
export const showComeback = (S, today) => !!S.police?.level && !S.active && !trainedOn(S, today) && S.police?.comebackOff !== today && missedInARow(S, today) >= 2

/** Show the check-in: a week or more since the plan started, signed in, not answered or skipped. */
export function showCheckin(S, today, signedIn) {
  const start = S.police?.start
  if (!signedIn || !start || S.police?.checkin) return false
  return Date.parse(today + 'T12:00:00Z') - Date.parse(start + 'T12:00:00Z') >= 7 * DAY && (S.workouts || []).length > 0
}

export const CHECKIN_Q = 'What nearly made you stop using BadgeFit?'
