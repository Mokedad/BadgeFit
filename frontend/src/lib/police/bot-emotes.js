// Hayden's moves when he is tapped (components/HaydenBuddy.jsx), and the on/off switch.
// He is on unless the member has turned him off (S.police.haydenOff).
// Each move has its one symbol (his speech bubble) and the mood of his beeps (bot-voice.js).
export const EMOTES = [
  { eyes: 'happy', pose: 'wave', sym: '👋', mood: 'happy' },
  { eyes: 'happy', pose: 'cheer', sym: '🎉', mood: 'excited' },
  { eyes: 'determined', pose: 'fist', sym: '💪', mood: 'proud' },
  { eyes: 'look', pose: 'think', sym: '🤔', mood: 'curious' },
  { eyes: 'wide', pose: 'listen', sym: '👂', mood: 'curious' },
  { eyes: 'happy', pose: 'idle', sym: '❤️', mood: 'love' },
  { eyes: 'closed', pose: 'rest', sym: '😴', mood: 'sleepy' },
]
/** His symbol and mood while doing an exercise (HaydenBot acts). */
export const ACT_SAY = { run: ['🏃', 'excited'], bench: ['💪', 'proud'], squat: ['🔥', 'excited'], curl: ['💪', 'proud'], pull: ['💪', 'proud'], press: ['🙌', 'excited'] }
/** Picked up (a long hold), and put down again. */
export const LIFT = { eyes: 'wide', pose: 'cheer', sym: '😮', mood: 'whoa' }
export const DROP = { eyes: 'happy', pose: 'wave', sym: '❤️', mood: 'love' }
export const HOLD_MS = 500
export const IDLE = { eyes: 'open', pose: 'idle' }
export const EMOTE_MS = 1600

/** A different move from the last one, so each tap shows something new. */
export function nextEmote(last = -1, rand = Math.random) {
  if (EMOTES.length < 2) return 0
  const i = Math.floor(rand() * (EMOTES.length - 1))
  return i >= last && last >= 0 ? i + 1 : i
}

export const haydenOn = S => !S?.police?.haydenOff

/** Which exercise Hayden copies when tapped mid-workout: run, bench, squat, curl, pull or press
 *  (components/HaydenBot.jsx acts), from the exercise's English name; null for anything else. */
export function exerciseAct(ex) {
  const n = String(ex?.n || ex?.name || '').toLowerCase()
  if (!n) return null
  if (/\b(run|jog|sprint|shuttle|beep|treadmill|walk)/.test(n) || ex?.cat === 'cardio') return 'run'
  if (/bench|chest press|push.?up|\bfly|\bflye|\bdip/.test(n)) return 'bench'
  if (/squat|lunge|leg press|deadlift|step.?up|hip thrust/.test(n)) return 'squat'
  if (/curl/.test(n)) return 'curl'
  if (/pulldown|pull.?down|pull.?up|chin.?up|\brow\b|\brows\b|rowing|\bpull/.test(n)) return 'pull'
  if (/press|raise|extension|pushdown|push.?down/.test(n)) return 'press'
  return null
}
export const ACT_MS = 2600

/** Where Hayden can float. Double-tapped, he hops to another one, picked at random. */
export const SPOTS = ['br', 'bl', 'mr', 'ml', 'tr', 'tl']
export function nextSpot(cur = 'br', rand = Math.random) {
  const others = SPOTS.filter(s => s !== cur)
  return others[Math.min(others.length - 1, Math.floor(rand() * others.length))]
}
