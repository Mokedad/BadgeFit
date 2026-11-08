// Police Prep: the 12-week applicant programme, beginner and intermediate.
//
// The week is the app owner's own split: gym for chest and shoulders, VO2 max intervals, an
// easy run, squats for push power, arms and shoulders, a hard steady run and a recovery
// treadmill walk, with sauna and compression boots for recovery. Three 4-week phases, each with
// its own rep range (lib/police/set-advice.js REP_RANGES), and a re-test of the standards at
// the end of every phase.
//
// buildPoliceProgramme turns a level into ordinary openGym routines (double progression over
// the phase's rep range) and a 12-week programme over them (lib/programmes.js), so the plan
// runs in the normal workout screen with history, progression and the watch.
import { uid } from '../format.js'
import { BRAND } from './brand.js'
import { estimateMinutes } from './meals.js'

export const LEVELS = [
  { id: 'beginner', name: 'Beginner', blurb: 'New to the gym or to running. Six sessions, one full rest day, lighter volume.' },
  { id: 'intermediate', name: 'Intermediate', blurb: 'Training for 6+ months. Seven sessions with a hard steady run, more sets and heavier ranges.' },
]

export const WEEKS = 12
export const TEST_WEEKS = [4, 8, 12]

// Rep range per phase. Beginners build technique high and finish in 6-8; intermediates finish
// in the 4-6 strength range the bench press example uses.
export const PHASES = {
  beginner: [
    { n: 1, weeks: [1, 4], range: '12-15', focus: 'Technique and habit. Learn every lift, build the running base.' },
    { n: 2, weeks: [5, 8], range: '10-12', focus: 'Build muscle, burn fat. Weights go up, intervals get longer.' },
    { n: 3, weeks: [9, 12], range: '6-8', focus: 'Get strong for test day. Heavier sets, sharper speed work.' },
  ],
  intermediate: [
    { n: 1, weeks: [1, 4], range: '10-12', focus: 'Volume block. Build work capacity and lock in form.' },
    { n: 2, weeks: [5, 8], range: '6-8', focus: 'Strength block. Heavier, fewer reps, harder intervals.' },
    { n: 3, weeks: [9, 12], range: '4-6', focus: 'Peak block. Heavy and explosive. Peak for your test.' },
  ],
}

export const phaseOf = (level, week) =>
  (PHASES[level] || PHASES.beginner).find(p => week >= p.weeks[0] && week <= p.weeks[1]) || PHASES.beginner[0]

const RANGE = { '4-6': [4, 6], '6-8': [6, 8], '10-12': [10, 12], '12-15': [12, 15] }

// --- the gym routines --------------------------------------------------------------------
// [exerciseId, sets(beginner), sets(intermediate), kind]. kind: 'lift' follows the phase's
// rep range under double progression; 'bw' is body-weight reps; ['hold', sec] a timed hold.
// Ids are openGym catalogue ids.
const GYM = {
  chest: {
    name: 'Chest, Shoulders & Abs', emoji: 'barbell',
    ex: [
      ['0025', 3, 4, 'lift'], // barbell bench press
      ['0314', 3, 3, 'lift'], // dumbbell incline bench press
      ['0426', 3, 3, 'lift'], // dumbbell standing overhead press
      ['0334', 2, 3, 'lift'], // dumbbell lateral raise
      ['1236', 3, 3, 'lift'], // dumbbell one arm row (balance every push with a pull)
      ['0662', 2, 3, 'bw'], // push-up (test practice)
      ['0472', 3, 3, 'bw'], // hanging leg raise
      ['0463', 3, 3, ['hold', 45, 60]], // front plank (prone bridge practice)
    ],
  },
  legs: {
    name: 'Squats & Push Power', emoji: 'legs',
    ex: [
      ['0043', 3, 4, 'lift'], // barbell full squat
      ['0739', 3, 3, 'lift'], // sled 45° leg press
      ['2960', 3, 3, 'lift'], // dumbbell split squat
      ['0431', 3, 3, 'lift'], // dumbbell step-up
      ['0599', 2, 3, 'lift'], // lever seated leg curl (hamstrings for sprinting)
      ['0514', 3, 4, 'bw'], // jump squat (vertical jump)
      ['0549', 3, 3, 'lift'], // kettlebell swing
      ['3420', 3, 3, ['hold', 30, 45]], // v-sit on floor
    ],
  },
  arms: {
    name: 'Arms, Back, Shoulders & Abs', emoji: 'arm',
    ex: [
      ['2291', 3, 4, 'lift'], // cable wide grip lat pulldown
      ['1323', 3, 3, 'lift'], // cable rope seated row
      ['0405', 3, 4, 'lift'], // dumbbell seated shoulder press
      ['0294', 3, 3, 'lift'], // dumbbell biceps curl
      ['0313', 2, 3, 'lift'], // dumbbell hammer curl (grip)
      ['0201', 3, 3, 'lift'], // cable pushdown
      ['0814', 2, 3, 'bw'], // triceps dip
      ['2133', 3, 3, ['hold', 40, 60]], // farmers walk (grip strength)
      ['1470', 2, 3, ['hold', 30, 45]], // lateral side plank
      ['1179', 3, 3, ['hold', 30, 40]], // flutter kicks
    ],
  },
}

