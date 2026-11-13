// What Hayden says when you open him (BadgeFit Home): a personal coach's first words, not a menu.
// Built from the trainer brief (brief.js), so it is about this person today: how long to the
// test, what today is, where the gap is. A handful of ways to say each part, picked by `seed`,
// so he does not open with the same sentence every day. Pure.

const pick = (list, seed) => list[Math.abs(seed | 0) % list.length]

const hello = (hour, name) => {
  const part = hour < 5 ? 'Up late' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  return name ? `${part}, ${name}.` : `${part}.`
}

/** Hayden's opening line. `brief` is policeBrief(); `hour` 0-23; `seed` any integer (the day). */
export function openingLine(brief, { name = '', hour = 9, seed = 0, done = false } = {}) {
  const b = brief || {}
  const out = [hello(hour, String(name || '').trim().split(/\s+/)[0] || '')]
  const d = b.daysToTest
  if (b.afterTest) {
    out.push(pick([
      'The test is behind you. Now we build for the academy: harder sessions, same discipline.',
      'You got through test day. The academy asks for more, so we keep going.',
    ], seed))
  } else if (d === 0) out.push('Test day. You have done the work. Warm up well, stay calm, and go and get it.')
  else if (d != null && d <= 7) out.push(pick([
    `${d} ${d === 1 ? 'day' : 'days'} to go. This week is about staying sharp and arriving fresh.`,
    `${d} ${d === 1 ? 'day' : 'days'} left. Nothing heroic now: clean sessions, good sleep.`,
  ], seed))
  else if (d != null) out.push(pick([
    `${d} days to your test. Every session from here counts, and I am with you for all of them.`,
    `${d} days out. I want you walking in there knowing you have already done harder.`,
    `${d} days to go. We do today properly, then tomorrow. That is how you pass.`,
  ], seed))
  else out.push(pick([
    'No test date booked yet, so we build the base. Book it when you are ready and I will count it down.',
    'We are building. Give me consistent weeks and the test takes care of itself.',
  ], seed))

  const t = b.today
  if (done) out.push(pick(['Today is done. Good. Eat, sleep, and come back tomorrow.', 'You trained today. That is one more in the bank.'], seed + 1))
  else if (t && t.kind !== 'rest') {
    const what = b.todayRun ? `${b.todayRun.name}, about ${b.todayRun.minutes} minutes` : `${t.title}${t.minutes ? `, about ${t.minutes} minutes` : ''}`
    out.push(pick([`Today is ${what}.`, `On the plan today: ${what}.`], seed + 2))
  } else out.push('Today is a rest day. Recovery is training too.')

  const gap = (b.gaps || []).find(g => !g.pass)
  if (gap && !b.afterTest) out.push(`The one I want us to fix is ${String(gap.standard).toLowerCase()}.`)
  out.push(pick(['What do you need?', 'Ask me anything about your training.', 'What are we working on?'], seed + 3))
  return out.join(' ')
}
