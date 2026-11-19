// The Plan's Week view (components/PlanDays.jsx): a week's seven days, and moving one day's session
// to another day of the week. A move swaps the two days through the per-date plan (S.dayPlan), the
// same overrides "Change this day" writes, so Home, Plan and Hayden all read the new week.
import { REST } from '../rotation.js'

const DAY = 86400000
const iso = ms => new Date(ms).toISOString().slice(0, 10)

/** The Monday of the week `d` (ISO day) is in, `offset` weeks on. */
export function mondayOf(d, offset = 0) {
  const t = Date.parse(d + 'T00:00:00Z')
  const dow = (new Date(t).getUTCDay() + 6) % 7
  return iso(t - dow * DAY + offset * 7 * DAY)
}

/** The seven ISO days from `monday`. */
export const weekDays = monday => Array.from({ length: 7 }, (_, i) => iso(Date.parse(monday + 'T00:00:00Z') + i * DAY))

/**
 * Moves `from`'s session to `to`, and `to`'s (or its rest) to `from`. `idsOf(iso)` gives a day's
 * planned routine ids as they stand. Mutates `s` (a useStore update). Returns the two days changed,
 * or [] when there is nothing to move.
 */
export function moveDay(s, from, to, idsOf) {
  if (!from || !to || from === to) return []
  const a = idsOf(from), b = idsOf(to)
  if (!a.length && !b.length) return []
  s.dayPlan = { ...(s.dayPlan || {}), [to]: a[0] || REST, [from]: b[0] || REST }
  return [from, to]
}

/** What Hayden says about a move before it is saved: what lands where. */
export function moveLine(fromName, toName, toDay, fromDay) {
  if (!toName || toName === 'Rest') return `${toDay} was rest, so ${fromDay} becomes rest.`
  return `${toName} moves to ${fromDay}, so nothing is lost.`
}

/** A day's kind as shown in a shared week: gym, run (walks too) or rest. */
export const shareKind = k => (k === 'gym' ? 'gym' : k === 'run' || k === 'walk' ? 'run' : 'rest')