const BW_REPS = { beginner: [8, 12], intermediate: [12, 20] }

function gymExercise([id, setsB, setsI, kind], level, range) {
  const sets = level === 'intermediate' ? setsI : setsB
  if (Array.isArray(kind)) {
    const sec = level === 'intermediate' ? kind[2] : kind[1]
    return { id, mode: 'time', sets, sec, prog: 'time', weight: 0 }
  }
  if (kind === 'bw') {
    const [lo, hi] = BW_REPS[level] || BW_REPS.beginner
    return { id, sets, repsMin: lo, reps: hi, prog: 'double', weight: 0 }
  }
  const [lo, hi] = RANGE[range]
  return { id, sets, repsMin: lo, reps: hi, prog: 'double', weight: 0 }
}

// --- the cardio routines -----------------------------------------------------------------
// Logged as cardio entries (minutes and speed in km/h; incline in %) on openGym's run (0685),
// sprint (5216) and incline treadmill walk (3666).
const cardio = (id, min, speed, incline) => ({ id, mode: 'cardio', sets: 1, min, speed, ...(incline != null && { incline }) })

// The VO2 max session rotates week by week through four interval formats per phase: the
// longer intervals build the engine, the short sprints and 20 m shuttles the speed and turns
// the beep test and the agility run need. Phase 3 is the most test-specific.
const VO2 = {
  1: [
    { name: '4×4 intervals', how: '4 rounds: 4 min hard (you can say 3 words), 3 min easy jog.', min: 28 },
    { name: '100 m repeats', how: '10 rounds: 100 m at 80-90% effort, walk 100 m back.', min: 20 },
    { name: 'Hill repeats', how: '4 rounds: 3 min hard uphill, jog back down to recover.', min: 26 },
    { name: 'Distance ladder', how: 'Easy then hard for the same distance, up and back down: 100, 200, 300, 400, 300, 200, 100 m.', min: 25 },
  ],
  // Beep focus adds a second interval day; these are its formats, one per week of the phase.
  extra1: [
    { name: '200 m + 100 m sprints', how: '5 × 200 m sprint with 1 min rest, then 5 × 100 m sprint with 30 s rest.', min: 22 },
    { name: '30/30 sprints', how: '10 rounds: sprint 30 s, walk 30 s.', min: 18 },
    { name: '200 m + 100 m sprints', how: '5 × 200 m sprint with 1 min rest, then 5 × 100 m sprint with 30 s rest.', min: 22 },
    { name: 'Beep shuttles', how: '20 m shuttles at 1 level above your best for 1 min, rest 1 min, ×6.', min: 18 },
  ],
  extra2: [
    { name: '400-300-200 repeats', how: '400 m hard (2 min rest), 300 m hard (90 s rest), 200 m hard (1 min rest). Twice through, then one more 400 m.', min: 28 },
    { name: 'Beep shuttles', how: '20 m shuttles at 2 levels above your best for 1 min, rest 1 min, ×8.', min: 20 },
    { name: '400-300-200 repeats', how: '400 m hard (2 min rest), 300 m hard (90 s rest), 200 m hard (1 min rest). Twice through, then one more 400 m.', min: 28 },
    { name: '50 m repeats', how: '20 rounds: 50 m at 80-90% effort, walk 50 m back.', min: 22 },
  ],
  extra3: [
    { name: '5 × 400 m', how: '5 × 400 m hard with 2 min rest between. Hold the same time on every one.', min: 25 },
    { name: 'Beep shuttles', how: 'Run your goal level for 1 min, rest 1 min, ×10. Turn on the line.', min: 22 },
    { name: '5 × 400 m', how: '5 × 400 m hard with 2 min rest. Beat last time by 2 seconds each.', min: 25 },
    { name: 'Shuttle sprints', how: '6 sets of 10 × 20 m shuttles, 30 s rest. Taper week: keep it sharp, not exhausting.', min: 18 },
  ],
  2: [
    { name: '30/30 sprints', how: '10 rounds: sprint 30 s, walk or rest 30 s. Then 10 min easy.', min: 20 },
    { name: '50 m repeats', how: '20 rounds: 50 m at 80-90% effort, walk 50 m back.', min: 22 },
    { name: 'Time ladder', how: 'Hard for 5, 4, 3, 2, 1, then 5 min, with 1 min easy jog between each.', min: 30 },
    { name: '4×4 intervals', how: '4 rounds: 4 min hard, 3 min easy jog. Faster than phase 1.', min: 28 },
  ],
  3: [
    { name: 'Shuttle sprints', how: '10 sets of 10 × 20 m shuttles at 80-90%, 30 s rest between sets. Touch the line and turn fast.', min: 25 },
    { name: 'Beep shuttles', how: '20 m shuttles at 2 levels above your best for 1 min, rest 1 min, ×8. Turn on the line, not round it.', min: 20 },
    { name: 'Long ladder', how: 'Twice through: 100 m easy, then 100, 200, 300, 400, 500 m hard, 100 m easy between.', min: 30 },
    { name: '30/30 sprints', how: '12 rounds: sprint 30 s, rest 30 s. Then 10 min easy.', min: 22 },
  ],
}

