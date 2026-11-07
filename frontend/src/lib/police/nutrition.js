// Police Prep: eating plans and a simple calorie and protein calculator.
// General education, not medical or dietetic advice: the view shows DISCLAIMER with it.

export const DISCLAIMER =
  'General information, not medical advice. If you have a medical condition, are pregnant, take medication or have a history of disordered eating, talk to your doctor or an accredited dietitian first.'

// Six rules every plan below follows.
export const PRINCIPLES = [
  'Eat a little less than you burn to lose fat: a deficit of about 300-500 kcal a day.',
  'Protein at every meal: about 1.6-2.2 g per kg of body weight a day keeps muscle while you cut.',
  'Half the plate vegetables or fruit, for fibre, vitamins and staying full.',
  'Healthy fats daily: olive oil, avocado, nuts, oily fish.',
  'Water: about 35 ml per kg a day, more on run and sauna days. Add electrolytes after the sauna.',
  'Mostly whole foods. Processed snacks, sugary drinks and alcohol are the first things to cut.',
]

export const DIETS = [
  {
    id: 'high-protein', name: 'High protein (lose fat, build muscle)', tag: 'Recommended',
    who: 'Best all-round choice for recruits: you drop fat while you keep and build muscle. The plan your coach follows too.',
    how: [
      'Protein 2.0-2.2 g per kg body weight a day, spread over 4 meals (30-50 g each).',
      'A moderate calorie deficit (about 20% under maintenance).',
      'Carbs mostly around training: oats, rice, potato, fruit before and after sessions.',
      'Every meal: a palm of protein, a fist of carbs, two fists of vegetables, a thumb of fat.',
    ],
    day: [
      'Breakfast: 3 eggs and 2 egg whites scrambled, wholegrain toast, spinach and tomato',
      'Lunch: grilled chicken breast, brown rice, mixed salad with olive oil',
      'Pre-training: Greek yoghurt with berries and a banana',
      'Dinner: lean beef or salmon, sweet potato, steamed greens',
      'Evening (if hungry): cottage cheese or a protein shake',
    ],
  },
  {
    id: 'recruit-cut', name: "The coach's recruit cut", tag: 'Real results',
    who: 'The exact day the BadgeFit coach eats while training for the PCT: 114 kg down to 110 kg, stronger in every session. High protein, about 500 kcal under maintenance, carbs timed around runs.',
    how: [
      '30-45 g protein at each main meal keeps muscle building while you lose fat.',
      'Fast carbs (rice cakes) 30-45 min before running: fuel without a heavy stomach.',
      'Lean cuts for steak (rump, sirloin, eye fillet), not marbled scotch or ribeye.',
      'Skip the extra shake after a high-protein dinner: about 1,000 kcal a week saved.',
      'Sauna for recovery, never as weight loss: drink water with electrolytes straight after.',
    ],
    day: [
      'Breakfast: porridge, lite Greek yoghurt, 1 scoop whey, fruit (about 40-45 g protein)',
      'Lunch: a high-protein shake (about 30 g protein, about 200 kcal)',
      'Pre-run (30-45 min before): 2-3 rice cakes',
      'Afternoon: 4 km run (easy, intervals or max) or a push/pull gym session',
      'Dinner: two lean steaks with vegetables, or a high-protein ready meal (35-40 g protein)',
      'Night: magnesium, K2, creatine, compression boots',
    ],
  },
  {
    id: 'if-16-8', name: 'Intermittent fasting 16:8', tag: 'Fat loss',
    who: 'For people who are not hungry in the morning and like fewer, bigger meals. It works by making a deficit easier, not by magic.',
    how: [
      'Fast 16 hours, eat within an 8-hour window, for example 12 pm to 8 pm.',
      'During the fast: water, black coffee, plain tea, electrolytes. No calories.',
      'Hit the same protein target as the high protein plan inside the window: 2-3 big meals.',
      'Train late morning fasted only for easy runs and walks. For gym and interval days, move your window so you eat 1-3 hours before training, or eat straight after.',
      'Start gently: 12:12 for a week, then 14:10, then 16:8.',
      'Break the fast with protein and vegetables, not a sugar hit.',
      'Not for anyone with diabetes, low blood pressure, a history of eating disorders, or who is pregnant. Stop if you feel dizzy or faint in training.',
    ],
    day: [
      '12:00 Break the fast: chicken, rice and vegetable bowl',
      '15:30 Snack: Greek yoghurt, berries, handful of almonds',
      '17:00 Train',
      '19:30 Dinner: salmon, potatoes, big salad',
      '20:00 Window closes. Water and herbal tea until 12:00',
    ],
    variants: [
      '14:10: an easier start, good for early-morning trainers',
      '5:2: eat normally 5 days, about 600 kcal on 2 non-consecutive rest days (never on hard training days)',
    ],
  },
  {
    id: 'carb-cycling', name: 'Carb cycling', tag: 'Performance',
    who: 'For intermediate trainees who want fuel for hard sessions and a faster cut on easy days.',
    how: [
      'High-carb days: VO2 intervals, squat day, test day (about 4-5 g carbs per kg).',
      'Medium days: other gym days and easy runs (about 2-3 g per kg).',
      'Low days: rest and recovery-walk days (about 1-1.5 g per kg), more vegetables and fats.',
      'Protein stays high every day (2 g per kg).',
    ],
    day: [
      'High day: oats and banana, rice bowl lunch, pasta dinner with lean mince',
      'Low day: omelette, chicken salad, fish with roasted vegetables',
    ],
  },
  {
    id: 'balanced', name: 'Balanced deficit (Mediterranean style)', tag: 'Beginner friendly',
    who: 'The simplest start: no fasting, no counting every gram. Good for beginners and for keeping it up for life.',
    how: [
      'Three meals and one snack a day, plates built with the hand rule above.',
      'Fish twice a week, legumes often, olive oil as the main fat.',
      'Weigh yourself 3 mornings a week; if the weekly average does not drop in 2 weeks, take one fist of carbs off dinner.',
    ],
    day: [
      'Breakfast: overnight oats with milk, chia and fruit',
      'Lunch: tuna and chickpea salad, wholegrain wrap',
      'Snack: apple and a handful of nuts',
      'Dinner: chicken souvlaki, Greek salad, small pita',
    ],
  },
]

