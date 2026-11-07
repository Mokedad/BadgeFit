// Police Prep: "Jarvis", the voice that talks the user through the day.
//
// Deterministic text built from the user's own data (today's session, their standards, the
// set they just logged), so it works offline and on every device, and the view can read it out
// with the browser's speech synthesis. Tone: a motivational trainer who believes in you, and who
// ties every rep to the life you are building. `pick` takes a seed so a test can pin a line.

const LINES = {
  open: [
    'Every rep you press into that bar is you pressing into the life you want. Let us go.',
    'The badge is not handed out. It is earned one session at a time, and today is one of them.',
    'Nobody is coming to do this for you. That is the good news: it is all in your hands.',
    'Discipline is doing it when nobody is watching. I am watching, and so is the person you are becoming.',
    'You are not training for a test. You are training to be the officer someone will be glad showed up.',
    'Pressure makes diamonds. Push into the weight, and push into your future.',
  ],
  gym: [
    'Own every set. Controlled down, explosive up.',
    'Heavy is relative. Effort is not. Give me everything in the range.',
    'When the bar gets heavy, that is the moment that counts. That is where you change.',
  ],
  run: [
    'Your lungs will complain. Let them. Your legs will want to stop. Do not let them decide.',
    'Every interval is a level on the beep test you are banking right now.',
    'Run like the radio just called you.',
  ],
  rest: [
    'Recovery is training too. Sleep, eat well, come back stronger tomorrow.',
    'Rest today so you can hit harder tomorrow. Champions recover on purpose.',
  ],
  close: [
    'Finish strong. Then log it, so next week you beat it.',
    'Show up today and the test takes care of itself.',
    'One more rep is one step closer to that badge.',
  ],
}

export const pick = (list, seed = Date.now()) => list[Math.abs(Math.floor(seed)) % list.length]

const greeting = hour => (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening')

/**
 * The day's briefing as a list of sentences.
 * `day` is one entry of weekPlan().days; `ready` is readiness() from standards.js.
 */
export function briefing({ name, hour = 9, week, day, ready, seed = Date.now() } = {}) {
  const who = name ? `, ${name}` : ''
  const out = [`${greeting(hour)}${who}.`]
  out.push(pick(LINES.open, seed))
  if (week && day) {
    out.push(`This is week ${week}. Today is ${day.title}.`)
    if (day.details?.[0]) out.push(day.details[0] + '.')
    const kind = day.kind === 'gym' ? 'gym' : day.kind === 'run' || day.kind === 'test' ? 'run' : 'rest'
    out.push(pick(LINES[kind], seed + 1))
  }
  if (ready) {
    if (ready.passed === ready.total) out.push(`You are passing all ${ready.total} standards. Now we build a margin, so test day is easy.`)
    else if (ready.weakest) out.push(`You are passing ${ready.passed} of ${ready.total} standards. Your biggest gap is ${ready.weakest.name.toLowerCase()}, so that is where we win this week.`)
  }
  out.push(pick(LINES.close, seed + 2))
  return out.map(s => s.replace(/\.\.$/, '.'))
}

/** What Jarvis says after a set, from nextSetAdvice() (set-advice.js). */
export function setLine(advice, unit = 'kg', seed = Date.now()) {
  if (!advice) return ''
  const w = `${advice.weight} ${unit}`
  if (advice.action === 'up') return pick([
    `Top of the range. That weight is yours now. Next set: ${w}.`,
    `Too easy for you. Load it up: ${w} next set.`,
    `You outgrew that weight. ${w}, let us see it.`,
  ], seed)
  if (advice.action === 'down') return pick([
    `Under the range. No shame, that is data. Drop to ${w} and own every rep.`,
    `Strip it back to ${w}. Perfect reps build the strength; ego reps build injuries.`,
  ], seed)
  return pick([
    `In the range. Stay at ${w} and chase the top next set.`,
    `Right where we want you. Same weight, one more rep.`,
  ], seed)
}

/** What Jarvis says about a newly logged standard result, from evaluate() (standards.js). */
export function resultLine(std, ev) {
  if (!std || !ev) return ''
  if (ev.pass) return `${std.name}: passed. That is one box ticked. Keep it, then beat it.`
  return `${std.name}: ${ev.pct}% of the way there. Every session closes the gap. We go again.`
}