const easyKm = (level, week) => {
  const [from, to] = level === 'intermediate' ? [6, 10] : [4, 7]
  return Math.round(from + ((to - from) * (week - 1)) / (WEEKS - 1))
}
const tempoMin = week => Math.min(28, 18 + Math.floor((week - 1) * 1))

/** The VO2 format for a week (1-based): the phase's list, one per week of the phase. */
export const vo2For = (week, extra = false) => {
  const w = Math.min(WEEKS, Math.max(1, week | 0 || 1))
  const list = VO2[(extra ? 'extra' : '') + Math.ceil(w / 4)]
  return list[(w - 1) % 4]
}

/**
 * Zone 2 heart rate for an age: about 75% of the estimated maximum (220 minus age), with
 * the band around it from 70% to 80%. null without a sensible age.
 */
export function zone2(age) {
  const a = Number(age)
  if (!(a >= 14 && a <= 80)) return null
  const max = 220 - a
  return { max, target: Math.round(max * 0.75), lo: Math.round(max * 0.7), hi: Math.round(max * 0.8) }
}

// Mobility before and after every session, 4 rounds of 30 s each, 30 s rest after the round.
export const WARMUP = ['Arm circles, both directions', 'Deep squat hold, pushing the knees out', 'Thoracic rotations on all fours', 'Kneeling hip flexor stretch, each side']

