// Hayden's own life on screen (components/HaydenBuddy.jsx), so he is more than a thing to tap:
// every so often he does something by himself (looks about, stretches, yawns, waves, flexes), now
// and then something for the month (a Santa hat and Christmas in December, fireworks at New Year),
// and a welcome back with a beep when the app comes back on screen. Pure: the clock and the dice
// are passed in.

// The month's touch: the symbols he shows now and then, and a hat for the month if it has one.
// Southern hemisphere seasons (BadgeFit is Australian): winter is June to August.
export const SEASONS = [
  { syms: ['🎆', '🥳'], name: 'New Year' },            // January
  { syms: ['❤️', '💌'], name: 'Valentine' },            // February
  { syms: ['🍂', '🍁'], name: 'autumn' },               // March
  { syms: ['🐣', '🥚'], name: 'Easter' },               // April
  { syms: ['🍂', '☕'], name: 'autumn' },               // May
  { syms: ['❄️', '🧣'], name: 'winter' },               // June
  { syms: ['❄️', '☕'], name: 'winter' },               // July
  { syms: ['🧣', '🏉'], name: 'winter' },               // August
  { syms: ['🌼', '🌸'], name: 'spring' },               // September
  { syms: ['🎃', '👻'], name: 'Halloween' },            // October
  { syms: ['🌞', '🌸'], name: 'spring' },               // November
  { syms: ['🎄', '🎅', '🎁'], name: 'Christmas', hat: 'santa' }, // December
]
export const seasonOf = (date = new Date()) => SEASONS[new Date(date).getMonth()]

// What he does by himself. `sym` is his bubble (none for most: he just does it); quiet: no beeps.
export const IDLE_ACTS = [
  { eyes: 'look', pose: 'idle' },                       // looks about
  { eyes: 'look', pose: 'think' },                      // has a think
  { eyes: 'happy', pose: 'cheer' },                     // a stretch
  { eyes: 'closed', pose: 'rest', sym: '🥱' },          // a yawn
  { eyes: 'happy', pose: 'wave' },                      // a little wave
  { eyes: 'determined', pose: 'fist', sym: '💪' },      // a flex
  { eyes: 'wide', pose: 'listen' },                     // hears something
]
export const IDLE_MIN_MS = 18000
export const IDLE_SPREAD_MS = 22000
/** How long until he next does something by himself (18 to 40 seconds). */
export const idleGap = (rand = Math.random) => IDLE_MIN_MS + Math.floor(rand() * IDLE_SPREAD_MS)

/** What he does by himself now: one time in four, the month's thing; else one of his own. */
export function idleAct(rand = Math.random, date = new Date()) {
  if (rand() < 0.25) {
    const s = seasonOf(date)
    return { eyes: 'happy', pose: 'cheer', sym: s.syms[Math.floor(rand() * s.syms.length) % s.syms.length] }
  }
  return IDLE_ACTS[Math.floor(rand() * IDLE_ACTS.length) % IDLE_ACTS.length]
}

/** Back on screen after a while away: a welcome (with the month's flavour in a holiday month). */
export const WELCOME_AFTER_MS = 30000
export function welcomeAct(date = new Date()) {
  const s = seasonOf(date)
  return { eyes: 'happy', pose: 'wave', sym: s.hat ? s.syms[1] : '👋', mood: 'excited' }
}
