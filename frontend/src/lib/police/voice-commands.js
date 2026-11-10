// What you can say to Hayden mid-workout instead of tapping (BadgeFit). Pure: the words in, one
// command out, or null for a real question that goes to the AI coach. Speech recognition hands
// over digits mostly ("15 reps at 20 kilos"), sometimes words ("fifteen"): both are read.
//   { type: 'set', reps?, weight? }   log the next set ("done" alone keeps what is pre-filled)
//   { type: 'same' }                  log it like the last one
//   { type: 'skipRest' } | { type: 'addRest', sec }
//   { type: 'swap', query }           swap the current exercise ("machine's taken, switch to X")
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
  return out.join(' ').replace(/\b(\d+) and a half\b/g, (_, n) => `${Number(n) + 0.5}`)
}

const num = s => (s == null ? null : Number(s))
const UNIT = '(?:kg|kgs|kilo|kilos|kilograms?|lb|lbs|pounds?)'

export function parseCommand(raw) {
  const text = wordsToNumbers(raw).replace(/^(hey |hi |ok |okay )?(hayden|haydn|heyden|haiden|aidan|aiden)[, ]*/, '').replace(/[.!?]+$/, '').trim()
  if (!text) return null

  if (/\b(wrap( it)? up|finish (the |my )?(workout|session)|end (the |my )?(workout|session)|i'?m done for (today|the day)|that'?s (it|me) for today)\b/.test(text)) return { type: 'finish' }

  const swap = /\b(?:swap|switch|change|move)(?: it| this| that)?(?: over)? (?:to|for|with) (?:an? |the )?(.+)$/.exec(text) || /\b(?:let'?s do|i'?ll do|use) (?:an? |the )?(.+?) instead\b/.exec(text)
  if (swap) return { type: 'swap', query: swap[1].replace(/\b(instead|please|then)\b/g, '').trim() }

  if (/\b(skip (the )?rest|i'?m ready|ready to go|let'?s go|start (the )?(next )?set)\b/.test(text)) return { type: 'skipRest' }
  const more = /\b(?:add|another|give me)(?: an?)? (\d+) ?(seconds?|secs?|minutes?|mins?)\b/.exec(text)
  if (more) return { type: 'addRest', sec: Number(more[1]) * (/^min/.test(more[2]) ? 60 : 1) }
  if (/\b(another minute|a minute more|one more minute)\b/.test(text)) return { type: 'addRest', sec: 60 }
  if (/\b(more rest|need more time)\b/.test(text)) return { type: 'addRest', sec: 30 }

  if (/\b(what'?s next|what is next|next exercise|what now)\b/.test(text)) return { type: 'next' }
  if (/\b(same (again|as last|as before)|repeat( that)?|same weight same reps)\b/.test(text)) return { type: 'same' }

  // "15 reps at 20 kilos", "did 6 on 80", "20 kilos for 8", "8 at 60", "12 reps"
  let m = new RegExp(`\\b(\\d+)\\s*(?:reps?|times)?\\s*(?:at|on|with|@|of)\\s*(\\d+(?:\\.\\d+)?)\\s*${UNIT}?\\b`).exec(text)
  if (m) return { type: 'set', reps: num(m[1]), weight: num(m[2]) }
  m = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*${UNIT}\\s*(?:for|x|times|by)?\\s*(\\d+)\\b`).exec(text)
  if (m) return { type: 'set', reps: num(m[2]), weight: num(m[1]) }
  m = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:for|x|by)\\s*(\\d+)\\b`).exec(text)
  if (m) return { type: 'set', reps: num(m[2]), weight: num(m[1]) }
  m = /\b(\d+)\s*reps?\b/.exec(text)
  if (m) return { type: 'set', reps: num(m[1]) }
  m = /^(?:done|did|got|hit|made)\s+(\d+)$/.exec(text) || /^(\d+)$/.exec(text)
  if (m) return { type: 'set', reps: num(m[1]) }
  if (/^(done|done it|set done|finished|got it|nailed it|tick( it)?|log it|next set|complete)$/.test(text) || /\b(set (is )?done|done (that|the) set|log (that|the) set)\b/.test(text)) return { type: 'set' }
  return null
}
