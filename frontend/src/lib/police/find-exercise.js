// The library's best match for an exercise as a trainer wrote it ("DB incline press", "OHP"),
// for an uploaded program (lib/police/program-text.js). The common gym short forms are spelt
// out first, then the library's own search ranks the candidates.
import { CATALOGUE, searchExercises } from '../exercises.js'
import { PLAN_EXERCISES } from './programme.js'

const SHORT = [[/\bdb\b/gi, 'dumbbell'], [/\bbb\b/gi, 'barbell'], [/\bkb\b/gi, 'kettlebell'], [/\bohp\b/gi, 'overhead press'],
  [/\brdl\b/gi, 'romanian deadlift'], [/^planks?$/i, 'front plank'], [/^(back )?squats?$/i, 'barbell full squat'], [/^lat pull ?downs?$/i, 'cable wide grip lat pulldown'], [/\bpull ?ups?\b/gi, 'pull-up'], [/\bpush ?ups?\b/gi, 'push-up'], [/\bchin ?ups?\b/gi, 'chin-up'],
  [/\bbiceps? curls?\b/gi, 'biceps curl'], [/\btriceps?\b/gi, 'triceps'], [/\blunges\b/gi, 'lunge'], [/\braises\b/gi, 'raise'], [/\bcurls\b/gi, 'curl']]

export function findExercise(name) {
  const q = SHORT.reduce((s, [re, w]) => s.replace(re, w), String(name || '')).trim()
  if (q.length < 3) return null
  const hits = searchExercises(CATALOGUE, q).slice(0, 12)
  if (!hits.length) return null
  // Of the close ones, the plainest: every word that was written, and as few others as possible
  // ("plank" is the plank, not the jack plank; "overhead press" is not the seated one).
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 1)
  const stem = w => w.replace(/s$/, '')
  const score = e => {
    const n = String(e.n || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    const all = words.every(w => n.some(x => stem(x) === stem(w) || x.startsWith(stem(w))))
    return (all ? 0 : 100) + (PLAN_EXERCISES.has(e.id) ? -3 : 0) + (n.length - words.length) + (/\b(alternate|single|one arm|kneeling|seated|jack)\b/.test(e.n) ? 2 : 0) + (!/band/i.test(q) && /\bband\b/.test(e.n) ? 3 : 0) + (/\bdonkey\b/.test(e.n) ? 2 : 0)
  }
  return hits.map((e, i) => ({ e, s: score(e) + i * 0.01 })).sort((a, b) => a.s - b.s)[0].e.id
}
