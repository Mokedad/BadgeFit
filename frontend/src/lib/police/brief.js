// Jarvis's trainer brief: what a personal trainer would want on a clipboard before answering
// "what should I do today?". Built on the device from the BadgeFit data and sent with a question
// to the AI Coach (lib/coach-api.js askCoach → api/coach/core/payload.js cleanBrief), which
// answers as Jarvis (api/coach/prompts/ask.md). Pure: everything comes in as arguments.
import { weekPlan, weekNumber, phaseOf, daysUntil } from './programme.js'
import { readiness, fmtResult, DEFAULT_BEEP_TARGET } from './standards.js'
import { runForDay, runsThisWeek, runById, runMinutes } from './runs.js'
import { dayTotals, bodyProgress } from './meals.js'
import { macroTargets } from './nutrition.js'

// Which body area and what training moves each standard.
export const AREAS = {
  grip: { area: 'Grip and forearms', train: 'farmers walks, hammer curls, dead hangs, towel holds' },
  bridge: { area: 'Core', train: 'front and side planks, dead bugs, hollow holds' },
  jump: { area: 'Leg power', train: 'squats, jump squats, box jumps, kettlebell swings' },
  pushups: { area: 'Chest, shoulders and triceps', train: 'push-up volume, bench press, dips, close-grip presses' },
  illinois: { area: 'Agility and speed', train: 'cone weaves, short sprints, change of direction, getting up fast from prone' },
  beep: { area: 'Aerobic engine', train: 'VO2 intervals, 20 m shuttles, easy base runs' },
}

const dow = iso => new Date(iso + 'T12:00:00').getDay()
const dayLine = d => d && { title: d.title, kind: d.kind, minutes: d.minutes || null, details: (d.details || []).slice(0, 4) }

/** The brief, or null for someone who is not a BadgeFit member. */
export function policeBrief(S, today) {
  const P = S?.police
  if (!P?.level && !(P?.results || []).length) return null
  const week = weekNumber(P.start, today)
  const plan = P.level && week ? weekPlan(P.level, week, P.age, { beepFocus: P.beepFocus }) : null
  const todayDay = plan?.days.find(d => d.day === dow(today)) || null
  const tomorrowISO = new Date(Date.parse(today + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10)
  const tomorrowWeek = weekNumber(P.start, tomorrowISO)
  const tomorrowDay = P.level && tomorrowWeek ? weekPlan(P.level, tomorrowWeek, P.age, { beepFocus: P.beepFocus }).days.find(d => d.day === dow(tomorrowISO)) : null
  const run = runForDay(todayDay)
  const ready = readiness(P.results, P.beepTarget || DEFAULT_BEEP_TARGET)
  // Furthest from passing first: untested standards are a gap too (test them).
  const gaps = ready.rows
    .map(r => ({ standard: r.std.name, id: r.std.id, latest: r.latest ? fmtResult(r.std.id, r.latest.v) : 'not tested', on: r.latest?.at || null, pct: r.ev ? r.ev.pct : 0, pass: !!r.ev?.pass, ...AREAS[r.std.id] }))
    .sort((a, b) => (a.pass - b.pass) || (a.pct - b.pct))
  const weekRuns = runsThisWeek(P.runLog, today)
  const targets = macroTargets({ weightKg: P.weightKg, goal: P.goal || 'lose', heightCm: P.heightCm, age: P.age, sex: P.sex })
  const food = dayTotals(P.meals, today, targets)
  const body = bodyProgress(S.bodyweight, { startISO: P.start, goal: S.targetW })
  const days = P.testDate ? daysUntil(P.testDate, today) : null
  return {
    level: P.level || null,
    week: week || null,
    phase: P.level && week ? { n: phaseOf(P.level, week).n, range: phaseOf(P.level, week).range } : null,
    daysToTest: days != null && days >= 0 ? days : null,
    weeksToTest: days != null && days >= 0 ? Math.round((days / 7) * 10) / 10 : null,
    today: dayLine(todayDay),
    todayRun: run ? { name: run.name, minutes: runMinutes(run), why: run.why } : null,
    tomorrow: dayLine(tomorrowDay),
    gaps: gaps.slice(0, 6),
    runsThisWeek: { count: weekRuns.length, minutes: weekRuns.reduce((a, r) => a + (r.min || 0), 0), last: weekRuns.slice(-3).map(r => ({ run: runById(r.run)?.name || 'Run', on: r.at, rpe: r.rpe || null })) },
    foodToday: { kcal: food.kcal, protein: food.protein, kcalTarget: targets?.kcal || null, proteinTarget: targets?.protein || null },
    weight: body ? { start: body.start, now: body.now, change: body.change, goal: S.targetW || null, unit: S.unit || 'kg' } : null,
  }
}
