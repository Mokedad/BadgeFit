// "Hayden, that's 20 kg, 4 reps" (BadgeFit hands-free): only what is said to Hayden counts, so
// gym noise, other people and song lyrics are ignored. Three ways to call him: his name (speech
// recognition spells it many ways, these are the ones it tends to hear), "Hey" at the start, or
// "H" (heard as "H", "aitch" or "haitch"). Pure.
const NAME = /\b(?:hey |hi |ok |okay )?(?:hayden|haydn|hayden's|haydens|heyden|haiden|haden|hadyn|aidan|aiden|hey den|hay den|hayton|haydon|heydon)\b[\s,.!?:-]*/i
// "Hey" or "H" only as the first word, so "hey" in a song line or a chat mid-sentence is not him.
const SHORT = /^\s*(?:hey|hay|h|h\.|aitch|haitch)(?=[\s,.!?:-]|$)[\s,.!?:-]*/i

/** { woke, rest, short }: whether Hayden was addressed, what was said after the call, and whether
 * the call was only "Hey" / "H" (then only a workout command counts, not a question). */
export function splitWake(text) {
  const s = String(text || '')
  const m = NAME.exec(s)
  if (m) return { woke: true, rest: s.slice(m.index + m[0].length).trim() }
  const h = SHORT.exec(s)
  if (h) return { woke: true, rest: s.slice(h[0].length).trim(), short: true }
  return { woke: false, rest: '' }
}
