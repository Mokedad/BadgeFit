// The beep test, run on the phone (BadgeFit, components/BeepTrainer.jsx). Pure timing from the
// same level table the app scores with (standards.js BEEP_LEVELS): when each shuttle's beep
// falls, where a runner is at a given moment, and the score when they stop.
import { BEEP_LEVELS, parseBeep, fmtBeep } from './standards.js'

/**
 * Every beep from the start: [{ t (s), level, shuttle, newLevel }]. Shuttle `n` of a level is
 * done when its beep sounds; `newLevel` marks the beep that ends a level (the triple beep).
 */
export function beepSchedule(levels = BEEP_LEVELS) {
  const out = []
  let t = 0
  for (const row of levels) {
    for (let s = 1; s <= row.shuttles; s++) {
      t = Math.round((t + row.secPerShuttle) * 1000) / 1000
      out.push({ t, level: row.level, shuttle: s, newLevel: s === row.shuttles })
    }
  }
  return out
}

/**
 * Where the runner is `elapsed` seconds in: { done (beeps passed), level, shuttle (the one being
 * run now), shuttleLeft (s to its beep), shuttleTotal (its length), finished }.
 */
export function positionAt(schedule, elapsed) {
  let i = 0
  while (i < schedule.length && schedule[i].t <= elapsed) i++
  if (i >= schedule.length) return { done: schedule.length, finished: true }
  const cur = schedule[i], prevT = i ? schedule[i - 1].t : 0
  return { done: i, level: cur.level, shuttle: cur.shuttle, shuttleLeft: cur.t - elapsed, shuttleTotal: cur.t - prevT, finished: false }
}

/** The score on stopping: the last shuttle completed, as level.shuttle ('' before the first). */
export function scoreAt(schedule, elapsed) {
  const done = positionAt(schedule, elapsed).done
  const last = schedule[done - 1]
  return last ? fmtBeep({ level: last.level, shuttle: last.shuttle }) : ''
}

/** Seconds from the start until `level.shuttle` is completed, or null. */
export function timeTo(schedule, text) {
  const b = parseBeep(text)
  const hit = b && schedule.find(x => x.level === b.level && x.shuttle === b.shuttle)
  return hit ? hit.t : null
}
