// BadgeFit's planned reminders: the morning nudge (today's session and the days left) and the two
// for the test (the evening before, and the morning of). Built on the phone, where the plan
// lives, for the next days, and stored in S.police.pushPlan: the server sends each at its time
// as a web push (api/badgefit-plan-push.js), the phone app schedules them locally (lib/mobile.js).
// Pure.
import { weekPlan, planOptsOf, planWeekOf, daysUntil } from './programme.js'

export const PLAN_DAYS = 10
export const PLAN_ID_BASE = 3500
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

const addDays = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10)
const dowOf = iso => new Date(iso + 'T12:00:00Z').getUTCDay()

/** The nudge settings made safe: { on, time }. */
export const nudgeSettings = raw => ({ on: !!raw?.on, time: HHMM.test(raw?.time || '') ? raw.time : '07:00' })

/** One morning's line: the session and the countdown. */
export function nudgeBody(P, iso) {
  const pw = planWeekOf(P, iso)
  const day = P.level && pw.week ? weekPlan(P.level, pw.week, P.age, planOptsOf(P)).days.find(d => d.day === dowOf(iso)) : null
  const left = P.testDate ? daysUntil(P.testDate, iso) : null
  const name = (P.testName || '').trim() || 'PCT'
  const what = !day ? 'Train smart today.' : day.kind === 'rest' ? 'Rest day. Walk, stretch, sleep 8 hours.' : `${day.title}${day.minutes ? `, about ${day.minutes} min` : ''}.`
  const count = left > 0 ? ` ${left} ${left === 1 ? 'day' : 'days'} to your ${name}.` : ''
  return `${what}${count}`
}

/**
 * The reminders for the next PLAN_DAYS days from `today`: { on, tz, built, items: [{ at
 * ('YYYY-MM-DD HH:MM', local), title, body, tag, url }] }, or { on: false }.
 */
export function buildPushPlan(P, today, tz = 'UTC') {
  const cfg = nudgeSettings(P?.nudge)
  if (!cfg.on || !P?.level) return { on: false }
  const name = (P.testName || '').trim() || 'PCT'
  const items = []
  for (let d = 0; d < PLAN_DAYS; d++) {
    const iso = addDays(today, d)
    if (P.testDate && iso > P.testDate) break
    if (iso === P.testDate) {
      items.push({ at: `${iso} 06:30`, title: `🎯 ${name} day`, body: 'Normal breakfast 3 hours before, water, a full warm-up. Trust your training. You are ready.', tag: 'bf-test-day', url: '#/police?tab=tests' })
      continue
    }
    items.push({ at: `${iso} ${cfg.time}`, title: '⭐ Today', body: nudgeBody(P, iso), tag: 'bf-nudge', url: '#/police' })
    if (P.testDate && addDays(iso, 1) === P.testDate) {
      items.push({ at: `${iso} 19:00`, title: `🎯 ${name} tomorrow`, body: 'Lay out your gear and ID tonight, carbs at dinner, nothing new, and 8 hours of sleep.', tag: 'bf-test-eve', url: '#/police?tab=tests' })
    }
  }
  return { on: true, tz, built: today, items }
}
