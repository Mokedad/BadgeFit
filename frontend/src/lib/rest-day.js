// The rest-day card on Home and the morning fuel notification on the phones.
//
// On a planned rest day Home always shows something: a card that folds open to two short lists,
// what to eat today and how to move if you still want to. It can be put away for the day
// (S.restDayHide) or switched off in Settings → Look & Home (S.restDay === false).
//
//   - Eat: simple meal ideas for a beginner (from the Coach's intake, or under 20 workouts
//     logged), numbers for someone who trains regularly (protein and water from the body weight
//     when there is one).
//   - Move: during the first week there is not enough data to read, so the card gives the same
//     easy ideas to everyone. From the second week (first workout 7+ days ago, 3+ in the last 30)
//     it reads the fatigue model (lib/recovery.js fatigueOf, the Stats muscle map): legs still
//     recovering → light band work for the upper body, and the other way round; both → just a
//     walk and stretching; neither → a light full-body band circuit. Never a "don't train".
//
// The phone can also send one notification a day at breakfast time (S.fuelNotify = { on, time }):
// a rest day gets one of the food ideas, a training day a pre-workout fuel tip.
import { workoutAt, effectiveRoutines } from './history.js'
import { t } from './i18n-core.js'

const DAY = 86400000
const FATIGUED = 0.5
export const DATA_DAYS = 7
export const DATA_MIN_RECENT = 3
export const BEGINNER_WORKOUTS = 20
const LB_TO_KG = 0.45359237
// The same two regions as the recovery hint (lib/recovery-hint.js REGIONS), kept here so the
// phone's notification code does not pull in the browser i18n shell through that module.
const REGIONS = {
  legs: ['quadriceps', 'hamstring', 'gluteal'],
  upper: ['chest', 'upper-back', 'deltoids'],
}

const iso = ms => { const x = new Date(ms); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }

/** 'beginner' or 'regular': the Coach's intake answer wins, else how much has been logged. */
export function levelOf(S) {
  const exp = S?.coach?.profile?.experience
  if (exp === 'new' || exp === 'returning') return 'beginner'
  if (exp === 'regular') return 'regular'
  return (S?.workouts || []).length < BEGINNER_WORKOUTS ? 'beginner' : 'regular'
}

/** Whether `day` is a planned rest day: a plan exists (weekdays, queue or a day marked rest) and nothing is on it that day. */
export function isRestDay(S, day) {
  if (!S) return false
  if (S.dayPlan?.[day] === 'rest') return true
  const routines = effectiveRoutines(S, day).filter(r => (r?.ex || []).length)
  if (routines.length) return false
  return Object.values(S.week || {}).some(v => [].concat(v || []).length) || !!(S.queue?.ids || []).length
}

/** Enough history to read the fatigue model: the first workout a week back, and some training lately. */
export function hasWeekOfData(S, now = Date.now()) {
  const ats = (S?.workouts || []).map(workoutAt).filter(Number.isFinite)
  if (!ats.length) return false
  const first = Math.min(...ats)
  const recent = ats.filter(at => at > now - 30 * DAY && at <= now).length
  return now - first >= DATA_DAYS * DAY && recent >= DATA_MIN_RECENT
}

const bodyKg = (S, bw) => {
  const w = Number(bw?.w)
  if (!(w > 0)) return null
  return S?.unit === 'lb' ? w * LB_TO_KG : w
}

/** The eat list: [{ label, text }]. `bw` is the last body-weight entry ({ w }), optional. */
export function foodTips(S, bw) {
  const kg = bodyKg(S, bw)
  if (levelOf(S) === 'beginner') return [
    { label: t('Breakfast'), text: t('Eggs or Greek yoghurt, with oats and some fruit.') },
    { label: t('Lunch'), text: t('Half a plate of veg, a palm of protein and a fist of rice or potatoes.') },
    { label: t('Snack'), text: t('A piece of fruit, a handful of nuts or a glass of milk.') },
    { label: t('Dinner'), text: t('Chicken, fish, beans or tofu with veg. Water through the day.') },
  ]
  return [
    { label: t('Protein'), text: kg ? t('About {0} g today, spread over 3 or 4 meals.', Math.round(kg * 1.6 / 5) * 5) : t('A palm of protein at every meal, 3 or 4 times today.') },
    { label: t('Carbs'), text: t('Keep them up: oats, rice, potatoes or bread refill your muscles for the next session.') },
    { label: t('Fruit and veg'), text: t('Three or four portions help you recover.') },
    { label: t('Water'), text: kg ? t('About {0} litres through the day.', (Math.round(kg * 0.035 * 2) / 2).toFixed(1)) : t('Keep a bottle with you all day.') },
  ]
}

