// This week's focus (BadgeFit, on Home): what to improve to be ready for the test, narrowed
// week by week. Early on, up to three standards to close; with two weeks left, two; in the last
// week before the test week, one; in the test week, nothing new: sharpen and rest. Untested
// standards come first (you cannot fix what you have not measured). Pure.
import { readiness, fmtResult, DEFAULT_BEEP_TARGET } from './standards.js'
import { planWeekOf, daysUntil, phaseOf } from './programme.js'
import { AREAS } from './brief.js'

/**
 * { days, week, last, final, phase, headline, items: [{ icon, title, detail }] } for Home, or
 * null without a plan.
 */
export function weeklyFocus(P, today) {
  if (!P?.level || !P.start) return null
  const pw = planWeekOf(P, today)
  if (!pw.week) return null
  const days = P.testDate ? daysUntil(P.testDate, today) : null
  const weeksLeft = pw.after ? 0 : Math.max(0, pw.last - pw.week) // full weeks after this one
  const name = (P.testName || '').trim() || 'PCT'
  const phase = phaseOf(P.level, pw.tw || 1)
  const ready = readiness(P.results, P.beepTarget || DEFAULT_BEEP_TARGET)
  const untested = ready.rows.filter(r => !r.ev)
  const failing = ready.rows.filter(r => r.ev && !r.ev.pass).sort((a, b) => a.ev.pct - b.ev.pct)
  const base = { days, week: pw.week, last: pw.last, final: pw.final, phase: phase.n }

  if (pw.after) return { ...base, headline: `Your ${name} is done. Keep the habit going.`, items: [] }
  if (pw.final) {
    return { ...base, headline: `${name} week. Nothing new now: sharpen and rest.`, items: [
      { icon: '🧘', title: 'Light training only', detail: 'Half the sets, same weights, nothing to failure' },
      { icon: '😴', title: 'Sleep and food', detail: '8 hours a night, carbs the night before, nothing new to eat' },
    ] }
  }
  // How many things to work on this week: fewer as the test gets closer.
  const n = weeksLeft >= 3 ? 3 : weeksLeft === 2 ? 2 : 1
  const items = []
  if (untested.length) items.push({ icon: '🧪', title: 'Test day baseline', detail: `${untested.length} of 6 standards not tested yet. Run Test day in the PCT tab` })
  for (const r of failing) {
    if (items.length >= n) break
    const a = AREAS[r.std.id] || {}
    items.push({ icon: r.std.icon, title: `${r.std.name}: ${fmtResult(r.std.id, r.latest.v)}, ${r.ev.pct}% of the mark`, detail: a.train ? `Train: ${a.train}` : '' })
  }
  if (!items.length) items.push({ icon: '✅', title: 'Passing everything you have tested', detail: 'Build the margin: same plan, push the weights and the beep level' })
  const headline = n === 1 ? `One thing to nail before ${name} week.` : `${items.length === 1 ? 'Your focus' : `Your ${items.length} focus areas`} this week.`
  return { ...base, headline, items: items.slice(0, n) }
}
