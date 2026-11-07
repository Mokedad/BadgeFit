// BadgeFit: a simple meal tracker. One tap for the meals you eat every week, a quick add for the
// rest, and the day's calories and protein against your targets. Pure functions over
// S.police.meals ({ 'YYYY-MM-DD': [{ id, name, kcal, protein, t }] }) and S.police.myMeals.
//
// The preset numbers are honest estimates for typical portions, not lab values: edit a meal to
// your real portion, or read the label.

export const KEEP_DAYS = 90

// The coach's recruit-cut meals (nutrition.js DIETS 'recruit-cut') as one-tap presets.
export const PRESET_MEALS = [
  { id: 'p-porridge', name: 'Porridge, Greek yoghurt, whey, fruit', kcal: 520, protein: 42 },
  { id: 'p-shake', name: 'High-protein shake (lunch)', kcal: 200, protein: 30 },
  { id: 'p-ricecakes', name: 'Rice cakes ×3 (pre-run)', kcal: 105, protein: 2 },
  { id: 'p-steaks', name: 'Two lean steaks + vegetables', kcal: 650, protein: 90 },
  { id: 'p-carbonara', name: 'High-protein carbonara ready meal', kcal: 450, protein: 38 },
  { id: 'p-whey', name: 'Whey shake (water)', kcal: 120, protein: 24 },
  { id: 'p-eggs', name: '3 eggs + 2 whites, toast', kcal: 400, protein: 32 },
  { id: 'p-chicken-rice', name: 'Chicken, rice and salad bowl', kcal: 600, protein: 50 },
  { id: 'p-yoghurt', name: 'Greek yoghurt + berries', kcal: 200, protein: 20 },
]

const num = v => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : null }
const uid = () => Math.random().toString(36).slice(2, 10)

/** A clean meal from user input, or null when it has no name or no calories. */
export function cleanMeal({ name, kcal, protein }) {
  const n = String(name || '').trim().slice(0, 60)
  const k = num(kcal), p = num(protein) ?? 0
  if (!n || k == null || k > 5000 || p > 400) return null
  return { name: n, kcal: k, protein: p }
}

/** The meals map with one more meal on `day`, days older than KEEP_DAYS dropped. */
export function addMeal(meals, day, meal, now = Date.now()) {
  const m = cleanMeal(meal)
  if (!m) return meals || {}
  const next = { ...(meals || {}), [day]: [...((meals || {})[day] || []), { id: uid(), ...m, t: now }] }
  return prune(next, day)
}

export function removeMeal(meals, day, id) {
  const list = ((meals || {})[day] || []).filter(m => m.id !== id)
  const next = { ...(meals || {}) }
  if (list.length) next[day] = list
  else delete next[day]
  return next
}

export function prune(meals, today) {
  const cut = Date.parse(today + 'T00:00:00Z') - KEEP_DAYS * 86400000
  return Object.fromEntries(Object.entries(meals || {}).filter(([d]) => Date.parse(d + 'T00:00:00Z') >= cut))
}

/** The day's totals and where they stand against targets ({ kcal, protein }). */
export function dayTotals(meals, day, targets) {
  const list = (meals || {})[day] || []
  const kcal = list.reduce((a, m) => a + (m.kcal || 0), 0)
  const protein = list.reduce((a, m) => a + (m.protein || 0), 0)
  return {
    kcal, protein, count: list.length,
    kcalLeft: targets?.kcal ? targets.kcal - kcal : null,
    proteinLeft: targets?.protein ? targets.protein - protein : null,
    kcalPct: targets?.kcal ? Math.min(100, Math.round((kcal / targets.kcal) * 100)) : null,
    proteinPct: targets?.protein ? Math.min(100, Math.round((protein / targets.protein) * 100)) : null,
  }
}

/** The last `n` days ending today: [{ day, kcal, protein, logged }], oldest first. */
export function lastDays(meals, today, n = 7) {
  const t = Date.parse(today + 'T00:00:00Z')
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(t - (n - 1 - i) * 86400000).toISOString().slice(0, 10)
    const tot = dayTotals(meals, day)
    return { day, kcal: tot.kcal, protein: tot.protein, logged: tot.count > 0 }
  })
}

/** The meals to offer as one-tap buttons: your own first, then the presets you have not hidden. */
export function quickMeals(myMeals, hidden = []) {
  return [...(myMeals || []), ...PRESET_MEALS.filter(p => !hidden.includes(p.id))]
}

// --- body progress -----------------------------------------------------------------------

/**
 * From the weigh-ins ([{ d, w }], in the profile's unit), the programme start and the goal:
 * { start, now, change, toGoal, pct } where pct is how far along from start to goal. null with
 * no weigh-ins.
 */
export function bodyProgress(bodyweight, { startISO, startWeight, goal } = {}) {
  const list = (bodyweight || []).filter(b => b && b.d && Number(b.w) > 0).sort((a, b) => (a.d < b.d ? -1 : 1))
  if (!list.length) return null
  const first = startWeight > 0 ? Number(startWeight) : (list.find(b => !startISO || b.d >= startISO) || list[0]).w
  const latest = list.at(-1)
  const now = Number(latest.w)
  const change = Math.round((now - first) * 10) / 10
  let toGoal = null, pct = null
  if (goal > 0) {
    toGoal = Math.round((now - goal) * 10) / 10
    const span = first - goal
    pct = span ? Math.max(0, Math.min(100, Math.round(((first - now) / span) * 100))) : 100
  }
  return { start: Number(first), now, change, toGoal, pct, on: latest.d, series: list.slice(-30).map(b => Number(b.w)) }
}

// --- session time ------------------------------------------------------------------------

/**
 * About how long a routine takes, in minutes: 10 min warm-up and mobility, then per set the work
 * plus rest (a timed hold its seconds plus a minute), and cardio its own minutes plus 10.
 */
export function estimateMinutes(routine) {
  let sec = 0
  for (const e of routine?.ex || []) {
    const sets = Math.max(1, e.sets || 1)
    if (e.mode === 'cardio') sec += (e.min || 20) * 60 * sets
    else if (e.mode === 'time') sec += sets * ((e.sec || 30) + 60)
    else sec += sets * 150
  }
  return Math.round(sec / 60 + 10)
}
