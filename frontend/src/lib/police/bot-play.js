// Bots about (components/NearbyBots.jsx) wander the screen like Hayden and, when there are two or
// more, play together now and then: a high five, a chat, rock paper scissors. This picks what
// happens next. Pure: `rand` is passed in, so a scene can be tested.

// Where a bot may stand: share of the screen's width and height, along the edges, clear of the
// buttons in the middle and of the bars at the top and the bottom.
export const SPOTS = [
  { x: 3, y: 16 }, { x: 78, y: 18 }, { x: 3, y: 34 }, { x: 80, y: 36 },
  { x: 3, y: 52 }, { x: 80, y: 54 }, { x: 18, y: 14 }, { x: 64, y: 14 },
]
// Where two meet to play: the top left, which is clear on every screen.
export const MEET = [{ x: 3, y: 15 }, { x: 19, y: 15 }]
const RPS = ['✊', '✋', '✌️']
const beats = (a, b) => (a === '✊' && b === '✌️') || (a === '✋' && b === '✊') || (a === '✌️' && b === '✋')

/** Spots for `n` bots, all different, picked at random. */
export function wander(n, rand = Math.random) {
  const pool = SPOTS.slice()
  return Array.from({ length: n }, () => pool.splice(Math.floor(rand() * pool.length), 1)[0] || SPOTS[0])
}

/**
 * The next scene for `n` bots: { kind, places: [{x,y}], steps: [[act per bot]] } where each step
 * lasts about a second and a half and an act is { pose, eyes, say } (or null for idle).
 * One bot only ever wanders and waves now and then; two or more meet at the top left and play.
 */
export function nextScene(n, rand = Math.random) {
  if (n < 1) return { kind: 'none', places: [], steps: [] }
  const roll = rand()
  if (n === 1 || roll < 0.4) {
    const wave = rand() < 0.4
    return { kind: 'wander', places: wander(n, rand), steps: [Array.from({ length: n }, (_, i) => (wave && i === 0 ? { pose: 'wave', eyes: 'happy', say: 'Hi!' } : null))] }
  }
  // Two of them meet side by side; the others carry on wandering, away from the meeting place.
  const places = wander(n, rand).map(p => (p.y < 30 && p.x < 30 ? { x: 80, y: 54 } : p))
  places[0] = MEET[0]; places[1] = MEET[1]
  const pair = (a, b) => [a, b, ...Array(n - 2).fill(null)]
  if (roll < 0.6) return { kind: 'highfive', places, steps: [pair(null, null), pair({ pose: 'cheer', eyes: 'happy', say: '✋' }, { pose: 'cheer', eyes: 'happy', say: '✋' }), pair({ pose: 'fist', eyes: 'happy' }, { pose: 'fist', eyes: 'happy' })] }
  if (roll < 0.8) {
    const lines = [['Hi!', 'Hey!'], ['Training?', 'Always!'], ['Beep test?', 'Level 8!'], ['Nice one', 'You too']]
    const [a, b] = lines[Math.floor(rand() * lines.length)]
    return { kind: 'chat', places, steps: [pair(null, null), pair({ pose: 'wave', eyes: 'happy', say: a }, null), pair(null, { pose: 'wave', eyes: 'happy', say: b }), pair({ pose: 'cheer', eyes: 'happy', say: '😄' }, { pose: 'cheer', eyes: 'happy', say: '😄' })] }
  }
  const x = RPS[Math.floor(rand() * 3)], y = RPS[Math.floor(rand() * 3)]
  const win = beats(x, y) ? 0 : beats(y, x) ? 1 : -1
  const end = i => (win === -1 ? { pose: 'wave', eyes: 'happy', say: '🤝' } : win === i ? { pose: 'cheer', eyes: 'happy', say: '🏆' } : { pose: 'rest', eyes: 'droop', say: '😅' })
  return { kind: 'game', places, steps: [pair(null, null), pair({ pose: 'fist', eyes: 'determined', say: '3, 2, 1' }, { pose: 'fist', eyes: 'determined', say: '3, 2, 1' }), pair({ pose: 'fist', eyes: 'open', say: x }, { pose: 'fist', eyes: 'open', say: y }), pair(end(0), end(1))] }
}
