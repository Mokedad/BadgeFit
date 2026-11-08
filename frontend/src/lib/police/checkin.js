// The morning check-in (BadgeFit): three taps, sleep, soreness and energy, each 1 (bad) to 3
// (good). Jarvis reads them as go, easy or light, and adjusts the day's session: hard training
// while wrecked and cutting weight is how recruits get hurt in the last weeks. Pure.

export const CHECKIN_QUESTIONS = [
  { key: 'sleep', label: 'Sleep', opts: [['😫', 'Bad'], ['😐', 'OK'], ['😴', 'Great']] },
  { key: 'sore', label: 'Body', opts: [['🔥', 'Very sore'], ['😐', 'A bit sore'], ['💪', 'Fresh']] },
  { key: 'energy', label: 'Energy', opts: [['🪫', 'Low'], ['😐', 'OK'], ['⚡', 'High']] },
]

const ok = v => v === 1 || v === 2 || v === 3
export const isCheckin = c => !!c && ok(c.sleep) && ok(c.sore) && ok(c.energy)

/** go | easy | light from a check-in: very sore is never "go", and three lows is light. */
export function checkinCall(c) {
  if (!isCheckin(c)) return null
  const total = c.sleep + c.sore + c.energy
  if (total <= 4) return 'light'
  if (total <= 6 || c.sore === 1) return 'easy'
  return 'go'
}

export const CALL_WORD = { go: 'Go', easy: 'Easy day', light: 'Light day' }

/** What the call means for a day of the plan (weekPlan().days entry): a short note, or ''. */
export function adjustNote(day, call) {
  if (!day || !call) return ''
  if (day.kind === 'test') return call === 'go' ? '' : 'Test day: take a long warm-up and trust your training.'
  if (call === 'go') return day.kind === 'rest' ? '' : 'Feeling good: full session as planned. Go get it.'
  if (day.kind === 'gym') return call === 'easy'
    ? 'Easy day: same session, about half the sets, stop 2 reps short of failure.'
    : 'Light day: mobility and 2 easy sets of each lift, nothing heavy. Or rest, and do it tomorrow.'
  if (day.kind === 'run') return call === 'easy'
    ? 'Easy day: swap the hard run for 25 minutes at conversation pace.'
    : 'Light day: a 20 minute walk or very easy jog, then stretch.'
  return ''
}

/** What Jarvis says after the check-in. */
export function checkinLine(c, day) {
  const call = checkinCall(c)
  if (!call) return ''
  const head = call === 'go' ? 'Good to hear. You are firing today.' : call === 'easy' ? 'Thanks for being honest. We go easier today, and that is smart training.' : 'Rough morning. Today we look after you, so the next sessions count.'
  const note = adjustNote(day, call)
  return note ? `${head} ${note}` : head
}

/** The check-ins kept: the last 21 days, newest kept when the same day is answered again. */
export function addCheckin(all, iso, c) {
  const next = { ...(all || {}), [iso]: { sleep: c.sleep, sore: c.sore, energy: c.energy } }
  return Object.fromEntries(Object.entries(next).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 21))
}
