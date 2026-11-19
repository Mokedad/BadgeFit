// The Plan's Week view (components/PlanDays.jsx) and Share my week (components/ShareWeek.jsx):
// a week's seven days, and a day's kind as shared.

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

/** A day's kind as shown in a shared week: gym, run (walks too) or rest. */
export const shareKind = k => (k === 'gym' ? 'gym' : k === 'run' || k === 'walk' ? 'run' : 'rest')