// --- the week ----------------------------------------------------------------------------
// Monday-first. day is the DAYN index openGym uses: 1 Mon … 6 Sat, 0 Sun.
const DAY_NAMES = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 0: 'Sunday' }

/**
 * The seven days of one week of the programme, Monday first:
 * [{ day, dayName, kind, key, title, details: [string], recovery: [string] }].
 * kind: 'gym' | 'run' | 'walk' | 'rest'. key names the routine (buildPoliceProgramme).
 */
/**
 * `opts.beepFocus`: the beep test is the weak point, so the Saturday session (the hard steady
 * run, or the beginner's incline walk) becomes a second interval session.
 */
export function weekPlan(level, week, age, opts = {}) {
  const lv = level === 'intermediate' ? 'intermediate' : 'beginner'
  // `week` is the member's own plan week (1..planWeeks, or past it after the test); `w` is the
  // week of the 12-week template it trains (templateWeek).
  const n = Math.max(1, week | 0 || 1)
  const w = templateWeek(n, opts.planWeeks)
  const phase = phaseOf(lv, w)
  const vo2 = vo2For(w)
  const test = TEST_WEEKS.includes(w)
  const rng = `${phase.range} reps`
  const easy = easyKm(lv, w)
  const z2 = zone2(age)
  const zoneText = z2 ? `Zone 2: keep your heart rate about ${z2.target} bpm (${z2.lo}-${z2.hi})` : 'Zone 2: about 75% of max heart rate (220 minus your age). Add your age to get your number'
  const days = [
    { day: 1, kind: 'gym', key: 'chest', title: GYM.chest.name, details: [`Main lifts in the ${rng} range`, 'Push-ups and plank are test practice: log them honestly'] },
    { day: 2, kind: 'run', key: 'vo2', title: `VO2 max: ${vo2.name}`, details: [vo2.how, `About ${lv === 'intermediate' ? 5 : 4} km all up with warm-up and cool-down`, 'Hard means heart rate around 90% of max: watch it on your smartwatch'] },
    { day: 3, kind: 'gym', key: 'legs', title: GYM.legs.name, details: [`Squats and leg press in the ${rng} range`, 'Jump squats: land soft, explode up. This is your vertical jump'] },
    { day: 4, kind: 'run', key: 'easy', title: `Easy run, ${easy} km`, details: ['Conversation pace: you can just hold a conversation. Any harder and you could not talk', zoneText] },
    { day: 5, kind: 'gym', key: 'arms', title: GYM.arms.name, details: [`Lifts in the ${rng} range`, 'Pulldowns and rows balance all the pressing', 'Hammer curls and farmers walk build your handgrip'] },
    lv === 'intermediate'
      ? { day: 6, kind: 'run', key: 'tempo', title: `Hard steady run, ${tempoMin(w)} min`, details: ['Comfortably hard, one even pace the whole way, under 30 min', 'Finish feeling you could not hold it another 10 minutes'] }
      : { day: 6, kind: 'walk', key: 'walk', title: 'Treadmill incline walk', details: ['30 min brisk walk on 10-14% incline', 'Recovery pace: nose breathing, burning fat, not wrecking legs'], recovery: ['Sauna: 15-20 min'] },
    lv === 'intermediate'
      ? { day: 0, kind: 'walk', key: 'walk', title: 'Recovery: treadmill incline walk', details: ['30 min brisk walk on 10-14% incline'], recovery: ['Sauna: 15-20 min', 'Compression boots: 20-30 min'] }
      : { day: 0, kind: 'rest', key: null, title: 'Rest and recover', details: ['Walk, stretch, sleep 8 hours'], recovery: ['Compression boots: 20-30 min'] },
  ]
  // Sauna 3-5 times a week, never straight before a hard session: after the gym days.
  for (const d of days) {
    if (d.kind === 'gym') d.recovery = [...(d.recovery || []), 'Sauna after: 15-20 min, hydrate']
    d.dayName = DAY_NAMES[d.day]
  }
  if (opts.beepFocus) {
    const x = vo2For(w, true)
    days[5] = { day: 6, dayName: DAY_NAMES[6], kind: 'run', key: 'vo2b', title: `Beep focus: ${x.name}`, details: [x.how, 'Warm up 10 min easy first. Run on a flat surface with good grip'], recovery: ['Sauna: 15-20 min'] }
    if (lv === 'beginner') days[6] = { ...days[6], kind: 'walk', key: 'walk', title: 'Recovery: treadmill incline walk', details: ['30 min brisk walk on 10-14% incline'] }
  }
  // The final week (week 12, or the test's week when the test is closer than 12 weeks): light
  // training and recovery, so the member arrives fresh.
  const final = n === lengthOf(opts.planWeeks)
  if (final) for (const d of days) if (d.kind === 'gym' || d.kind === 'run') d.details = [...d.details, 'Final week: light training. Half the sets or distance, same intensity, never to failure']
  // With a test date, the test sits on its real weekday in the final week and the day before is
  // kept easy; the usual end-of-phase re-test does not happen on top of it.
  if (final && opts.testDow != null) {
    const name = opts.testName || 'PCT'
    const at = days.findIndex(d => d.day === opts.testDow)
    const before = days.findIndex(d => d.day === (opts.testDow + 6) % 7)
    if (before >= 0 && before !== at) days[before] = { day: days[before].day, dayName: days[before].dayName, kind: 'rest', key: null, title: `Easy day before your ${name}`, details: ['Rest, or a 20 min easy walk or jog with a few strides', 'Sleep 8+ hours, carbs at dinner, lay out your gear'], recovery: ['Compression boots: 20 min'] }
    days[at] = { day: days[at].day, dayName: days[at].dayName, kind: 'test', key: null, title: `${name} day`, details: ['Normal breakfast 3 hours before, water, caffeine only if you trained with it', 'Full warm-up 10-15 min, then trust your training', 'Afterwards: log your results in Tests'], recovery: [] }
    return finish(days, { lv, w, n, phase, test: true, final })
  }
  if (test) {
    days[5] = { ...days[5], kind: 'test', title: 'Test day: re-test all six standards', details: ['Warm up 10 min, then in this order with 5 min rest between: grip, push-ups, prone bridge, vertical jump, Illinois agility, beep test', 'Test conditions: strict form, and stop the moment it breaks', 'Log every result in the Tests tab'], recovery: ['Sauna: 15-20 min'] }
  }
  return finish(days, { lv, w, n, phase, test, final })
}

