// Home's ready ring (components/ReadyRing.jsx): how ready for the PCT, from the latest result of
// each standard (readiness in lib/police/standards.js, untested ones counting as nothing), and the
// one thing to do next: test what is untested, then work on the weakest standard. Pure.
import { readiness, standardById, fmtBeep, parseBeep, DEFAULT_BEEP_TARGET } from './standards.js'

export const SHORT = { grip: 'Grip', bridge: 'Bridge', jump: 'Jump', pushups: 'Push-ups', illinois: 'Agility', beep: 'Beep' }

const unitOf = std => (std.unit === 'reps' || std.unit === 'level' ? '' : ' ' + std.unit)

/** The value a result shows: a grip result is its weaker hand, a beep result its level.shuttle. */
export function shownValue(id, v) {
  if (v == null) return ''
  if (id === 'grip') return String(Math.min(Number(v.left) || 0, Number(v.right) || 0))
  if (id === 'beep') return typeof v === 'object' ? fmtBeep(v) : fmtBeep(parseBeep(v)) || String(v)
  return String(v)
}

/** "Beep 6.4 → 7.1", "Agility 21.4 → 20 s": from where you are to the pass mark. */
export function workOnLine(std, latest, beepTarget = DEFAULT_BEEP_TARGET) {
  const goal = std.id === 'beep' ? String(beepTarget || DEFAULT_BEEP_TARGET) : `${std.min}${unitOf(std)}`
  return `${SHORT[std.id] || std.name} ${shownValue(std.id, latest.v)} → ${goal}`
}

/**
 * What the ring shows: { tested, pct, passed, total, untested, rows, next }. `rows` is one arc per
 * standard, in the order of STANDARDS: { id, tested, pass, pct } where pct is the way to its pass
 * mark (0-100). The ring is the six of them, not one average: an average reads 96% while the beep
 * test still fails, and the PCT is passed one standard at a time.
 * `next` is the chip beside it: { kind: 'test', text } while standards are untested, then
 * { kind: 'work', text } for the weakest one failing, or { kind: 'keep', text } once all pass.
 */
export function readyView(results, beepTarget = DEFAULT_BEEP_TARGET) {
  const r = readiness(results || [], beepTarget)
  const untested = r.rows.filter(x => !x.latest)
  const tested = untested.length < r.rows.length
  let next = null
  if (!tested) next = null
  else if (untested.length) next = { kind: 'test', text: untested.length === 1 ? `Test your ${SHORT[untested[0].std.id].toLowerCase()}` : `${untested.length} not tested yet` }
  else if (r.weakest) {
    const row = r.rows.find(x => x.std.id === r.weakest.id)
    next = { kind: 'work', text: 'Work on: ' + workOnLine(standardById(r.weakest.id), row.latest, beepTarget) }
  } else next = { kind: 'keep', text: 'All passing. Keep it there' }
  const rows = r.rows.map(x => ({ id: x.std.id, tested: !!x.latest, pass: !!x.ev?.pass, pct: x.ev ? x.ev.pct : 0 }))
  return { tested, pct: r.pct, passed: r.passed, total: r.total, untested: untested.length, rows, next }
}
