// What a member's bot shares with bots nearby and followers (api/nearby.js cleans it again on the
// server): first name, line colour, earned gear and three numbers. Nothing else of theirs.
import { lineColour, earnedGear } from './bot-look.js'
import { readiness } from './standards.js'
import { stageOf } from './community.js'
import { todayNow } from './today-now.js'
import { isoOf } from '../format.js'

const monday = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10) }

/** Sessions logged this week (Monday on). */
export const sessionsThisWeek = (S, now = new Date()) => { const m = monday(now); return (S?.workouts || []).filter(w => w.d >= m).length }

/** Weeks in a row with at least one session, this week counting once it has one. */
export function weeksInARow(S, now = new Date()) {
  const weeks = new Set((S?.workouts || []).map(w => monday(w.d + 'T12:00:00')))
  let n = 0
  const d = new Date(now)
  if (!weeks.has(monday(d))) d.setDate(d.getDate() - 7)
  while (weeks.has(monday(d)) && n < 520) { n++; d.setDate(d.getDate() - 7) }
  return n
}

/** `training`: in a workout or a run right now (followers see "training now"). */
export function botCard(S, user, now = new Date(), training = !!S?.active) {
  const P = S?.police || {}
  return {
    training: !!training,
    stage: stageOf(P),
    // Today's session by name, done or not (never the rest of the plan); off with "Show my today".
    ...(P.shareToday !== false && P.start ? (() => { const t = todayNow(S, isoOf(now)); return t.name ? { today: { title: t.name, done: !!t.done } } : {} })() : {}),
    name: String(user?.name || 'Recruit').trim().split(/\s+/)[0],
    colour: lineColour(user?.id),
    gear: earnedGear(S),
    stats: { week: sessionsThisWeek(S, now), ready: readiness(P.results || [], P.beepTarget).pct || 0, streak: weeksInARow(S, now) },
  }
}
