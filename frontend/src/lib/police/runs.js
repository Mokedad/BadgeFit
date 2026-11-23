// BadgeFit runs: a library of running sessions, each written as segments a guided timer can play
// (views/RunPlayer.jsx). A segment is timed (`sec`) or a distance (`dist`, metres) that the
// runner ends with a tap, because nobody can time a 100 m rep from the phone.
//
// kind: warm | work | rest | cool. `effort` is a zone from ZONES, so the player can show the
// heart rate to aim for from the runner's age.

export const ZONES = {
  z1: { name: 'Zone 1 · recovery', lo: 0.5, hi: 0.6, feel: 'Very easy. Nose breathing.' },
  z2: { name: 'Zone 2 · base', lo: 0.6, hi: 0.75, feel: 'Easy. You can hold a conversation.' },
  z3: { name: 'Zone 3 · steady', lo: 0.75, hi: 0.82, feel: 'Steady. Short sentences only.' },
  z4: { name: 'Zone 4 · threshold', lo: 0.82, hi: 0.9, feel: 'Comfortably hard. A few words.' },
  z5: { name: 'Zone 5 · VO2 max', lo: 0.9, hi: 1, feel: 'Hard. You cannot talk.' },
}

export const CATEGORIES = [
  { id: 'base', name: 'Base', emoji: '🟢', about: 'Easy aerobic running. Builds the engine everything else sits on. Most of your running.' },
  { id: 'vo2', name: 'VO2 max', emoji: '🔴', about: 'Hard minutes near your maximum. Raises the ceiling: the biggest lever for the beep test.' },
  { id: 'intervals', name: 'Intervals', emoji: '🟠', about: 'Fast repeats with rest. Speed, turnover and the ability to go again.' },
  { id: 'tempo', name: 'Tempo', emoji: '🟡', about: 'Comfortably hard and steady. Pushes back the point where you fade.' },
  { id: 'beep', name: 'Beep prep', emoji: '📣', about: 'Shuttles and turns at test pace. Practise the test itself.' },
  { id: 'recovery', name: 'Recovery', emoji: '🔵', about: 'Very easy movement that helps you recover between hard days.' },
  { id: 'walk', name: 'Walks', emoji: '🚶', about: 'Walking for recovery and rest days: loosens the legs and adds easy minutes without fatigue.' },
]

const m = n => n * 60
const warm = (min = 10) => ({ kind: 'warm', sec: m(min), label: 'Warm-up jog', effort: 'z1' })
const cool = (min = 5) => ({ kind: 'cool', sec: m(min), label: 'Cool-down walk or jog', effort: 'z1' })
const work = (sec, label, effort = 'z5') => ({ kind: 'work', sec, label, effort })
const rest = (sec, label = 'Easy jog', effort = 'z1') => ({ kind: 'rest', sec, label, effort })
const runDist = (dist, label, effort = 'z5') => ({ kind: 'work', dist, label: label || `Run ${dist} m hard`, effort })
const walkDist = (dist, label) => ({ kind: 'rest', dist, label: label || `Walk ${dist} m back`, effort: 'z1' })

/** n rounds of `parts`, without the trailing rest after the last round. */
function rounds(n, parts) {
  const out = []
  for (let i = 0; i < n; i++) {
    const last = i === n - 1
    for (const p of parts) if (!(last && p.kind === 'rest' && p === parts.at(-1))) out.push({ ...p, round: i + 1, of: n })
  }
  return out
}