const lengthOf = L => { const x = Math.round(Number(L)); return x >= 1 ? x : WEEKS }

/**
 * The template week (1..12) that plan week `n` of an `L`-week plan trains. Up to 12 weeks the
 * plan is weeks 1..L. Longer plans repeat the 12-week cycle: the weeks left over come first as
 * a lead-in from week 1, then whole cycles, so the last cycle's week 12 is the test week. After
 * the plan (n > L) training carries on: the later weeks, then the peak weeks 9-11 in turn.
 */
export function templateWeek(n, L) {
  const len = lengthOf(L)
  n = Math.max(1, n | 0 || 1)
  if (n > len) return n <= 11 ? n : 9 + ((n - Math.max(len, 11) - 1) % 3)
  const lead = len % WEEKS
  return n <= lead ? n : ((n - lead - 1) % WEEKS) + 1
}

// About how long each session takes (meals.js estimateMinutes), as on the routine it installs.
function finish(days, { lv, w, n = w, phase, test, final = false }) {
  for (const d of days) {
    const r = d.key && d.kind !== 'test' ? routineFor(d.key, lv, phase.range, w) : null
    if (r) d.minutes = estimateMinutes(r)
  }
  return { level: lv, week: n, tw: w, phase, test, final, days }
}

/** The routine for a day key, in openGym's routine shape. */
export function routineFor(key, level, range, w = 1) {
  if (GYM[key]) {
    const g = GYM[key]
    return { name: g.name, emoji: g.emoji, ex: g.ex.map(e => gymExercise(e, level, range)) }
  }
  const im = level === 'intermediate'
  if (key === 'vo2') return { name: 'VO2 Max Intervals', emoji: 'figureRun', ex: [cardio('0685', vo2For(w).min, im ? 13 : 11)] }
  if (key === 'easy') return { name: 'Easy Run', emoji: 'figureRun', ex: [cardio('0685', Math.round(easyKm(level, w) * 6.5), im ? 10 : 8.5)] }
  if (key === 'vo2b') return { name: 'Beep Focus Intervals', emoji: 'figureRun', ex: [cardio('0685', vo2For(w, true).min, im ? 13 : 11)] }
  if (key === 'tempo') return { name: 'Hard Steady Run', emoji: 'figureRun', ex: [cardio('0685', tempoMin(w), 12)] }
  if (key === 'walk') return { name: 'Treadmill Recovery Walk', emoji: 'heart', ex: [cardio('3666', 30, 5.5, 12)] }
  return null
}

