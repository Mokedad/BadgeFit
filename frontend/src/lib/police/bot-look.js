// How a member's Hayden looks (BadgeFit): his line colour and the gear he has earned. Pure.
//
// Every member gets their own line colour, picked from their account id, so two people side by
// side have different Haydens. A guest's Hayden is grey, with no gear: gear and colour come with
// an account. Gear is earned by what was actually done (lib/police/standards.js for the tests).
import { readiness, evaluate, latestResult } from './standards.js'

// Clear colours that read on the off-white shell and glow on the navy visor.
export const LINE_COLOURS = ['#f2b81a', '#3fb6ff', '#2fd39a', '#ff7a59', '#b48cff', '#ff5fa2', '#20c3c3', '#9ccc3c', '#ff9f1c', '#6c8cff']
export const GUEST_COLOUR = '#9aa3b2'

/** A member's line colour from their account id (the same on every device), grey for a guest. */
export function lineColour(userId) {
  if (!userId) return GUEST_COLOUR
  let h = 0
  for (const c of String(userId)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return LINE_COLOURS[h % LINE_COLOURS.length]
}

const weekKey = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10) }

/** The gear earned, as a list for components/HaydenBot.jsx. A guest earns none. */
export function earnedGear(S, { guest = false } = {}) {
  if (guest) return []
  const P = S?.police || {}
  const gear = []
  const weeks = new Set((S?.workouts || []).filter(w => w?.d).map(w => weekKey(w.d)))
  if (weeks.size >= 4) gear.push('headband')
  const ready = readiness(P.results || [], P.beepTarget)
  if (ready.passed > 0) gear.push('whistle')
  const beep = latestResult(P.results || [], 'beep')
  if (beep && P.beepGoal && evaluate('beep', beep.v, P.beepGoal)?.pass) gear.push('bolt')
  // The PCT passed: the member said so (police.pctPassed), or every standard passes once the test day is behind them.
  const testGone = P.testDate && P.testDate < new Date().toISOString().slice(0, 10)
  if (P.pctPassed || (testGone && ready.passed === ready.rows.length)) gear.push('badge', 'stripes')
  if (P.academy) gear.push('cap', 'medal')
  return gear
}