export const RUNS = [
  // --- base
  { id: 'easy-30', cat: 'base', name: 'Easy run, 30 min', km: '4-5 km', why: 'Your bread and butter. Easy enough to recover from, so you can train hard tomorrow.', segments: [work(m(30), 'Easy run', 'z2')] },
  { id: 'easy-45', cat: 'base', name: 'Easy run, 45 min', km: '6-7 km', why: 'More time in zone 2 builds more aerobic engine, the base of a good beep test.', segments: [work(m(45), 'Easy run', 'z2')] },
  { id: 'long-60', cat: 'base', name: 'Long run, 60 min', km: '8-10 km', why: 'Once a week for intermediate runners. Slow is the point.', segments: [work(m(60), 'Long easy run', 'z2')] },
  { id: 'fartlek', cat: 'base', name: 'Fartlek, 30 min', km: '4-5 km', why: 'Easy running with short pick-ups. Playful speed without the pressure.', segments: [warm(10), ...rounds(6, [work(30, 'Pick it up', 'z4'), rest(m(2), 'Back to easy', 'z2')]), cool(5)] },
  // --- VO2 max
  { id: 'vo2-4x4', cat: 'vo2', name: '4×4 intervals', km: 'about 5 km', why: 'The classic VO2 max session: four minutes near your max, four times.', segments: [warm(), ...rounds(4, [work(m(4), '4 min hard'), rest(m(3), '3 min easy jog')]), cool()] },
  { id: 'vo2-30-30', cat: 'vo2', name: '30/30 sprints', km: 'about 4 km', why: 'Short and sharp. Many minutes near VO2 max in small bites.', segments: [warm(), ...rounds(10, [work(30, 'Sprint 30 s'), rest(30, 'Walk or rest 30 s')]), cool(10)] },
  // Short on purpose: 10 to 15 minutes of hills is plenty (owner, November 2026).
  { id: 'vo2-hills', cat: 'vo2', name: 'Hill repeats', km: 'about 2 km', why: 'Hills build power and VO2 with less pounding on the legs. Short and sharp: about 11 minutes.', segments: [warm(3), ...rounds(4, [work(60, '1 min hard uphill'), rest(90, 'Walk or jog back down')]), cool(2)] },
  { id: 'vo2-ladder', cat: 'vo2', name: 'Time ladder 5-4-3-2-1-5', km: 'about 6 km', why: 'Long to short and back to long: the last 5 minutes teach you to hold on.', segments: [warm(), work(m(5), '5 min hard', 'z4'), rest(60), work(m(4), '4 min hard'), rest(60), work(m(3), '3 min hard'), rest(60), work(m(2), '2 min hard'), rest(60), work(m(1), '1 min hard'), rest(60), work(m(5), '5 min hard', 'z4'), cool()] },
  // --- intervals
  { id: 'int-100s', cat: 'intervals', name: '100 m repeats ×10', km: 'about 3 km', why: 'Speed with full control. Tap Done at the end of each 100 m.', segments: [warm(), ...rounds(10, [runDist(100, 'Run 100 m at 80-90%'), walkDist(100)]), cool()] },
  { id: 'int-50s', cat: 'intervals', name: '50 m repeats ×20', km: 'about 3 km', why: 'Quick feet and fast starts: the first steps of every shuttle.', segments: [warm(), ...rounds(20, [runDist(50, 'Run 50 m at 80-90%'), walkDist(50)]), cool()] },
  { id: 'int-200-100', cat: 'intervals', name: '200 m + 100 m sprints', km: 'about 3 km', why: 'Five longer sprints, then five short ones on tired legs.', segments: [warm(), ...rounds(5, [runDist(200, 'Sprint 200 m'), rest(60, 'Rest 1 min')]), rest(60, 'Rest 1 min'), ...rounds(5, [runDist(100, 'Sprint 100 m'), rest(30, 'Rest 30 s')]), cool()] },
  { id: 'int-400-300-200', cat: 'intervals', name: '400-300-200 repeats', km: 'about 4 km', why: 'Hard efforts with shrinking rest. Twice through, then one more 400.', segments: [warm(), ...rounds(2, [runDist(400, 'Run 400 m hard', 'z4'), rest(120, 'Rest 2 min'), runDist(300, 'Run 300 m hard'), rest(90, 'Rest 90 s'), runDist(200, 'Run 200 m hard'), rest(60, 'Rest 1 min')]), runDist(400, 'Last 400 m: empty the tank'), cool()] },
  { id: 'int-5x400', cat: 'intervals', name: '5 × 400 m', km: 'about 4 km', why: 'Hold the same pace on every one. Even splits win tests.', segments: [warm(), ...rounds(5, [runDist(400, 'Run 400 m hard', 'z4'), rest(120, 'Rest 2 min')]), cool()] },
  { id: 'int-ladder', cat: 'intervals', name: 'Distance ladder', km: 'about 4 km', why: 'Easy then hard for the same distance, up the ladder and back down.', segments: [warm(), ...[100, 200, 300, 400, 300, 200, 100].flatMap(d => [runDist(d, `Run ${d} m easy`, 'z2'), runDist(d, `Run ${d} m hard`, 'z4')]), cool()] },
  // --- tempo
  { id: 'tempo-20', cat: 'tempo', name: 'Tempo run, 20 min', km: 'about 5 km', why: 'One even, comfortably hard effort. Teaches your body to clear fatigue at speed.', segments: [warm(), work(m(20), 'Comfortably hard, even pace', 'z4'), cool()] },
  // The Academy prep plan's steady run (programme.js, key 'steady'): formation pace, even and together.
  { id: 'steady-30', cat: 'tempo', name: 'Steady run, 30 min', km: '4-5 km', why: 'Formation pace: one even pace the whole way, no stopping. The way an Academy squad runs.', segments: [warm(5), work(m(20), 'Steady, even pace', 'z3'), cool(5)] },
  { id: 'steady-40', cat: 'tempo', name: 'Steady run, 40 min', km: '6-7 km', why: 'Formation pace for longer: even, together, no stopping. Builds what Academy runs ask of you.', segments: [warm(5), work(m(30), 'Steady, even pace', 'z3'), cool(5)] },
  { id: 'tempo-cruise', cat: 'tempo', name: 'Cruise intervals 3 × 8 min', km: 'about 6 km', why: 'Tempo pace in three blocks: more time at threshold for the same effort.', segments: [warm(), ...rounds(3, [work(m(8), '8 min comfortably hard', 'z4'), rest(m(2), '2 min easy jog', 'z2')]), cool()] },
  // --- the no-gym Academy plan (lib/police/programme.js noGymDays), from a coach's 3-day plan
  { id: 'max-30', cat: 'tempo', name: '30 min run, as far as you can', km: '5-7 km', why: 'One hard, even effort for 30 minutes. Note the distance: next time, go further.', segments: [warm(5), work(m(30), 'As far as you can in 30 min, even pace', 'z4'), cool(5)] },
  { id: 'jog-70', cat: 'recovery', name: 'Recovery jog at 70%, 25 min', km: 'about 4 km', why: 'Medium: not too easy, not too hard. Keeps the legs moving between the hard days.', segments: [work(m(25), 'Jog at 70% effort', 'z2')] },
  { id: 'fartlek-2-2', cat: 'intervals', name: 'Fartlek 2 min on, 2 min off', km: 'about 4 km', why: '2 minutes easy, 2 minutes fast, for 20 minutes. Teaches you to change pace and recover on the move.', segments: [warm(5), ...rounds(5, [work(m(2), '2 min easy (60-70%)', 'z2'), work(m(2), '2 min fast (90%+)', 'z5')]), cool(5)] },
  { id: 'int-4x200', cat: 'intervals', name: '4 × 200 m', km: 'about 3 km', why: 'Four fast 200s with 3 minutes to recover. Fast and smooth, not a sprint you cannot hold.', segments: [warm(), ...rounds(4, [runDist(200, 'Run 200 m fast'), rest(m(3), '3 min easy')]), cool()] },
  { id: 'int-4x400', cat: 'intervals', name: '4 × 400 m', km: 'about 4 km', why: 'Four fast 400s with 3 minutes to recover. Hold the same pace on every one.', segments: [warm(), ...rounds(4, [runDist(400, 'Run 400 m fast', 'z4'), rest(m(3), '3 min easy')]), cool()] },
  { id: 'int-6x400', cat: 'intervals', name: '6 × 400 m', km: 'about 5 km', why: 'Six fast 400s with 3 minutes to recover. Even splits: the last as fast as the first.', segments: [warm(), ...rounds(6, [runDist(400, 'Run 400 m fast', 'z4'), rest(m(3), '3 min easy')]), cool()] },
  { id: 'int-8x800', cat: 'intervals', name: '8 × 800 m', km: 'about 8 km', why: 'The big one: eight fast 800s with 3 minutes to recover. Pace it, do not race the first.', segments: [warm(), ...rounds(8, [runDist(800, 'Run 800 m fast', 'z4'), rest(m(3), '3 min easy')]), cool()] },
  // --- run-walk: the first weeks for someone who cannot yet jog 20 minutes without stopping
  { id: 'run-walk-1', cat: 'base', name: 'Run-walk, 1 min on', km: 'about 2 km', why: 'Jog 1 minute, walk 2, eight times. The way everyone starts: it builds the habit without wrecking you.', segments: [work(m(5), 'Brisk walk to warm up', 'z1'), ...rounds(8, [work(60, 'Easy jog', 'z2'), rest(120, 'Walk')]), cool(3)] },
  { id: 'run-walk-2', cat: 'base', name: 'Run-walk, 2 min on', km: 'about 3 km', why: 'Jog 2 minutes, walk 2, seven times. Same easy pace, a little longer each jog.', segments: [work(m(5), 'Brisk walk to warm up', 'z1'), ...rounds(7, [work(120, 'Easy jog', 'z2'), rest(120, 'Walk')]), cool(3)] },
  { id: 'run-walk-3', cat: 'base', name: 'Run-walk, 4 min on', km: 'about 3 km', why: 'Jog 4 minutes, walk 1, five times. Nearly a full run now.', segments: [work(m(5), 'Brisk walk to warm up', 'z1'), ...rounds(5, [work(240, 'Easy jog', 'z2'), rest(60, 'Walk')]), cool(3)] },
  // --- beep prep
  { id: 'agility-drill', cat: 'beep', name: 'Agility drill, 15 min', km: '4 bottles as cones', why: 'The Illinois agility run in pieces. Mark 10 m by 5 m with four bottles down the middle, 3.3 m apart. Start face down, get up fast, weave the bottles, stay low in the turns.', segments: [warm(5), ...rounds(6, [work(30, 'Agility run: up from the floor, weave, sprint home', 'z5'), rest(60, 'Walk back, breathe')]), cool(3)] },
  { id: 'beep-shuttles', cat: 'beep', name: 'Beep shuttles ×8', km: '20 m shuttles', why: '1 minute of 20 m shuttles at 2 levels above your best, 8 times. Turn on the line, not around it.', segments: [warm(), ...rounds(8, [work(60, 'Shuttles: 2 levels above your best'), rest(60, 'Rest 1 min')]), cool()] },
  { id: 'shuttle-sprints', cat: 'beep', name: 'Shuttle sprints 10 × 10', km: '20 m shuttles', why: '10 sets of 10 × 20 m at 80-90%. Fast turns, low hips, touch the line.', segments: [warm(), ...rounds(10, [runDist(200, '10 × 20 m shuttles, touch every line'), rest(30, 'Rest 30 s')]), cool()] },
  // --- recovery
  { id: 'recovery-walk', cat: 'recovery', name: 'Incline walk, 30 min', km: 'treadmill 10-14%', why: 'Burns fat and loosens the legs without adding fatigue.', segments: [work(m(30), 'Brisk incline walk', 'z1')] },
  { id: 'recovery-jog', cat: 'recovery', name: 'Recovery jog, 20 min', km: 'about 3 km', why: 'Slower than easy. If in doubt, slower again.', segments: [work(m(20), 'Very easy jog', 'z1')] },
  // --- walks: recovery and rest days
  { id: 'walk-20', cat: 'walk', name: 'Easy walk, 20 min', km: 'about 2 km', why: 'A rest-day walk: gets the blood moving and the legs loose.', segments: [work(m(20), 'Easy walk', 'z1')] },
  { id: 'walk-30', cat: 'walk', name: 'Brisk walk, 30 min', km: 'about 3 km', why: 'Brisk enough to breathe a little harder, easy enough to recover from.', segments: [work(m(5), 'Easy walk to warm up', 'z1'), work(m(20), 'Brisk walk, long strides', 'z1'), work(m(5), 'Easy walk to finish', 'z1')] },
  { id: 'walk-45', cat: 'walk', name: 'Long walk, 45 min', km: 'about 4-5 km', why: 'Lots of easy minutes for the aerobic base, with no pounding.', segments: [work(m(45), 'Steady walk', 'z1')] },
  { id: 'walk-pickups', cat: 'walk', name: 'Walk with pick-ups, 30 min', km: 'about 3 km', why: 'Easy walking with short brisk bursts. Recovery that still wakes the legs up.', segments: [work(m(5), 'Easy walk', 'z1'), ...rounds(5, [work(60, 'Brisk walk, quick feet', 'z2'), work(m(3), 'Easy walk', 'z1')]), work(m(5), 'Easy walk to finish', 'z1')] },
]

