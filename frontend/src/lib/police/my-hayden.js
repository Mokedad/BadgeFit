// My Hayden (views/MyHayden.jsx): every piece of gear Hayden can earn, in the order it usually
// comes, with what earns it, whether it is earned, and how close the next one is. The gear itself
// is decided in lib/police/bot-look.js (earnedGear); this only lays it out. Pure.
import { earnedGear, weeksTrained } from './bot-look.js'
import { readiness, latestResult, evaluate, DEFAULT_BEEP_GOAL } from './standards.js'
import { SHORT, shownValue } from './ready-ring.js'

export const SHELF = [
  { id: 'headband', name: 'Sweatband', gear: ['headband'], how: 'Train 4 different weeks' },
  { id: 'whistle', name: 'Whistle', gear: ['whistle'], how: 'Pass a PCT standard' },
  { id: 'bolt', name: 'Lightning bolt', gear: ['bolt'], how: 'Beat your beep test goal' },
  { id: 'badge', name: 'Gold badge', gear: ['badge', 'stripes'], how: 'Pass the PCT' },
  { id: 'cap', name: 'Academy cap', gear: ['cap', 'medal'], how: 'Make the Academy' },
]

/**
 * [{ id, name, gear, how, earned, next, progress }] in SHELF order. `next` marks the first one not
 * earned yet; `progress` ({ pct, text }) says how close an unearned one is, where there is a number
 * to it. A guest earns nothing (gear comes with an account) and has no next.
 */
export function gearShelf(S, { guest = false } = {}) {
  const P = S?.police || {}
  const have = new Set(earnedGear(S, { guest }))
  const results = P.results || []
  const prog = {}
  const weeks = Math.min(weeksTrained(S), 4)
  prog.headband = { pct: Math.round(weeks / 4 * 100), text: `${weeks} of 4 weeks` }
  const closest = readiness(results, P.beepTarget).rows.filter(x => x.ev).sort((a, b) => b.ev.pct - a.ev.pct)[0]
  if (closest) prog.whistle = { pct: closest.ev.pct, text: `Closest: ${SHORT[closest.std.id].toLowerCase()} ${closest.ev.pct}%` }
  const beep = latestResult(results, 'beep')
  const goal = String(P.beepGoal || DEFAULT_BEEP_GOAL)
  const ev = beep ? evaluate('beep', beep.v, goal) : null
  if (ev) prog.bolt = { pct: ev.pct, text: `Beep ${shownValue('beep', beep.v)} of ${goal}` }
  const items = SHELF.map(item => ({ ...item, earned: item.gear.every(g => have.has(g)) }))
  const next = guest ? null : items.find(i => !i.earned)
  return items.map(i => ({ ...i, next: i === next, progress: i.earned || guest ? null : prog[i.id] || null }))
}
