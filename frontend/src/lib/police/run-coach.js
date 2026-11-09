// Jarvis on a run (BadgeFit, components/RunPlayer.jsx): a coach, not a narrator. He checks in at
// 2, 5, 7 and 10 minutes, then every 5, with something different each time: a push, a fact
// about your own running this week, how this run compares with your last one of the same kind.
// When a hard part starts he lifts the intensity. Never the same line twice in a run. Pure: the
// numbers come in as arguments, and `seed` picks the line.

/** Minutes into a run when Jarvis checks in. */
export function checkInMinutes(totalMin) {
  const out = [2, 5, 7, 10]
  for (let m = 15; m < totalMin - 1; m += 5) out.push(m)
  return out.filter(m => m < totalMin)
}

const BY_CAT = {
  base: [
    'Nice and relaxed. If you can talk, you are doing it right.',
    'This is where the engine gets built. Easy miles, big future.',
    'Shoulders down, hands loose. Let the legs do the work.',
    'Every easy run is money in the bank for test day.',
    'Smooth breathing. You could hold this pace all day, and that is the point.',
  ],
  vo2: [
    'This is the stuff that moves your beep test. Embrace it.',
    'Hard is the point today. Your ceiling is going up right now.',
    'Lungs burning? Good. That is the adaptation happening.',
    'Drive the arms. They set the pace for the legs.',
    'You are teaching your body to go again when it wants to stop.',
  ],
  intervals: [
    'Fast feet, quick turnover. Stay tall.',
    'Every rep is a level on the beep test. Bank it.',
    'Recover hard in the rest, then hit the next one like you mean it.',
    'Speed is a skill. You are practising it right now.',
    'Stay in it. The last reps are where the gains live.',
  ],
  tempo: [
    'Comfortably hard. Hold it right there.',
    'Find the rhythm and lock it in. This is where you stop fading.',
    'Steady breathing, steady pace. You own this.',
    'This pace is going to feel easy on test day. Keep stacking it.',
    'Relax the face, relax the hands. Hard pace, calm body.',
  ],
  beep: [
    'Turn fast, push off the line. Turns are free seconds.',
    'Run it like the real thing. Every shuttle counts.',
    'Low at the turn, explode out of it.',
    'This is exactly what test day feels like. Get used to it.',
  ],
  recovery: [
    'Easy does it. Recovery is training too.',
    'Let the legs flush out. Tomorrow you go hard again.',
    'Nice and gentle. Enjoy this one.',
  ],
}
const ANY = [
  'Keep going. You have got this.',
  'Look at you go. This is what discipline looks like.',
  'Nobody is making you do this. That is what makes it count.',
  'The badge is earned one run at a time. This is one of them.',
  'Halfway through anything is the hard bit. Push through it.',
  'You are stronger than the voice telling you to stop.',
  'Future you is going to be so glad you did this.',
  'One more minute, then one more. That is how it is done.',
  'Proud of this effort. Seriously. Keep it rolling.',
]
const INTENSE = {
  vo2: ['Here we go. Hard effort now, all in.', 'This is the work. Go!', 'Big effort. Lift the knees, drive the arms.'],
  intervals: ['Go time. Fast now!', 'Rep on. Quick feet, stay tall.', 'Hit it! Make this one count.'],
  tempo: ['Pick it up to comfortably hard. Hold it.', 'Tempo time. Find that rhythm.'],
  beep: ['Line to line, go!', 'On the beep. Turn fast!'],
  base: ['Pick it up a touch now. Stay smooth.'],
  recovery: ['Bit of pace now, nothing crazy.'],
}

const pickFrom = (list, seed) => list[Math.abs(Math.floor(seed)) % list.length]

/** What your own running says, for the check-ins: lines with your numbers in them. */
export function statLines({ run, runLog = [], today, minutesSoFar = 0 }) {
  const out = []
  const weekAgo = new Date(Date.parse(today + 'T12:00:00Z') - 6 * 86400000).toISOString().slice(0, 10)
  const week = runLog.filter(r => r && r.at >= weekAgo && r.at <= today)
  if (week.length) {
    const mins = week.reduce((a, r) => a + (r.min || 0), 0) + Math.round(minutesSoFar)
    out.push(`This is run number ${week.length + 1} this week. That is ${mins} minutes of running in seven days. That is how the beep test moves.`)
  }
  const last = [...runLog].reverse().find(r => r && r.run === run?.id)
  if (last?.rpe) out.push(`Last time you did this one you rated it ${last.rpe} out of 10. Let us make it feel easier today.`)
  if (last?.km && last?.min) out.push(`Last time: ${last.km} kilometres in ${last.min} minutes. Chase it.`)
  if (runLog.length >= 5) out.push(`${runLog.length} runs logged since you started. Look at the habit you have built.`)
  return out
}

/**
 * The line for a check-in at `minute`, not one already said (`said`, a Set). Mixes the run type's
 * lines, your own numbers (from statLines) and general pushes, so no two runs sound the same.
 */
export function checkInLine({ cat, minute, seed = Date.now(), stats = [], said = new Set(), totalMin = 30 }) {
  const left = Math.max(0, Math.round(totalMin - minute))
  const timed = left > 0 && left <= 5 ? [`${left} ${left === 1 ? 'minute' : 'minutes'} to go. Finish strong!`] : []
  // Every other check-in brings your own numbers in, when there are any.
  const pools = [timed, (minute === 5 || minute % 10 === 0) ? stats : [], BY_CAT[cat] || [], ANY]
  for (const pool of pools) {
    const fresh = pool.filter(l => !said.has(l))
    if (fresh.length) return pickFrom(fresh, seed + minute)
  }
  return pickFrom(ANY, seed + minute)
}

/** The lift when a hard part starts. */
export function intenseLine(cat, seed = Date.now()) {
  return pickFrom(INTENSE[cat] || INTENSE.intervals, seed)
}
