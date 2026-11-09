// "Jarvis, that's 20 kg, 4 reps" (BadgeFit hands-free): only what is said to Jarvis counts, so
// gym noise, other people and song lyrics are ignored. Speech recognition spells the name many
// ways; these are the ones it tends to hear. Pure.
const WAKE = /\b(?:hey |ok |okay )?(?:jarvis|jarvas|jarvys|jervis|jarviss|javis|jarvi|jaavis|travis|harvis)\b[\s,.!?:-]*/i

/** { woke, rest }: whether Jarvis was addressed, and what was said after his name. */
export function splitWake(text) {
  const s = String(text || '')
  const m = WAKE.exec(s)
  if (!m) return { woke: false, rest: '' }
  return { woke: true, rest: s.slice(m.index + m[0].length).trim() }
}