export const runById = id => RUNS.find(r => r.id === id) || null
export const runsIn = cat => RUNS.filter(r => r.cat === cat)

/** A segment's seconds: its own, or a distance at 4 min/km work, 8 walking; an open one (no set time) 0. */
export const segSeconds = s => s.sec ?? (s.dist ? (s.dist / 1000) * (s.kind === 'work' ? 240 : 480) : 0)

/**
 * A run fitted to the time you chose: `choice` minutes, or 'open' (no set time: the clock counts
 * up until you finish). A run in rounds keeps its warm-up and cool-down and gets as many rounds as
 * fit; a steady run stretches or shortens its main block; anything else takes the difference on
 * its cool-down. The name follows a time it says ("Easy run, 30 min" chosen at 45 is "Easy run,
 * 45 min"). null or undefined leaves the run as it is.
 */
export function fitRun(run, choice) {
  if (!run || choice == null) return run
  const segs = run.segments || []
  const longestWork = () => segs.reduce((best, s, i) => (s.kind === 'work' && segSeconds(s) > (best < 0 ? -1 : segSeconds(segs[best])) ? i : best), -1)
  if (choice === 'open') {
    const main = segs[longestWork()]
    return { ...run, open: true, fitted: 'open', segments: [{ kind: 'work', open: true, label: 'Your pace, as long as you like', effort: main?.effort || 'z2' }] }
  }
  const want = Math.max(1, Math.round(Number(choice) || 0)) * 60
  const named = sec => ({ name: /, \d+ min$/.test(run.name || '') ? run.name.replace(/, \d+ min$/, `, ${Math.round(sec / 60)} min`) : run.name })
  const total = list => list.reduce((a, s) => a + segSeconds(s), 0)
  const inRounds = segs.map((s, i) => (s.of ? i : -1)).filter(i => i >= 0)
  const contiguous = inRounds.length && inRounds.at(-1) - inRounds[0] + 1 === inRounds.length && inRounds.every(i => segs[i].of === segs[inRounds[0]].of)
  if (contiguous) {
    const head = segs.slice(0, inRounds[0]), tail = segs.slice(inRounds.at(-1) + 1)
    const group = segs.filter(s => s.of && s.round === 1)
    const lastRest = group.at(-1)?.kind === 'rest' ? segSeconds(group.at(-1)) : 0
    const per = total(group)
    const n = Math.max(1, Math.min(30, Math.round((want - total(head) - total(tail) + lastRest) / per)))
    const body = []
    for (let i = 0; i < n; i++) {
      group.forEach(({ round: _r, of: _o, ...p }, j) => {
        // No rest after the last round, the way rounds() builds them.
        if (i === n - 1 && j === group.length - 1 && p.kind === 'rest') return
        body.push({ ...p, round: i + 1, of: n })
      })
    }
    const out = [...head, ...body, ...tail]
    return { ...run, ...named(total(out)), fitted: choice, segments: out }
  }
  const main = longestWork()
  const steady = main >= 0 && segs[main].sec != null && segs.filter(s => s.kind === 'work').length <= 3
  if (steady) {
    const sec = Math.max(60, want - (total(segs) - segSeconds(segs[main])))
    const out = segs.map((s, i) => (i === main ? { ...s, sec } : s))
    return { ...run, ...named(total(out)), fitted: choice, segments: out }
  }
  const coolAt = segs.length - 1
  if (segs[coolAt]?.kind !== 'cool') return { ...run, fitted: choice }
  const sec = Math.max(60, segSeconds(segs[coolAt]) + (want - total(segs)))
  const out = segs.map((s, i) => (i === coolAt ? { ...s, sec } : s))
  return { ...run, ...named(total(out)), fitted: choice, segments: out }
}

