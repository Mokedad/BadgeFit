// The surprise at the end of a BadgeFit workout (sheets.jsx, the finish screen): one card, and which
// one it is changes from day to day, the way a reward that varies keeps people coming back. It is
// always something real: gear Hayden just earned, a new best, a round number of sessions, and
// otherwise one of Hayden's tips for the test. Pure.

export const GEAR_NAMES = {
  headband: 'Sweatband', whistle: 'Whistle', bolt: 'Lightning bolt', badge: 'Gold badge',
  stripes: 'Shoulder stripes', cap: 'Academy cap', medal: 'Academy medal',
}
export const GEAR_WHY = {
  headband: 'For training 4 weeks.', whistle: 'For passing a standard.', bolt: 'For beating your beep test goal.',
  badge: 'For passing the PCT.', stripes: 'For passing the PCT.', cap: 'For making the Academy.', medal: 'For making the Academy.',
}

export const MILESTONES = [1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500]

export const TIPS = [
  'Beep test: turn right on the line. Running wide past it costs you every shuttle.',
  'Beep test: settle into each new level early, before the beep catches you.',
  'Push-ups: hands under your shoulders, body in one straight line, chest down to fist height.',
  'Prone bridge: squeeze your glutes and brace your stomach. The line from head to heels is the test.',
  'Agility run: stay low through the cones and look ahead to the next one.',
  'Vertical jump: swing your arms hard on the way up, and land soft.',
  'Grip: dead hangs and farmers walks build it faster than anything.',
  'Sleep is training too. Aim for 8 hours, most of all before a test day.',
  'Easy runs should feel easy: you can still hold a conversation.',
  'Drink water through the day, not only at the gym.',
  'Warm up before every test: 10 minutes of easy jogging and a few drills.',
  'Two hard days in a row? Make the next one easy.',
]

const cap = s => String(s || '').replace(/^./, c => c.toUpperCase())

/**
 * { kind, icon, title, sub, gear? } for the finish screen.
 * newGear: gear earned by this session (ids); bests: names of exercises with a new heaviest set;
 * sessions: how many sessions are logged now, this one included.
 */
export function pickSurprise({ newGear = [], bests = [], sessions = 0 } = {}) {
  const gear = newGear.find(g => GEAR_NAMES[g])
  if (gear) return { kind: 'gear', icon: 'gift', gear, title: `New for your Hayden: ${GEAR_NAMES[gear]}`, sub: GEAR_WHY[gear] }
  if (bests.length === 1) return { kind: 'best', icon: 'trophy', title: `New best: ${cap(bests[0])}`, sub: 'The heaviest you have lifted on it.' }
  if (bests.length > 1) return { kind: 'best', icon: 'trophy', title: `${bests.length} new bests`, sub: bests.slice(0, 3).map(cap).join(', ') + (bests.length > 3 ? ' and more' : '') }
  if (MILESTONES.includes(sessions)) {
    return sessions === 1
      ? { kind: 'milestone', icon: 'medal', title: 'First session done', sub: 'The start of the road to the badge.' }
      : { kind: 'milestone', icon: 'medal', title: `${sessions} sessions done`, sub: 'Every one of them counts.' }
  }
  return { kind: 'tip', icon: 'lightbulb', title: "Hayden's tip", sub: TIPS[Math.abs(Math.round(sessions)) % TIPS.length] }
}

/** Gear in `after` that was not in `before`. */
export const gearGained = (before = [], after = []) => after.filter(g => !before.includes(g))
