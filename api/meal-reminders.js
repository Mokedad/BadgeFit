/* BadgeFit meal reminders: up to four a day (breakfast, lunch, pre-workout, dinner), each at
 * the time the person picked, on their own clock (S.police.mealReminders, with its `tz`).
 *
 * The server half: which reminders are due on a tick, and what the push says. The phone app
 * schedules the same reminders as local notifications instead (frontend/src/lib/police/
 * meal-reminders.js keeps a copy of MEALS and the lines; a parity test compares them).
 */

export const MEALS = [
  { key: 'breakfast', emoji: '🍳', name: 'Breakfast', time: '07:00' },
  { key: 'lunch', emoji: '🥗', name: 'Lunch', time: '12:30' },
  { key: 'preworkout', emoji: '⚡', name: 'Pre-workout', time: '16:00' },
  { key: 'dinner', emoji: '🍽️', name: 'Dinner', time: '19:00' },
];

// Jarvis's lines, one picked per day so they do not repeat every morning.
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
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMin = v => { const m = HHMM.exec(v || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };

/** The settings made safe: { on, tz, meals: { key: { on, time } } }, or null when switched off. */
export function cleanMealReminders(raw) {
  if (!raw || typeof raw !== 'object' || !raw.on) return null;
  const meals = {};
  for (const m of MEALS) {
    const r = raw.meals?.[m.key] || {};
    meals[m.key] = { on: r.on !== false, time: HHMM.test(r.time || '') ? r.time : m.time };
  }
  const tz = typeof raw.tz === 'string' && /^[A-Za-z_+\-/0-9]{1,64}$/.test(raw.tz) ? raw.tz : 'UTC';
  return { on: true, tz, meals };
}

// Sent for up to this many minutes after its time, like the workout reminder, so a restart
// across the minute does not lose it; later than that it is skipped.
export const MEAL_WINDOW_MIN = 15;

/** The meal keys due at local time `hhmm`, minus those already sent today. */
export function dueMeals(cfg, hhmm, sent = []) {
  if (!cfg?.on) return [];
  const now = toMin(hhmm);
  return MEALS.filter(m => {
    const r = cfg.meals[m.key];
    if (!r?.on || sent.includes(m.key)) return false;
    const late = now - toMin(r.time);
    return late >= 0 && late <= MEAL_WINDOW_MIN;
  }).map(m => m.key);
}

/** A stable pick for a date: the same line all day, a different one tomorrow. */
export function lineFor(key, date) {
  const list = LINES[key] || [];
  let h = 0;
  for (const c of String(date || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length] || '';
}

export function mealPush(key, date) {
  const m = MEALS.find(x => x.key === key);
  return { title: `${m.emoji} ${m.name}`, body: lineFor(key, date), tag: 'meal-' + key, url: '#/police?tab=food' };
}
