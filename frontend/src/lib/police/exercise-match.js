// "Machine's taken, switch to dumbbell incline bench" (BadgeFit voice): the exercise in the
// library that best fits the words, the muscle being trained and your history. Pure: the
// library comes in as a list of { id, n (name), eq, tg (target muscle), bp (body part) }.

const SYN = [[/\bdbs?\b|\bdumbbells\b/g, 'dumbbell'], [/\bbb\b|\bbarbells\b/g, 'barbell'], [/\bcables\b/g, 'cable'], [/\bkb\b|\bkettlebells\b/g, 'kettlebell'],
  [/\bsmith machine\b/g, 'smith'], [/\bpull ?downs?\b/g, 'pulldown'], [/\bpush ?ups?\b/g, 'push up'], [/\bpull ?ups?\b/g, 'pull up'], [/\bchin ?ups?\b/g, 'chin up'],
  [/\bflyes?\b|\bflies\b/g, 'fly'], [/\brows\b/g, 'row'], [/\bpresses\b/g, 'press'], [/\bcurls\b/g, 'curl'], [/\bsquats\b/g, 'squat'], [/\blunges\b/g, 'lunge']]
const FILLER = new Set(['a', 'an', 'the', 'to', 'some', 'please', 'one', 'it', 'on', 'with', 'machine', 'instead', 'do', 'lets', 'let\'s', 'exercise', 'version'])

export function normWords(text) {
  let s = String(text || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
  for (const [re, to] of SYN) s = s.replace(re, to)
  return s.split(/\s+/).filter(w => w && !FILLER.has(w))
}

const EQUIP = ['dumbbell', 'barbell', 'cable', 'kettlebell', 'smith', 'band', 'lever', 'sled', 'ez']

/**
 * The best match: { id, n } or null. `current` is the exercise being replaced (its muscle is
 * preferred, and it is never the answer); `done` is a Set of exercise ids in your history.
 */
export function matchExercise(query, list, { current = null, done = new Set() } = {}) {
  const words = normWords(query)
  if (!words.length) return null
  const wantEq = words.filter(w => EQUIP.includes(w))
  let best = null
  for (const ex of list || []) {
    if (!ex?.n || ex.id === current?.id) continue
    const name = ` ${normWords(ex.n).join(' ')} `
    if (wantEq.some(e => !name.includes(` ${e} `) && !String(ex.eq || '').includes(e))) continue
    let hit = 0
    for (const w of words) if (name.includes(` ${w} `) || name.includes(` ${w}`)) hit++
    if (!hit) continue
    let score = hit * 4 - (words.length - hit) * 3
    if (current?.tg && ex.tg === current.tg) score += 3
    else if (current?.bp && ex.bp === current.bp) score += 1
    if (done.has(ex.id)) score += 2
    score -= name.trim().split(' ').length * 0.3
    if (!best || score > best.score) best = { id: ex.id, n: ex.n, score }
  }
  return best && best.score > 0 ? { id: best.id, n: best.n } : null
}
