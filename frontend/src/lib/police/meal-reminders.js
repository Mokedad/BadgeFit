// BadgeFit meal reminders on the phone app: local notifications for the next days, at the times
// in S.police.mealReminders, scheduled by lib/mobile.js syncReminder with the workout reminder.
// The web app and the home-screen app get the same reminders as push from the server
// (api/meal-reminders.js). MEALS and LINES are a copy of the server's; meal-reminders.test.js
// compares the two, so a change to one has to be made in both.

export const MEALS = [
  { key: 'breakfast', emoji: '🍳', name: 'Breakfast', time: '07:00' },
  { key: 'lunch', emoji: '🥗', name: 'Lunch', time: '12:30' },
  { key: 'preworkout', emoji: '⚡', name: 'Pre-workout', time: '16:00' },
  { key: 'dinner', emoji: '🍽️', name: 'Dinner', time: '19:00' },
]

export const LINES = {
  breakfast: [
    'Breakfast time. 30-45 g of protein to start the day strong.',
    'Fuel up. Porridge, yoghurt and whey: the breakfast of a recruit.',
    'Champions eat breakfast. Protein first, then get after it.',
  ],
  lunch: [
    'Lunch time. Keep the protein coming and the deficit on track.',
    'Midday fuel. A clean lunch now keeps your energy up for training.',
    'Lunch: protein, greens, done. Stay on plan.',
  ],
  preworkout: [
    'Training soon. Fast carbs now: rice cakes or a banana, 30-45 min out.',
    'Pre-workout fuel time. Light, quick carbs, and water.',
    'Fuel the session. Something light now, then press hard.',
  ],
  dinner: [
    'Dinner time. Lean protein and vegetables to recover and rebuild.',
    'Recovery starts on the plate. Protein up, keep it lean.',
    'Dinner: rebuild the muscle you worked today. Log it in BadgeFit.',
  ],
}

export function lineFor(key, date) {
  const list = LINES[key] || []
  let h = 0
  for (const c of String(date || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return list[h % list.length] || ''
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

/** The settings with every meal filled in: { on, tz, meals: { key: { on, time } } }. */
export function mealSettings(raw) {
  const meals = {}
  for (const m of MEALS) {
    const r = raw?.meals?.[m.key] || {}
    meals[m.key] = { on: r.on !== false, time: HHMM.test(r.time || '') ? r.time : m.time }
  }
  return { on: !!raw?.on, tz: raw?.tz || null, meals }
}

// Local notification ids: 3000 + meal index × 10 + day offset. The workout reminder uses
// 1000-1059 and the nudge 2000-2006 (lib/mobile.js), so the ranges never meet.
export const MEAL_ID_BASE = 3000
export const MEAL_WINDOW_DAYS = 7
export const allMealIds = () => MEALS.flatMap((_, i) => Array.from({ length: MEAL_WINDOW_DAYS }, (_, d) => MEAL_ID_BASE + i * 10 + d))

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The local notifications for the next MEAL_WINDOW_DAYS days, only those still ahead of `now`. */
export function buildMealNotifications(raw, now = new Date()) {
  const cfg = mealSettings(raw)
  if (!cfg.on) return []
  const out = []
  MEALS.forEach((m, i) => {
    const r = cfg.meals[m.key]
    if (!r.on) return
    const [hh, mm] = r.time.split(':').map(Number)
    for (let d = 0; d < MEAL_WINDOW_DAYS; d++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hh, mm, 0, 0)
      if (at <= now) continue
      out.push({
        id: MEAL_ID_BASE + i * 10 + d,
        title: `${m.emoji} ${m.name}`,
        body: lineFor(m.key, iso(at)),
        schedule: { at, allowWhileIdle: true },
        extra: { url: '#/police?tab=food' },
      })
    }
  })
  return out
}
