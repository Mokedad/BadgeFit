// Police Prep: the physical standards an applicant has to meet, and how a logged attempt
// reads against them. Pure data and pure functions, no store, no React.
//
// The numbers are the NSW Police applicant standards as supplied by the app owner.
// The beep test has two numbers: the pass mark (S.police.beepTarget, 7.1) that pass/fail is
// judged by, and a training goal above it (S.police.beepGoal, 7.2) so the pass is comfortable on the
// day. Both are settings, because standards differ by state and change over time.

export const DEFAULT_BEEP_TARGET = '7.1'
export const DEFAULT_BEEP_GOAL = '7.2'

// better: 'higher' means a bigger number passes, 'lower' a smaller one (a timed course).
export const STANDARDS = [
  {
    id: 'grip', name: 'Handgrip strength', unit: 'kg', min: 30, better: 'higher', attempts: 2, perHand: true,
    academy: 35, icon: '✊',
    how: 'Squeeze a hand dynamometer as hard as you can, arm by your side. Best of 2 attempts, each hand.',
    note: 'The academy asks for 35 kg each hand, so train past 30.',
  },
  {
    id: 'bridge', name: 'Prone bridge', unit: 's', min: 90, better: 'higher', attempts: 1, icon: '🧱',
    how: 'Forearm plank on your toes. Head, hips and heels in one straight line. Shift your weight or break at the hips and the clock stops.',
  },
  {
    id: 'jump', name: 'Vertical jump', unit: 'cm', min: 30, better: 'higher', attempts: 2, icon: '⬆️',
    how: 'Standing reach first, then jump and touch as high as you can. The score is the difference. Best of 2.',
  },
  {
    id: 'pushups', name: 'Push-ups', unit: 'reps', min: 25, better: 'higher', attempts: 1, icon: '💪',
    how: 'Strict form on toes or knees: chest to fist height, full lockout, body straight. One attempt, no rest. The test ends when your hips sag or you cannot do another.',
  },
  {
    id: 'illinois', name: 'Illinois agility run', unit: 's', min: 20, better: 'lower', attempts: 2, icon: '🔀',
    how: 'Course 10 m long and 5 m wide, with 4 cones down the centre 3.3 m apart. Start lying face down, head on the start line, hands by your shoulders. On go, get up, run the course and weave the centre cones without knocking any. Best of 2.',
  },
  {
    id: 'beep', name: 'Beep test (20 m shuttle)', unit: 'level', better: 'higher', attempts: 1, icon: '📣',
    how: 'Run 20 m between lines, reaching each line before the beep. It speeds up about every minute. Miss a line and you get a warning; miss two in a row and you are out. Your score is the last level and shuttle you completed.',
  },
]

export const standardById = id => STANDARDS.find(s => s.id === id) || null

// --- beep test ---------------------------------------------------------------------------
// The standard 20 m multistage shuttle run (Ramsbottom et al. 1988, the "beep test"): shuttles
// per level as on its recording sheet; level 1 at 8.0 km/h, level 2 at 9.0, then 0.5 km/h more
// each level (level 21 at 18.5). Seconds per shuttle follow from the speed: 9.0 s at level 1,
// 8.0 s at level 2, and so on, about a minute a level.
const SHUTTLES = [7, 8, 8, 9, 9, 10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16]

export const BEEP_LEVELS = SHUTTLES.map((shuttles, i) => {
  const speed = i === 0 ? 8 : 8.5 + i * 0.5
  return { level: i + 1, shuttles, speed, secPerShuttle: Math.round((20 / (speed / 3.6)) * 100) / 100 }
})

/** "7.5" → { level: 7, shuttle: 5 }. Shuttle numbers run past 9 ("8.10"), so never a float. */
export function parseBeep(text) {
  const m = /^\s*(\d{1,2})(?:[.\-/ ](\d{1,2}))?\s*$/.exec(String(text ?? ''))
  if (!m) return null
  const level = Number(m[1]), shuttle = m[2] == null ? 1 : Number(m[2])
  const row = BEEP_LEVELS[level - 1]
  if (!row || shuttle < 1 || shuttle > row.shuttles) return null
  return { level, shuttle }
}