const fatiguedRegions = fatigue => Object.keys(REGIONS).filter(r => REGIONS[r].some(m => (Number(fatigue?.[m]) || 0) > FATIGUED))

/**
 * The move list for a rest day: { kind, lines }. `kind` is 'starter' (first week, no data yet),
 * 'rest' (legs and upper body both recovering), 'upper' (legs recovering: work the upper body),
 * 'legs' (upper body recovering: work the legs) or 'full' (well recovered).
 */
export function moveTips(S, { now = Date.now(), fatigue = {} } = {}) {
  if (!hasWeekOfData(S, now)) return { kind: 'starter', lines: [
    t('A 20 to 30 minute walk.'),
    t('10 minutes of easy stretching.'),
    t('At the gym: light resistance bands, 2 rounds of 12, nowhere near failure.'),
    t('From your second week this is based on your own recovery.'),
  ] }
  const tired = fatiguedRegions(fatigue)
  if (tired.length === 2) return { kind: 'rest', lines: [
    t('Your legs and upper body are both still recovering.'),
    t('Today is for resting: an easy walk and some stretching.'),
  ] }
  if (tired[0] === 'legs') return { kind: 'upper', lines: [
    t('Your legs are still recovering, so leave them be.'),
    t('At the gym: light bands for the upper body. Pull-aparts, band rows and band presses, 2 to 3 rounds of 15.'),
    t('An easy walk or bike ride loosens the legs.'),
  ] }
  if (tired[0] === 'upper') return { kind: 'legs', lines: [
    t('Your upper body is still recovering, so leave it be.'),
    t('At the gym: light bands for the legs. Band squats, glute bridges and side steps, 2 to 3 rounds of 15.'),
    t('Gentle chest and shoulder stretches.'),
  ] }
  return { kind: 'full', lines: [
    t('You are well recovered.'),
    t('At the gym: a light full-body band circuit, or 20 minutes of easy cardio.'),
    t('Keep it easy. The rest is part of the plan.'),
  ] }
}

/**
 * Today's rest-day card, or null. `fatigue` is fatigueOf's map for `now`; `bw` the last
 * body-weight entry. Returns { level, food, move }.
 */
export function restDayCard(S, { now = Date.now(), today = iso(now), fatigue = {}, bw } = {}) {
  if (!S || S.restDay === false || S.restDayHide === today || S.active) return null
  if ((S.workouts || []).some(w => w?.d === today)) return null
  if (!isRestDay(S, today)) return null
  return { level: levelOf(S), food: foodTips(S, bw), move: moveTips(S, { now, fatigue }) }
}

// ---- The morning notification (phones) -----------------------------------------------------

export const FUEL_WINDOW_DAYS = 14
export const FUEL_ID_BASE = 4000
export const FUEL_DEFAULT_TIME = '07:30'

/**
 * One notification per future day at S.fuelNotify.time: a food idea on a rest day (rotating by
 * date), a pre-workout fuel tip on a day with a routine. Days already logged are skipped, and
 * so is every day when there is no plan to tell rest from training.
 */
export function buildFuelNotifications(S, now = new Date(), { routinesOn, excused } = {}) {
  const f = S?.fuelNotify
  if (!f?.on) return []
  const [hour, minute] = (f.time || FUEL_DEFAULT_TIME).split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return []
  const done = new Set((S.workouts || []).map(w => w.d))
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  const out = []
  for (let offset = 0; offset < FUEL_WINDOW_DAYS; offset++) {
    const day = new Date(base)
    day.setDate(base.getDate() + offset)
    const d = iso(day.getTime())
    if (done.has(d) || excused?.(d)) continue
    const at = new Date(day)
    at.setHours(hour, minute, 0, 0)
    if (at <= now) continue
    const names = routinesOn ? routinesOn(d) : effectiveRoutines(S, d).filter(r => (r?.ex || []).length).map(r => r.name)
    let title, body
    if (names.length) {
      title = t('Fuel for today’s workout')
      body = t('{0} today. Eat a meal with carbs and protein 1 to 2 hours before you train.', names.slice(0, 2).join(' + '))
    } else if (isRestDay(S, d)) {
      const tips = foodTips(S)
      const tip = tips[day.getDate() % tips.length]
      title = t('Rest day')
      body = tip.label + ': ' + tip.text
    } else continue
    out.push({ id: FUEL_ID_BASE + offset, title, body, schedule: { at, allowWhileIdle: true } })
  }
  return out
}