/** About how long a run takes, in minutes, counting a distance segment at 4 min/km work, 8 walking. */
export function runMinutes(run) {
  const sec = (run?.segments || []).reduce((a, s) => a + segSeconds(s), 0)
  return Math.round(sec / 60)
}

/** Where a run is on its timeline: seconds `t` in → { idx (segment), offset (s into it) }. */
export function seekRun(run, t) {
  const segs = run?.segments || []
  let left = Math.max(0, t)
  for (let i = 0; i < segs.length; i++) {
    const d = segSeconds(segs[i])
    if (left < d || i === segs.length - 1) return { idx: i, offset: Math.min(left, Math.max(0, d - 1)) }
    left -= d
  }
  return { idx: 0, offset: 0 }
}

/** Seconds into the run at segment `idx`, `offset` seconds in. */
export const runSecondsAt = (run, idx, offset) => (run?.segments || []).slice(0, idx).reduce((a, s) => a + segSeconds(s), 0) + Math.max(0, offset)

/** Heart rate range for a zone at an age (220 − age), or null without an age. */
export function hrFor(effort, age) {
  const a = Number(age), z = ZONES[effort]
  if (!z || !(a >= 14 && a <= 90)) return null
  const max = 220 - a
  return { lo: Math.round(max * z.lo), hi: Math.round(max * z.hi) }
}

