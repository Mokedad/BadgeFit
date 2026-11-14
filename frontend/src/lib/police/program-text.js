// "Upload my own program" (Hayden): a programme written as text (a trainer's notes, a document,
// a spreadsheet saved as CSV) read into routines. Pure; the exercise matching is passed in
// (`find(name)` → exercise id or null), so this file never needs the catalogue.
//
//   Day 1 - Push            ← a day: "Day 1", "Monday", "Upper", a "# heading", "Legs:"
//   Bench press 4x8         ← an exercise: a name and its sets and reps
//   Incline DB press 3 x 10-12 @ 20kg
//   Plank 3 x 45s           ← a timed set
//   Squat, 5, 5, 100        ← CSV: name, sets, reps, weight
//
// A second "Week 2" stops the reading: week 1 is the plan, and the app moves it on from there.

const DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
const DAY_RE = /^(?:(?:week\s*\d+\s*[,-:]?\s*)?day\s*\d+\b|(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\b|session\s*\d+\b|workout\s*[a-z0-9]\b)/i
const WEEK_RE = /^week\s*(\d+)\s*$/i
// 4x8, 4 x 8-12, 3×10, 3 sets of 10, 3 sets x 10 reps, 4 sets 6 reps, 3 x 45s, 3 x 1 min
const SCHEME = /(\d{1,2})\s*(?:x|×|\*|sets?\s*(?:of|x|×)?)\s*(\d{1,3})(?:\s*(?:-|–|to)\s*(\d{1,3}))?\s*(reps?|r\b|s\b|secs?|seconds?|min(?:s|utes?)?)?/i
const WEIGHT = /@?\s*(\d{1,3}(?:\.\d+)?)\s*(kg|kgs|lb|lbs)\b/i

const clean = s => String(s || '').replace(/^\s*(?:[-•*▪●◦]|\d{1,2}[.)])\s+/, '').replace(/\s+/g, ' ').trim()
const tidyName = s => s.replace(/[@:|,–-]+\s*$/, '').replace(/^[@:|,–-]+\s*/, '').replace(/\(\s*\)/g, '').trim()

/** One line read as an exercise: { name, sets, reps, repsMin?, sec?, weight? } or null. */
export function exerciseLine(raw) {
  const line = clean(raw)
  if (!line) return null
  // CSV / tab: a name, then numbers (sets, reps, weight).
  const cells = line.split(/\s*[,\t;]\s*/)
  if (cells.length >= 3 && !/\d/.test(cells[0]) && cells.slice(1, 3).every(c => /^\d{1,3}(?:-\d{1,3})?$/.test(c))) {
    const [lo, hi] = cells[2].split('-').map(Number)
    const w = Number(cells[3])
    return { name: tidyName(cells[0]), sets: Number(cells[1]), reps: hi || lo, ...(hi ? { repsMin: lo } : {}), ...(w > 0 ? { weight: w } : {}) }
  }
  const m = SCHEME.exec(line)
  if (!m) return null
  const sets = Number(m[1]), a = Number(m[2]), b = m[3] ? Number(m[3]) : null, unit = (m[4] || '').toLowerCase()
  if (!(sets >= 1 && sets <= 20) || !(a >= 1)) return null
  const wm = WEIGHT.exec(line.slice(m.index + m[0].length)) || WEIGHT.exec(line)
  const name = tidyName((line.slice(0, m.index) + ' ' + line.slice(m.index + m[0].length)).replace(WEIGHT, '').replace(/\b(reps?|sets?)\b/gi, ''))
  if (!name || name.length < 3) return null
  const timed = /^(s|secs?|seconds?)$/.test(unit) || /^min/.test(unit)
  if (timed) return { name, sets, sec: /^min/.test(unit) ? a * 60 : a }
  return { name, sets, reps: b || a, ...(b ? { repsMin: a } : {}), ...(wm ? { weight: Number(wm[1]) } : {}) }
}

/** A line that names a day: { name, weekday (0-6) | null } or null. */
export function dayLine(raw) {
  const line = clean(raw).replace(/^#+\s*/, '')
  if (!line || line.length > 48 || SCHEME.test(line)) return null
  const heading = /^#/.test(String(raw).trim()) || /:\s*$/.test(line) || DAY_RE.test(line) || (line === line.toUpperCase() && /[A-Z]{3}/.test(line))
  if (!heading) return null
  const name = line.replace(/:\s*$/, '').trim()
  const wd = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i.exec(name)
  return { name, weekday: wd ? DAYS[wd[1].toLowerCase()] : null }
}

/**
 * A whole programme: { name, routines: [{ id, name, ex }], week, unknown: [names], read }.
 * `find(name)` gives an exercise id or null; an exercise it cannot place is left out and listed.
 */
export function parseProgramText(text, find, { title = '' } = {}) {
  const lines = String(text || '').replace(/\r/g, '').split('\n')
  const routines = [], unknown = [], week = {}
  let cur = null, weeksSeen = 0, read = 0
  const begin = (name, weekday) => {
    cur = { id: 'up' + (routines.length + 1), name: name || `Day ${routines.length + 1}`, ex: [] }
    routines.push(cur)
    if (weekday != null && week[weekday] == null) week[weekday] = [cur.id]
  }
  for (const raw of lines) {
    if (!raw.trim()) continue
    const wk = WEEK_RE.exec(clean(raw).replace(/^#+\s*/, ''))
    if (wk) { weeksSeen++; if ((weeksSeen > 1 || Number(wk[1]) > 1) && routines.some(r => r.ex.length)) break; continue }
    const ex = exerciseLine(raw)
    if (ex) {
      read++
      const id = find(ex.name)
      if (!id) { if (!unknown.includes(ex.name)) unknown.push(ex.name); continue }
      if (!cur) begin('', null)
      cur.ex.push(ex.sec
        ? { id, mode: 'time', sets: ex.sets, sec: ex.sec, prog: 'time', weight: 0 }
        : { id, sets: ex.sets, reps: ex.reps, ...(ex.repsMin ? { repsMin: ex.repsMin } : {}), prog: ex.repsMin ? 'double' : 'linear', weight: ex.weight || 0 })
      continue
    }
    const day = dayLine(raw)
    if (day) begin(day.name, day.weekday)
  }
  const kept = routines.filter(r => r.ex.length)
  const ids = new Set(kept.map(r => r.id))
  for (const d of Object.keys(week)) if (!ids.has(week[d][0])) delete week[d]
  return { name: title, routines: kept, week, unknown, read }
}

/** The programme as a plan file the app already imports (lib/plan-share.js parsePlan). */
export const asPlanFile = (p, unit = 'kg') => ({ opengym_plan: 1, name: p.name || 'My program', unit, week: p.week, routines: p.routines.map(r => ({ ...r, emoji: 'figureStrength' })), customEx: [] })

// Training days spread over the week for a programme that names none ("Day 1", "Day 2"...).
const SPREAD = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 0] }
/** The week to use: the file's own weekdays, else its days in order, spread out. */
export function weekFor(p) {
  if (Object.keys(p.week || {}).length) return p.week
  const days = SPREAD[Math.min(7, p.routines.length)] || []
  return Object.fromEntries(days.map((d, i) => [d, [p.routines[i].id]]))
}
