// The PCT page's progress lines: every attempt at a standard as a small line with the pass mark
// drawn on it, and what is left to pass in plain words ("6 more push-ups to pass"). Pure.
import { standardById, scoreOf, evaluate, DEFAULT_BEEP_TARGET } from './standards.js'

const UNIT = { grip: ['kg', 'kg'], bridge: ['second', 'seconds'], jump: ['cm', 'cm'], pushups: ['push-up', 'push-ups'], illinois: ['second', 'seconds'], beep: ['shuttle', 'shuttles'] }

/** "6 more push-ups to pass", "1.4 seconds faster to pass", or '' once passing or untested. */
export function gapText(id, value, beepTarget = DEFAULT_BEEP_TARGET) {
  const std = standardById(id), ev = evaluate(id, value, beepTarget)
  if (!std || !ev || ev.pass) return ''
  const gap = Math.round(Math.abs(ev.target - ev.score) * 10) / 10
  const [one, many] = UNIT[id] || ['', '']
  const unit = gap === 1 ? one : many
  return std.better === 'lower' ? `${gap} ${unit} faster to pass` : `${gap} more ${unit} to pass`
}

/**
 * The line for one standard: its attempts oldest first as points in a w × h box, and where the
 * pass mark sits. { path, dots: [{ x, y, pass }], passY } or null with fewer than two attempts.
 * Up is always better (a timed course is flipped), so a rising line is progress.
 */
export function trendLine(results, id, beepTarget = DEFAULT_BEEP_TARGET, w = 300, h = 60) {
  const std = standardById(id)
  const rows = (results || []).filter(r => r.id === id).map(r => ({ at: r.at, ev: evaluate(id, r.v, beepTarget), s: scoreOf(id, r.v) })).filter(r => r.ev)
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
  if (!std || rows.length < 2) return null
  const target = rows[0].ev.target
  const all = [...rows.map(r => r.s), target]
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1
  const pad = 8
  const yOf = v => { const t = (v - lo) / span; const up = std.better === 'lower' ? 1 - t : t; return Math.round((h - pad - up * (h - 2 * pad)) * 10) / 10 }
  const xOf = i => Math.round((pad + (i * (w - 2 * pad)) / (rows.length - 1)) * 10) / 10
  const dots = rows.map((r, i) => ({ x: xOf(i), y: yOf(r.s), pass: r.ev.pass }))
  return { path: dots.map((d, i) => `${i ? 'L' : 'M'}${d.x} ${d.y}`).join(' '), dots, passY: yOf(target) }
}