// Which library run a programme day means (lib/police/programme.js weekPlan days).
const BY_PLAN_NAME = {
  '4×4 intervals': 'vo2-4x4', '100 m repeats': 'int-100s', 'Hill repeats': 'vo2-hills', 'Distance ladder': 'int-ladder',
  '30/30 sprints': 'vo2-30-30', '50 m repeats': 'int-50s', 'Time ladder': 'vo2-ladder', 'Shuttle sprints': 'shuttle-sprints',
  'Beep shuttles': 'beep-shuttles', 'Long ladder': 'int-ladder', '200 m + 100 m sprints': 'int-200-100',
  '400-300-200 repeats': 'int-400-300-200', '5 × 400 m': 'int-5x400',
}
export function runForDay(day) {
  if (!day) return null
  // A beginner's run-walk weeks (lib/police/programme.js weekPlan, opts.runWalk).
  const rw = /^Run-walk \((\d)\)/.exec(day.title)
  if (rw) return runById('run-walk-' + rw[1])
  if (day.key === 'easy') return runById(/(\d+) km/.exec(day.title)?.[1] >= 7 ? 'easy-45' : 'easy-30')
  if (day.key === 'tempo') return runById('tempo-20')
  if (day.key === 'steady') return runById(/(\d+) km/.exec(day.title)?.[1] >= 6 ? 'steady-40' : 'steady-30')
  if (day.key === 'long') return runById(/(\d+) km/.exec(day.title)?.[1] >= 8 ? 'long-60' : 'easy-45')
  if (day.key === 'walk') return runById('recovery-walk')
  if (day.key === 'ngJog') return runById('jog-70')
  if (day.key === 'vo2' || day.key === 'vo2b') {
    const name = day.title.replace(/^(VO2 max|Beep focus|Intervals): /, '')
    return runById(BY_PLAN_NAME[name]) || runById('vo2-4x4')
  }
  return null
}

/** The runs logged in the last 7 days ending `today` (S.police.runLog: [{ id, run, at, min, km, rpe }]). */
export function runsThisWeek(log, today) {
  const from = Date.parse(today + 'T00:00:00Z') - 6 * 86400000
  return (log || []).filter(r => Date.parse((r.at || '') + 'T00:00:00Z') >= from)
}