/**
 * New routines (fresh ids) and a 12-week programme over them, not saved or started.
 * Returns { routines, programme, keys } where keys maps a day key to its routine id.
 */
export function buildPoliceProgramme(level, now = Date.now(), opts = {}) {
  const lv = level === 'intermediate' ? 'intermediate' : 'beginner'
  const plan = weekPlan(lv, 1, null, opts)
  const keys = {}, routines = []
  for (const d of plan.days) {
    if (!d.key || keys[d.key]) continue
    const r = routineFor(d.key, lv, plan.phase.range, 1)
    if (!r) continue
    const id = uid()
    keys[d.key] = id
    routines.push({ id, ...r, police: d.key })
  }
  const days = {}
  for (const d of plan.days) if (d.key && keys[d.key]) (days[d.day] = days[d.day] || []).push(keys[d.key])
  const programme = {
    id: uid(), name: `${BRAND.name} Applicant, ${lv === 'intermediate' ? 'Intermediate' : 'Beginner'} (12 weeks)`, at: now,
    src: 'police-' + lv, days, weeks: Array.from({ length: WEEKS }, () => ({})),
  }
  return { routines, programme, keys }
}

/**
 * Moves the Police Prep lifts of `routines` to a phase's rep range (on copies). Only routines
 * tagged `police`, or named in `keys` (day key → routine id, as buildPoliceProgramme returns), and only exercises that follow the range ('lift') change;
 * body-weight reps, holds and cardio keep their own targets. Returns the new array.
 */
export function applyPhaseRange(routines, level, week, keys = {}) {
  const lv = level === 'intermediate' ? 'intermediate' : 'beginner'
  const [lo, hi] = RANGE[phaseOf(lv, week).range]
  const keyOf = Object.fromEntries(Object.entries(keys).map(([k, id]) => [id, k]))
  return (routines || []).map(r => {
    const g = GYM[r.police || keyOf[r.id]]
    if (!g) return r
    const lifts = new Set(g.ex.filter(e => e[3] === 'lift').map(e => e[0]))
    return { ...r, ex: (r.ex || []).map(e => (lifts.has(e.id) ? { ...e, repsMin: lo, reps: hi } : e)) }
  })
}

/** The programme week for a start date (ISO day) and today, 1..12, or null before the start. */
export function weekNumber(startISO, todayISO) {
  const w = rawWeek(startISO, todayISO)
  return w && Math.min(WEEKS, w)
}

// The week count without the 12-week cap (13 is the week after the plan ends), or null.
function rawWeek(startISO, todayISO) {
  if (!startISO || !todayISO) return null
  const ms = Date.parse(todayISO + 'T00:00:00Z') - Date.parse(startISO + 'T00:00:00Z')
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.floor(ms / (7 * 86400000)) + 1
}

// --- counting down to a test date --------------------------------------------------------
const DAY = 86400000
const isoDay = ms => new Date(ms).toISOString().slice(0, 10)