export const dietById = id => DIETS.find(d => d.id === id) || null

const GOAL_FACTOR = { lose: 0.8, recomp: 0.9, maintain: 1, gain: 1.1 }
const ACTIVITY = { light: 30, moderate: 33, high: 36 } // kcal per kg body weight for maintenance

// Calories a day above or below maintenance, by goal: the deficit is the ~500 kcal that loses
// about half a kilo of fat a week while training stays strong.
const GOAL_DELTA = { lose: -500, recomp: -250, maintain: 0, gain: 250 }
// Training 6-7 sessions a week: Mifflin-St Jeor resting energy × 1.55.
const ACTIVITY_FACTOR = 1.55

/** Resting energy (Mifflin-St Jeor), or null without height and age. sex: 'male' | 'female'. */
export function bmr({ weightKg, heightCm, age, sex }) {
  const w = Number(weightKg), h = Number(heightCm), a = Number(age)
  if (!(w > 30) || !(h > 120 && h < 230) || !(a >= 14 && a <= 90)) return null
  return Math.round(10 * w + 6.25 * h - 5 * a + (sex === 'female' ? -161 : 5))
}

/**
 * Daily targets: kcal, protein, fat and carbs in grams, water in litres. With height and age it
 * uses Mifflin-St Jeor; without them, a rougher per-kg estimate that runs high for heavier people.
 */
export function macroTargets({ weightKg, goal = 'lose', activity = 'high', heightCm, age, sex } = {}) {
  const w = Number(weightKg)
  if (!(w > 30 && w < 300)) return null
  const rest = bmr({ weightKg: w, heightCm, age, sex })
  const maintenance = rest ? rest * ACTIVITY_FACTOR : w * (ACTIVITY[activity] || ACTIVITY.high)
  const kcal = rest
    ? Math.round((maintenance + (GOAL_DELTA[goal] ?? 0)) / 10) * 10
    : Math.round((maintenance * (GOAL_FACTOR[goal] || 1)) / 10) * 10
  const protein = Math.round(w * (goal === 'lose' ? 2.2 : 2.0))
  const fat = Math.round(w * 0.8)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  const water = Math.round(w * 0.035 * 10) / 10
  return { kcal, protein, fat, carbs, water, maintenance: Math.round(maintenance), method: rest ? 'mifflin' : 'per-kg' }
}

export const RECOVERY = [
  { id: 'sauna', name: 'Sauna', how: '3-5 sessions a week, 15-20 min each. Drink 500 ml of water with electrolytes after. Skip it if you feel unwell, and never straight before a hard run.' },
  { id: 'boots', name: 'Compression boots', how: '20-30 min after long runs and on rest days to flush the legs.' },
  { id: 'sleep', name: 'Sleep', how: '7-9 hours. This is where the muscle and the fitness are actually built.' },
  { id: 'walk', name: 'Recovery walk', how: 'Incline treadmill walk at nose-breathing pace: burns fat without adding fatigue.' },
]

