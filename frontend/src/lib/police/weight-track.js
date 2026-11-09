// Weight to the test (BadgeFit): a straight line from the start weight on the plan's first day
// to the goal weight on test day, and where today's weight sits against it. Pure.

const days = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000)

/**
 * { expected (today's point on the line), now, diff (now − expected), onTrack, perWeek (kg a
 * week the line asks for), tooFast } or null when something is missing. On track = within
 * 0.5 kg of the line, or ahead of it.
 */
export function weightTrack({ startKg, goalKg, startISO, testISO, nowKg, todayISO }) {
  if (!(startKg > 0) || !(goalKg > 0) || !(nowKg > 0) || !startISO || !testISO || !todayISO) return null
  const total = days(startISO, testISO)
  if (!(total > 0)) return null
  const t = Math.max(0, Math.min(1, days(startISO, todayISO) / total))
  const expected = Math.round((startKg + (goalKg - startKg) * t) * 10) / 10
  const diff = Math.round((nowKg - expected) * 10) / 10
  const losing = goalKg < startKg
  const perWeek = Math.round((Math.abs(startKg - goalKg) / total) * 7 * 10) / 10
  return { expected, now: nowKg, diff, onTrack: losing ? diff <= 0.5 : diff >= -0.5, perWeek, tooFast: losing && perWeek > startKg * 0.01 }
}
