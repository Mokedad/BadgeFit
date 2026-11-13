// The first steps (BadgeFit Home): four small things for someone who has never followed a
// fitness programme, each one a tap into a different part of the app. A step ticks itself the
// first time the place is opened (or the first session is done); when all four are ticked the
// strip goes away for good. Kept in the profile (police.seen), so it follows the account. Pure.

export const STEPS = [
  { id: 'session', icon: 'play', word: 'Train', label: 'Do your first session', hint: 'Tap Start. Hayden talks you through it.', to: null },
  { id: 'hayden', icon: 'sparkles', word: 'Hayden', label: 'Meet Hayden', hint: 'Tap the ball. He is your coach.', to: 'hayden' },
  { id: 'plan', icon: 'calendar', word: 'Week', label: 'See your week', hint: 'What is coming, one day at a time.', to: '/police?tab=plan' },
  { id: 'tests', icon: 'target', word: 'Test', label: 'Look at the test', hint: 'The six things you will be tested on.', to: '/police?tab=tests' },
]

/** Each step with `done`, from the profile. `S` is the whole state. */
export function firstSteps(S) {
  const seen = S?.police?.seen || {}
  const trained = (S?.workouts || []).length > 0
  return STEPS.map(s => ({ ...s, done: s.id === 'session' ? trained : !!seen[s.id] }))
}

/** { steps, done, total, next } while there is something left to try, else null. */
export function firstStepsView(S) {
  if (!S?.police?.start) return null
  const steps = firstSteps(S)
  const done = steps.filter(s => s.done).length
  return done === steps.length ? null : { steps, done, total: steps.length, next: steps.find(s => !s.done) }
}

/** The profile patch that ticks a place as seen, or null when it already is (no write needed). */
export function seenPatch(P, id) {
  if (!P?.start || !(STEPS.some(s => s.id === id && s.id !== 'session') || id === 'full' || id === 'moreplans') || P.seen?.[id]) return null
  return { seen: { ...(P.seen || {}), [id]: 1 } }
}

// The simple plan first. Someone new sees only this week, in plain words, until they have the
// habit: five sessions done. Then the rest opens (the weeks ahead, the phases, the other plans).
// Someone who said they train regularly, or who already chose another plan, or who asked to see
// everything, starts with it all.
export const COMFORT_SESSIONS = 5

/** { sessions, need, ready } : whether the full plan is shown yet. */
export function comfort(S) {
  const P = S?.police || {}
  const sessions = (S?.workouts || []).length
  const ready = sessions >= COMFORT_SESSIONS || P.level === 'intermediate' || (!!P.planChoice && P.planChoice !== 'badgefit') || !!P.seen?.full
  return { sessions: Math.min(sessions, COMFORT_SESSIONS), need: COMFORT_SESSIONS, ready }
}

// One plain line under each page's title: what this page is, in words for someone new to it.
export const PAGE_INTRO = {
  plan: 'Your week, one day at a time. Tap a day to see what to do.',
  tests: 'The six things the test checks. Try one, write your number in, and watch the ring fill.',
  more: 'Everything else, when you want it. None of it is homework.',
  run: 'Pick a run and tap Start. Hayden tells you when to run and when to walk.',
  strength: 'How heavy to lift, in one rule. You do not need to remember it: Hayden does.',
  food: 'What to eat to train well. Start with the protein number.',
  care: 'Something sore? Find it here and see what to do today.',
  today: 'How Hayden talks to you, and when he reminds you.',
}