/**
 * The start date that puts `testISO` in week 12, so the programme peaks on test day. The weeks
 * run Monday to Sunday like the plan's days: the start is the Monday 11 weeks before the test's
 * own week, so plan week 12 is the calendar week of the test. With a test 4 weeks away the plan
 * opens around week 8-9: the peak phase, then the taper.
 */
export function startForTest(testISO) {
  const t = Date.parse(testISO + 'T00:00:00Z')
  if (!Number.isFinite(t)) return null
  const monday = t - ((new Date(t).getUTCDay() + 6) % 7) * DAY
  return isoDay(monday - 77 * DAY)
}

/** The plan options that follow from the member's settings: beep focus and the test day. */
export function planOptsOf(P) {
  const t = P?.testDate ? Date.parse(P.testDate + 'T00:00:00Z') : NaN
  return {
    beepFocus: !!P?.beepFocus,
    testDow: Number.isFinite(t) ? new Date(t).getUTCDay() : null,
    testName: (P?.testName || 'PCT').slice(0, 24),
    planWeeks: planLengthOf(P),
  }
}

const mondayOf = iso => { const t = Date.parse(iso + 'T00:00:00Z'); return isoDay(t - ((new Date(t).getUTCDay() + 6) % 7) * DAY) }

/**
 * When a member's plan starts: week 1 is the Monday of the week they join (or the next Monday,
 * joining Friday to Sunday). The plan then runs as many weeks as it takes to reach the test
 * (planLengthOf). `testISO` is kept for the callers; it no longer moves the start.
 */
export function planStart(testISO, todayISO) {
  const dow = new Date(Date.parse(todayISO + 'T00:00:00Z')).getUTCDay()
  return dow >= 1 && dow <= 4 ? mondayOf(todayISO) : mondayOf(isoDay(Date.parse(todayISO + 'T00:00:00Z') + 3 * DAY))
}

/** How many weeks the member's plan has: up to the test's week, or 12 without a test. */
export function planLengthOf(P) {
  const n = P?.testDate ? rawWeek(P.start, P.testDate) : null
  return n || WEEKS
}

/** Whole days from today to the test (0 on the day), or null. */
export function daysUntil(testISO, todayISO) {
  const t = Date.parse(testISO + 'T00:00:00Z'), n = Date.parse(todayISO + 'T00:00:00Z')
  return Number.isFinite(t) && Number.isFinite(n) ? Math.round((t - n) / DAY) : null
}

// The last week before the test: keep the intensity, cut the volume, arrive fresh.
export const TAPER = [
  'Taper week: about half the sets and half the running, same intensity',
  'Last hard session 3-4 days before the test; 2 days before, rest or an easy 20 min jog',
  'Day before: sleep 8+ hours, carbs at dinner, no new foods, lay out your gear',
  'Test morning: a normal breakfast 3 hours before, caffeine if you trained with it, full warm-up',
]

/**
 * Where the member is in the plan today: { week (their plan week), tw (the template week it
 * trains), last (plan length), final, before, after, startsIn }. `before`: joined Friday to
 * Sunday, week 1 starts Monday. null week without a plan.
 */
export function planWeekOf(P, today) {
  const raw = rawWeek(P?.start, today)
  const last = planLengthOf(P)
  const tw = n => templateWeek(n, last)
  if (raw && raw > last) return { week: raw, tw: tw(raw), last, before: false, after: true, final: false, weeksAfter: raw - last, startsIn: 0 }
  if (raw) return { week: raw, tw: tw(raw), last, before: false, after: false, final: raw === last, startsIn: 0 }
  if (P?.start && today < P.start) return { week: 1, tw: 1, last, before: true, after: false, final: false, startsIn: daysUntil(P.start, today) }
  return { week: null, tw: null, last, before: false, after: false, final: false, startsIn: 0 }
}

/** Plain words for a phase, for people new to training plans. */
export const PHASE_WORDS = { 1: 'Build: learn the moves, build your base', 2: 'Strength: heavier, harder intervals', 3: 'Peak: sharpen up for test day' }
