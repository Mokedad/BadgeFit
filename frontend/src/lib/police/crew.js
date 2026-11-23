// Your crew (BadgeFit, api/crew.js): the people testing on your date, a day either side. What the
// app sends about you (crewCard) and the one line Home says about them (crewLine). The card is
// the same kind of thing the bots share (bot-card.js): first name, colour, ready %, plus the test
// date and the last day trained. Nothing else of yours.
import { myColour } from './bot-look.js'
import { readiness } from './standards.js'
import { isoOf } from '../format.js'

/** The last day a session or a run was logged, as YYYY-MM-DD, and what it was. */
export function lastTrained(S) {
  const w = (S?.workouts || []).filter(x => x?.d).sort((a, b) => a.d.localeCompare(b.d)).at(-1)
  const r = (S?.police?.runLog || []).filter(x => x?.at).sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1)
  const wd = w?.d || '', rd = String(r?.at || '').slice(0, 10)
  if (!wd && !rd) return null
  return wd >= rd ? { last: wd, title: w.name || 'Training' } : { last: rd, title: r.run?.name || r.name || 'Run' }
}

/** What the crew sees of you. null when you have no test date (then there is no crew to be in). */
export function crewCard(S, user, now = new Date()) {
  const P = S?.police || {}
  if (!P.testDate) return null
  const lt = lastTrained(S)
  return {
    test: P.testDate,
    name: String(user?.name || 'Recruit').trim().split(/\s+/)[0],
    colour: myColour(P, user?.id),
    ready: readiness(P.results || [], P.beepTarget).pct || 0,
    last: lt?.last || null,
    title: lt?.title || '',
    tz: -now.getTimezoneOffset(),
  }
}

const names = list => list.map(c => c.name)
const join = n => (n.length <= 1 ? n[0] || '' : n.length === 2 ? `${n[0]} and ${n[1]}` : `${n[0]}, ${n[1]} and ${n.length - 2} more`)

/** "Jess and Moke trained today", "Nobody has trained yet today", "" with no crew. */
export function crewLine(crew) {
  if (!crew?.length) return ''
  const today = crew.filter(c => c.today)
  if (!today.length) return crew.length === 1 ? `${crew[0].name} is testing with you` : 'Nobody has trained yet today'
  return `${join(names(today))} trained today`
}

/** "6 Dec", for the strip and the sheet. */
export function crewDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/** "6 December", for the crew sheet's title. */
export function crewDateLong(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })
}

/** When a crewmate last trained, said the short way: "Yesterday", "2 days ago", "Last 21 Nov". */
export function crewAgo(last, today) {
  if (!last || !today) return 'Not started yet'
  const n = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(last + 'T12:00:00Z')) / 86400000)
  if (n <= 0) return 'Today'
  if (n === 1) return 'Yesterday'
  if (n < 7) return `${n} days ago`
  return `Last ${crewDate(last)}`
}

/** The letter in a crewmate's circle. */
export const initialOf = name => (String(name || '').trim()[0] || '?').toUpperCase()

/** Whether a finished session on `today` was already told to the crew (once a day, kept locally). */
export const DONE_KEY = 'bf_crew_done'
export function doneToldToday(today = isoOf(new Date())) {
  try { return localStorage.getItem(DONE_KEY) === today } catch { return true }
}
export function markDoneTold(today = isoOf(new Date())) {
  try { localStorage.setItem(DONE_KEY, today) } catch { /* private mode */ }
}
