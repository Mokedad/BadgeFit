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

/**
 * Daily targets from body weight (kg), a goal and an activity level: kcal, protein, fat and
 * carbs in grams, and water in litres. A deliberately simple estimate, rounded to be usable.
 */
export function macroTargets({ weightKg, goal = 'lose', activity = 'high' } = {}) {
  const w = Number(weightKg)
  if (!(w > 30 && w < 300)) return null
  const maintenance = w * (ACTIVITY[activity] || ACTIVITY.high)
  const kcal = Math.round((maintenance * (GOAL_FACTOR[goal] || 1)) / 10) * 10
  const protein = Math.round(w * (goal === 'lose' ? 2.2 : 2.0))
  const fat = Math.round(w * 0.8)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  const water = Math.round(w * 0.035 * 10) / 10
  return { kcal, protein, fat, carbs, water, maintenance: Math.round(maintenance) }
}

export const RECOVERY = [
  { id: 'sauna', name: 'Sauna', how: '3-5 sessions a week, 15-20 min each. Drink 500 ml of water with electrolytes after. Skip it if you feel unwell, and never straight before a hard run.' },
  { id: 'boots', name: 'Compression boots', how: '20-30 min after long runs and on rest days to flush the legs.' },
  { id: 'sleep', name: 'Sleep', how: '7-9 hours. This is where the muscle and the fitness are actually built.' },
  { id: 'walk', name: 'Recovery walk', how: 'Incline treadmill walk at nose-breathing pace: burns fat without adding fatigue.' },
]
