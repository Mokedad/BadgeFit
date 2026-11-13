// Hayden's moves when he is tapped (components/HaydenBuddy.jsx), and the on/off switch.
// He is on unless the member has turned him off (S.police.haydenOff).
export const EMOTES = [
  { eyes: 'happy', pose: 'wave' },
  { eyes: 'happy', pose: 'cheer' },
  { eyes: 'determined', pose: 'fist' },
  { eyes: 'look', pose: 'think' },
  { eyes: 'wide', pose: 'listen' },
]
export const IDLE = { eyes: 'open', pose: 'idle' }
export const EMOTE_MS = 1600

/** A different move from the last one, so each tap shows something new. */
export function nextEmote(last = -1, rand = Math.random) {
  if (EMOTES.length < 2) return 0
  const i = Math.floor(rand() * (EMOTES.length - 1))
  return i >= last && last >= 0 ? i + 1 : i
}

export const haydenOn = S => !S?.police?.haydenOff
