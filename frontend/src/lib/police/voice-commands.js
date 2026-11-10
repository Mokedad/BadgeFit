// What you can say to Hayden mid-workout instead of tapping (BadgeFit). Pure: the words in, one
// command out, or null for a real question that goes to the AI coach. Speech recognition hands
// over digits mostly ("15 reps at 20 kilos"), sometimes words ("fifteen"): both are read.
//   { type: 'set', reps?, weight? }   log the next set ("done" alone keeps what is pre-filled)
//   { type: 'same' }                  log it like the last one
//   { type: 'skipRest' } | { type: 'addRest', sec }
//   { type: 'swap', query }           swap the current exercise ("machine's taken, switch to X")
//   { type: 'setRest', sec }          the rest is this long now, and for this exercise from now on
//   { type: 'nextExercise' }          done with this exercise ("done with this machine"): on to the next
//   { type: 'next' }                  what is next
//   { type: 'finish' }                wrap up and save

const WORDS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 }

/** "twenty two and a half" → "22.5", "a hundred and forty" → "140"; digits are left alone. */
export function wordsToNumbers(text) {
  let s = ` ${String(text || '').toLowerCase().replace(/[-–]/g, ' ').replace(/,/g, '')} `
  s = s.replace(/\b(\d+)\s+and\s+a\s+half\b/g, (_, n) => `${n}.5`).replace(/\b(\d+)\s+point\s+(\d)\b/g, '$1.$2')
  const tokens = s.trim().split(/\s+/)
  const out = []
  let acc = null
  const flush = () => { if (acc != null) { out.push(String(acc)); acc = null } }
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i]
    if (w === 'a' && tokens[i + 1] === 'hundred') continue
    if (w === 'and' && acc != null && WORDS[tokens[i + 1]] != null) continue
    const v = WORDS[w]
    if (v == null) {
      if (w === 'half' && acc != null && tokens[i - 1] === 'a') { acc += 0.5; continue }
      flush(); out.push(w); continue
    }
    if (v === 100) acc = (acc || 1) * 100
    else if (acc != null && acc % 10 === 0 && acc % 100 !== 0 && v < 10) acc += v
    else if (acc != null && acc >= 100 && v < 100) acc += v
    else { flush(); acc = v }
  }
  flush()
  return out.join(' ').replace(/\b(\d+) and a half\b/g, (_, n) => `${Number(n) + 0.5}`).replace(/\b(\d+) point (\d+)\b/g, '$1.$2')
}

const N = '(\\d+(?:\\.\\d+)?)'

// The ways speech recognition writes a unit: "55kg", "55 KG", "55 kgs.", "55 kg's", "55 k g", "55 kilos".
function units(text) {
  return text
    .replace(/(\d)\s*(?:kg'?s|kgs?|k\.?\s?g\.?|kgm|kilo ?grams?|kilogrammes?|kilos?|kilo's|keys|kegs?)(?=\W|$)/g, '$1 kg')
    .replace(/(\d)\s*(?:lbs?|pounds?)(?=\W|$)/g, '$1 lb')
    .replace(/\b(?:reps?|repetitions?|times)\b/g, 'reps')
    .replace(/[,.;:](?!\d)/g, ' ').replace(/\s+/g, ' ').trim()
}