// --- protein by body weight --------------------------------------------------------------
// g per kg per day: the general health minimum, an active adult, and building or keeping
// muscle in a calorie deficit (the recruit's case). Above about 2.2 g/kg nothing more is built.
export const PROTEIN_LEVELS = [
  { id: 'normal', name: 'Normal intake', perKg: 0.8, who: 'Not training: the healthy minimum' },
  { id: 'active', name: 'Active', perKg: 1.6, who: 'Training 3-4 times a week' },
  { id: 'build', name: 'Build muscle / cutting', perKg: 2.2, who: 'Training hard, losing fat, keeping muscle' },
]

/** Daily protein in grams for a body weight, per level, and how it splits over 4 meals. */
export function proteinFor(weightKg) {
  const w = Number(weightKg)
  if (!(w > 30 && w < 300)) return null
  return PROTEIN_LEVELS.map(l => {
    const g = Math.round(w * l.perKg)
    return { ...l, grams: g, perMeal: Math.round(g / 4) }
  })
}

/** A table of daily protein for a range of body weights (kg), for the reference card. */
export function proteinTable(from = 50, to = 150, step = 10) {
  const rows = []
  for (let w = from; w <= to; w += step) rows.push({ weight: w, ...Object.fromEntries(PROTEIN_LEVELS.map(l => [l.id, Math.round(w * l.perKg)])) })
  return rows
}

// --- creatine ----------------------------------------------------------------------------
// Loading: about 0.3 g/kg a day (≈20 g for most people) split into 4 doses for 5-7 days, then
// maintenance of about 0.03 g/kg (3-5 g, up to about 10 g for very big athletes). Staying on
// 15-30 g every day adds no strength over maintenance once the muscle is full, and often upsets
// the stomach. Skip loading and take 3-5 g daily: the muscle is just as full after 3-4 weeks.
export function creatineFor(weightKg) {
  const w = Number(weightKg)
  if (!(w > 30 && w < 300)) return null
  const loading = Math.min(30, Math.max(15, Math.round(w * 0.3)))
  const maintenance = Math.min(10, Math.max(3, Math.round(w * 0.03 * 2) / 2))
  return { loading, loadingDoses: 4, loadingPerDose: Math.round((loading / 4) * 2) / 2, loadingDays: '5-7', maintenance }
}

// Supplements worth knowing about. `evidence`: strong | good | some. Police applicants are
// drug tested: only batch-tested products (Informed Sport, HASTA) are safe from contamination.
export const SUPPLEMENTS = [
  { id: 'whey', name: 'Whey protein', evidence: 'strong', dose: '1 scoop (25-30 g protein) when meals fall short', why: 'An easy way to reach your protein target. Food first: a shake after a steak dinner is wasted calories.' },
  { id: 'creatine', name: 'Creatine monohydrate', evidence: 'strong', dose: 'See your numbers above: load, then 3-5 g every day', why: 'More strength and power on short hard efforts: push-ups, sprints, jumps. Expect 1-2 kg of water weight on the scale, which is muscle water, not fat.' },
  { id: 'electrolytes', name: 'Electrolytes', evidence: 'good', dose: 'After sauna, long or hot runs: 500-1000 ml with sodium', why: 'Replaces the sodium you sweat out, so your next run does not suffer. Plain water alone after heavy sweating can dilute your blood sodium.' },
  { id: 'caffeine', name: 'Caffeine', evidence: 'strong', dose: '3 mg per kg, 45-60 min before hard sessions or test day', why: 'Faster and stronger on intervals and the beep test. Try it in training first, never new on test day. None after 2 pm, sleep matters more.' },
  { id: 'magnesium', name: 'Magnesium (glycinate)', evidence: 'some', dose: '200-400 mg in the evening', why: 'Helps sleep and muscle relaxation, especially when you sweat a lot.' },
  { id: 'vitd', name: 'Vitamin D3 (+ K2)', evidence: 'good', dose: '1000-2000 IU a day, with a meal containing fat', why: 'Bone health under running impact and immune support, if you are low (get a blood test). K2 helps put calcium into bone.' },
  { id: 'omega3', name: 'Omega-3 (fish oil)', evidence: 'some', dose: '1-2 g EPA+DHA a day, or oily fish twice a week', why: 'Joint comfort and recovery. Not needed if you eat salmon or sardines regularly.' },
]
