// Hayden's two small cards on Home (BadgeFit), the "trigger" that brings someone back:
//  - the comeback: two or more planned days missed in a row before today. Said kindly, once a day,
//    with a short session to get going again;
//  - the check-in: one small question for someone back after 3 or more days away, at most once a
//    week, so the owner hears what nearly made people stop (POST /api/feedback, the numbers page).
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

const days = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY)

/**
 * A visit to the app today: the day is remembered, and someone back after 3 or more days away is
 * asked Hayden's question today. Returns the patch for S.police, or null when today is noted.
 */
export function visitPatch(P, today) {
  if (P?.seenOn === today) return null
  const away = P?.seenOn && days(P.seenOn, today) >= 3
  return { seenOn: today, ...(away ? { askOn: today } : {}) }
}

/** Show the check-in: back today after 3+ days away, signed in, and not asked in the last week. */
export function showCheckin(S, today, signedIn) {
  const P = S.police || {}
  if (!signedIn || P.askOn !== today) return false
  if (P.askedOn && days(P.askedOn, today) < 7) return false
  return (S.workouts || []).length > 0
}

export const CHECKIN_Q = 'What nearly made you stop using BadgeFit?'