/** A logged set, in any order: "55 kg 12 reps", "12 reps 55 kg", "12 at 55", "55 for 12", "that's 55, 12 reps". */
export function parseSet(raw) {
  const text = units(raw)
  if (!/\d/.test(text)) return null
  let weight = null, reps = null, wAt = -1, rAt = -1
  let m = new RegExp(`${N} (?:kg|lb)\\b`).exec(text) || new RegExp(`\\bweight (?:of |is |was )?${N}`).exec(text)
  if (m) { weight = Number(m[1]); wAt = m.index + m[0].indexOf(m[1]) }
  m = /\b(\d+) reps\b/.exec(text)
  // "weight 55 reps 12": the number before "reps" was the weight
  if (!m || m.index === wAt) m = /\breps (?:of |is |was )?(\d+)\b/.exec(text) || m
  if (m && m.index !== wAt) { reps = Number(m[1]); rAt = m.index + m[0].indexOf(m[1]) }
  // "8 at 60", "6 on 80", "12 reps with 55": reps then the weight
  if (weight == null) {
    m = new RegExp(`\\b(\\d+)(?: reps)? (?:at|on|with|@|of|using) ${N}\\b`).exec(text)
    if (m) { reps ??= Number(m[1]); weight = Number(m[2]) }
  }
  // "55 for 12", "55 x 12", "55 by 12": the weight then reps
  if (reps == null) {
    m = new RegExp(`${N} (?:kg |lb )?(?:for|x|by) ?(\\d+)\\b`).exec(text) || new RegExp(`${N} (?:kg |lb )?x(\\d+)\\b`).exec(text)
    if (m) { weight ??= Number(m[1]); reps = Number(m[2]) }
  }
  // One side named, the other a bare number: "that's 55, 12 reps", "55 kg 12"
  const bare = [...text.matchAll(/\d+(?:\.\d+)?/g)].filter(x => x.index !== wAt && x.index !== rAt).map(x => Number(x[0]))
  if (weight != null && reps == null && bare.length) reps = bare.find(n => Number.isInteger(n) && n !== weight) ?? null
  else if (reps != null && weight == null && bare.length) weight = bare.find(n => n !== reps) ?? null
  else if (weight == null && reps == null) {
    if (bare.length >= 2) { weight = bare[0]; reps = bare[1] } // "55 12": weight, then reps
    else if (bare.length === 1 && /^(?:(?:that'?s|did|got|hit|made|done) )?\d+$/.test(text)) reps = bare[0]
    else return null
  }
  if (reps != null && !Number.isInteger(reps)) return null
  const out = { type: 'set' }
  if (reps != null) out.reps = reps
  if (weight != null) out.weight = weight
  return out.reps != null || out.weight != null ? out : null
}

export function parseCommand(raw) {
  const text = wordsToNumbers(raw).replace(/^(hey |hi |ok |okay )?(hayden|haydn|heyden|haiden|aidan|aiden)[, ]*/, '').replace(/[.!?]+$/, '').trim()
  if (!text) return null

  if (/\b(wrap( it)? up|finish (the |my )?(workout|session)|end (the |my )?(workout|session)|i'?m done for (today|the day)|that'?s (it|me) for today)\b/.test(text)) return { type: 'finish' }

  const swap = /\b(?:swap|switch|change|move)(?: it| this| that)?(?: over)? (?:to|for|with) (?:an? |the )?(.+)$/.exec(text) || /\b(?:let'?s do|i'?ll do|use) (?:an? |the )?(.+?) instead\b/.exec(text)
  if (swap) return { type: 'swap', query: swap[1].replace(/\b(instead|please|then)\b/g, '').trim() }

  // "Done with this machine", "next exercise", "move on": the rest of this exercise is dropped.
  if (/\b(next exercise|next machine|next one please|move on|moving on|let'?s move on|on to the next( one)?|skip (this|the) exercise|skip this one|(i'?m )?(done|finished) with (this|that|the) (machine|exercise|one|1|station|bench|rack|cable|thing)|(i'?m )?(done|finished) with (this|that)$|machine'?s? (is )?(taken|busy|full|in use))\b/.test(text) && !/\b(swap|switch|change)\b/.test(text)) return { type: 'nextExercise' }
  // "2 minutes rest instead", "rest 90 seconds", "cut the rest to a minute", "only a minute rest"
  if (/\brest|instead\b/.test(text)) {
    const r = text.replace(/\b(?:a|one) minute and a half\b/g, '1.5 minutes').replace(/\bhalf a minute\b/g, '30 seconds').replace(/\b(?:a|one) minute\b/g, '1 minute')
    const m = /(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|seconds?|secs?|s)\b(?:\s*(?:of|for))?(?:\s*(?:rest|instead|break))/.exec(r) ||
      /\b(?:rest|break)\s*(?:time\s*)?(?:for|of|to|is|at)?\s*(?:only|just)?\s*(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|seconds?|secs?|s)\b/.exec(r) ||
      /\b(?:cut|make|change|set|drop|bring)\s*(?:the\s*|my\s*)?(?:rest|it|that)\s*(?:time\s*)?(?:to|down to|at)\s*(\d+(?:\.\d+)?)\s*(minutes?|mins?|m|seconds?|secs?|s)\b/.exec(r)
    if (m) {
      const sec = Math.round(Number(m[1]) * (/^m/.test(m[2]) ? 60 : 1))
      if (sec >= 10 && sec <= 900) return { type: 'setRest', sec }
    }
  }
  if (/\b(skip (the )?rest|i'?m ready|ready to go|let'?s go|start (the )?(next )?set)\b/.test(text)) return { type: 'skipRest' }
  const more = /\b(?:add|another|give me)(?: an?)? (\d+) ?(seconds?|secs?|minutes?|mins?)\b/.exec(text)
  if (more) return { type: 'addRest', sec: Number(more[1]) * (/^min/.test(more[2]) ? 60 : 1) }
  if (/\b(another minute|a minute more|one more minute)\b/.test(text)) return { type: 'addRest', sec: 60 }
  if (/\b(more rest|need more time)\b/.test(text)) return { type: 'addRest', sec: 30 }

  if (/\b(what'?s next|what is next|what now|what'?s after this)\b/.test(text)) return { type: 'next' }
  if (/\b(same (again|as last|as before)|repeat( that)?|same weight same reps)\b/.test(text)) return { type: 'same' }

  const set = parseSet(text)
  if (set) return set
  if (/^(done|done it|set done|finished|got it|nailed it|tick( it)?|log it|next set|complete)$/.test(text) || /\b(set (is )?done|done (that|the) set|log (that|the) set)\b/.test(text)) return { type: 'set' }
  return null
}