export const fmtBeep = b => (b ? `${b.level}.${b.shuttle}` : '')

/** Total shuttles completed to reach this level and shuttle, for ordering and progress. */
export function beepShuttles(b) {
  if (!b) return 0
  let n = 0
  for (let i = 0; i < b.level - 1; i++) n += BEEP_LEVELS[i].shuttles
  return n + b.shuttle
}

export const beepDistance = b => beepShuttles(b) * 20

// --- reading an attempt ------------------------------------------------------------------

// The number one result is judged by: a grip result is its weaker hand, a beep result its
// shuttle count. null when the value is missing or unreadable.
export function scoreOf(id, value) {
  if (value == null || value === '') return null
  if (id === 'grip') {
    const l = Number(value?.left), r = Number(value?.right)
    if (!(l > 0) || !(r > 0)) return null
    return Math.min(l, r)
  }
  if (id === 'beep') {
    const b = typeof value === 'object' ? value : parseBeep(value)
    return b ? beepShuttles(b) : null
  }
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const targetScore = (std, beepTarget) =>
  std.id === 'beep' ? beepShuttles(parseBeep(beepTarget) || parseBeep(DEFAULT_BEEP_TARGET)) : std.min

/**
 * How a value reads against its standard: { pass, score, target, pct } where pct is how far
 * along the way to the standard it is (0-100, capped), or null for no readable value.
 */
export function evaluate(id, value, beepTarget = DEFAULT_BEEP_TARGET) {
  const std = standardById(id)
  const score = scoreOf(id, value)
  if (!std || score == null) return null
  const target = targetScore(std, beepTarget)
  const pass = std.better === 'lower' ? score > 0 && score <= target : score >= target
  let pct
  if (std.better === 'lower') pct = score > 0 ? Math.min(100, Math.round((target / score) * 100)) : 0
  else pct = Math.min(100, Math.round((score / target) * 100))
  return { pass, score, target, pct }
}

/** The best of a list of results [{ id, v, at }] for one standard, or null. */
export function bestResult(results, id) {
  const std = standardById(id)
  let best = null, bestScore = null
  for (const r of results || []) {
    if (r.id !== id) continue
    const s = scoreOf(id, r.v)
    if (s == null) continue
    const better = bestScore == null || (std.better === 'lower' ? s < bestScore : s > bestScore)
    if (better) { best = r; bestScore = s }
  }
  return best
}

/** The latest result for one standard (by `at`, then by position), or null. */
export function latestResult(results, id) {
  let out = null
  for (const r of results || []) if (r.id === id && scoreOf(id, r.v) != null && (!out || (r.at || '') >= (out.at || ''))) out = r
  return out
}

/**
 * Where the applicant stands on every standard: per standard the latest evaluation, and over
 * all of them how many pass and an overall readiness percent (the mean of the per-standard
 * progress, untested standards counting as 0).
 */
export function readiness(results, beepTarget = DEFAULT_BEEP_TARGET) {
  const rows = STANDARDS.map(std => {
    const latest = latestResult(results, std.id)
    return { std, latest, ev: latest ? evaluate(std.id, latest.v, beepTarget) : null }
  })
  const passed = rows.filter(r => r.ev?.pass).length
  const pct = Math.round(rows.reduce((a, r) => a + (r.ev ? r.ev.pct : 0), 0) / rows.length)
  const weakest = rows.filter(r => !r.ev?.pass).sort((a, b) => (a.ev?.pct ?? 0) - (b.ev?.pct ?? 0))[0] || null
  return { rows, passed, total: rows.length, pct, weakest: weakest?.std || null }
}

/** A display string for a value of one standard. */
export function fmtResult(id, v) {
  if (v == null) return ''
  if (id === 'grip') return `L ${v.left} / R ${v.right} kg`
  if (id === 'beep') return typeof v === 'object' ? fmtBeep(v) : String(v)
  const std = standardById(id)
  return `${v} ${std?.unit === 'reps' ? 'reps' : std?.unit || ''}`.trim()
}
