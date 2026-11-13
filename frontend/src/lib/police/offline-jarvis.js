// Hayden without the AI (BadgeFit): when the coach cannot answer (the day's allowance used, the
// AI service down, no signal), he still answers from what the app knows: the trainer brief
// (brief.js policeBrief). Plain rules over the question's words, never a made-up number. Pure.

const has = (q, re) => re.test(q)

function dayWords(d, run) {
  if (!d) return ''
  if (d.kind === 'rest') return 'Rest day. Walk, stretch, eat well and get 8 hours of sleep.'
  const parts = [`${d.title}${d.minutes ? `, about ${d.minutes} minutes` : ''}.`]
  if (run) parts.push(`The run is ${run.name}, about ${run.minutes} minutes.`)
  if (d.details?.[0]) parts.push(d.details[0] + '.')
  return parts.join(' ')
}

/** Hayden's answer from the brief, or a short honest line when there is nothing to go on. */
export function answerOffline(question, brief) {
  const q = ` ${String(question || '').toLowerCase()} `
  const b = brief || {}
  const name = 'your test'
  const gap = (b.gaps || []).find(g => !g.pass)
  const days = b.daysToTest != null ? `${b.daysToTest} ${b.daysToTest === 1 ? 'day' : 'days'} to ${name}.` : ''

  if (has(q, /\b(pain|hurt|sore|injur|knee|shin|back|shoulder|ankle|hamstring|calf|strain|tweak)/)) {
    return 'Sharp pain, swelling or pain that gets worse: stop that exercise today. Dull soreness: lighter weight, full range, and keep moving. The Care tab under More has what to do for shins, knees and the rest. If it is still there in a few days, see a physio.'
  }
  if (has(q, /\b(tomorrow)\b/)) return b.tomorrow ? `Tomorrow: ${dayWords(b.tomorrow)}` : 'Tomorrow is a rest day. Recover well.'
  if (has(q, /\b(protein|eat|food|diet|meal|calorie|carb|hungry)/)) {
    const f = b.foodToday || {}
    const meal = f.proteinTarget ? Math.round(f.proteinTarget / 4 / 5) * 5 : null
    const foods = 'Good protein: eggs, chicken, lean beef, tuna, Greek yoghurt. Carbs around training: oats or rice before, rice, potatoes or fruit after. Water with every meal.'
    if (f.proteinTarget) return `About ${f.proteinTarget} grams of protein a day${f.kcalTarget ? ` and ${f.kcalTarget} calories` : ''}: roughly ${meal} grams at each of four meals. ${foods}`
    return `Protein at every meal, about 2 grams per kilo of body weight a day. ${foods} Add your weight in the Food tab and I will give you exact numbers.`
  }
  if (has(q, /\b(weigh|weight loss|fat|kilos? down|lose)\b/) && b.weight) {
    const w = b.weight
    return `You are ${w.now} ${w.unit}, ${w.change > 0 ? 'up' : 'down'} ${Math.abs(w.change)} since the start. About half a kilo to a kilo a week is the rate that keeps your strength.`
  }
  if (has(q, /\b(rep range|range|go up|heavier|lighter|progress|next set|weight should)/)) {
    return 'The rep range rule: hit the top of the range and the next set goes up, 2.5 kilos. Inside the range, stay and chase the top. Under it, drop the weight. Say the weight and reps after each set and I set the next one for you.'
  }
  if (has(q, /\b(weak|improve|focus|work on|gap|behind|worst)\b/)) {
    if (gap) return `Your biggest gap is ${gap.standard}: ${gap.latest}, ${gap.pct} percent of the mark. Train ${gap.area.toLowerCase()}: ${gap.train}. ${days}`.trim()
    return (b.gaps || []).length ? `You are passing every standard you have tested. Keep the margin, and test the rest on Test day. ${days}`.trim() : 'Run a Test day first, from the PCT tab, so I know where your gaps are.'
  }
  if (has(q, /\b(pct|test|ready|days left|how long|countdown|pass)\b/)) {
    const passed = (b.gaps || []).filter(g => g.pass).length
    return `${days} You are passing ${passed} of ${(b.gaps || []).length || 6} standards.${gap ? ` The one to fix is ${gap.standard}.` : ''}`.trim()
  }
  if (has(q, /\b(today|now|should i do|workout|session|train|what do i do|plan)\b/)) {
    return b.today ? `Today: ${dayWords(b.today, b.todayRun)} ${days}`.trim() : `Nothing planned today. A 30 minute easy run or a walk keeps the engine ticking. ${days}`.trim()
  }
  if (has(q, /\b(motivat|tired|can't|cannot|give up|hard|struggl|lazy)\b/)) {
    return 'Tired is normal this close to a test. Do the warm-up, then decide. Nine times out of ten you will finish the session, and that is what gets you the badge.'
  }
  return b.today ? `I cannot get to my full brain right now, so here is the plan. Today: ${dayWords(b.today, b.todayRun)} ${days}`.trim() : `I cannot get to my full brain right now. Ask me again in a bit. ${days}`.trim()
}
