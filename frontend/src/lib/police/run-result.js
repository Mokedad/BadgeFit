// The end of a guided run (BadgeFit, components/RunPlayer.jsx): finished or stopped early, it
// counts. What was run (minutes, how much of the plan), the week with it, and the congratulations
// Hayden says. Pure: `runLog` is the log before this run.
import { runMinutes } from './runs.js'

const pick = (list, seed) => list[Math.abs(Math.floor(seed)) % list.length]

export function runResult({ run, ranSec, completed, runLog = [], today, seed = Date.now() }) {
  const min = Math.max(1, Math.round(ranSec / 60))
  const planned = runMinutes(run)
  const pct = completed ? 100 : Math.max(1, Math.min(99, Math.round((ranSec / 60 / planned) * 100)))
  const weekAgo = new Date(Date.parse(today + 'T12:00:00Z') - 6 * 86400000).toISOString().slice(0, 10)
  const week = runLog.filter(r => r && r.at >= weekAgo && r.at <= today)
  const weekRuns = week.length + 1
  const weekMin = week.reduce((a, r) => a + (r.min || 0), 0) + min
  const headline = completed ? pick(['Run done! 🥳', 'Smashed it! 🥳', 'That is a wrap! 🥳'], seed) : pick(['Great effort! 🥳', 'Every minute counts! 🥳', 'Proud of that! 🥳'], seed)
  const what = completed ? `${run.name}, all ${min} minutes.` : `${min} of ${planned} minutes of ${run.name}, ${pct} percent.`
  const why = completed
    ? pick(['That is another level banked for test day.', 'That is exactly how the beep test moves.', 'Consistency like this is what gets the badge.'], seed + 1)
    : pick(['Stopping early still counts. It is saved, and next time you go further.', 'Not every day is a full one. You showed up, and that is saved.', 'Partial runs build the engine too. Well done for getting out there.'], seed + 1)
  const weekLine = weekRuns > 1 ? `That is run number ${weekRuns} this week, ${weekMin} minutes in all.` : 'Your first run this week. Great start.'
  return { min, pct, completed, planned, weekRuns, weekMin, headline, line: `${headline.replace(' 🥳', '')} ${what} ${why} ${weekLine}` }
}
