import { describe, it, expect } from 'vitest'
import { nextScene, wander, SPOTS, MEET } from './bot-play.js'

const seq = (...v) => { let i = 0; return () => v[i++ % v.length] }

describe('bots at play', () => {
  it('wander to different spots on the screen', () => {
    const p = wander(4, seq(0, 0.5, 0.9, 0.2))
    expect(new Set(p.map(s => `${s.x},${s.y}`)).size).toBe(4)
    expect(p.every(s => SPOTS.includes(s))).toBe(true)
    // Along the edges, never the middle of the screen where the buttons are.
    expect(SPOTS.every(s => s.x <= 20 || s.x >= 60 || s.y <= 20)).toBe(true)
  })
  it('one bot only wanders', () => {
    expect(nextScene(1, seq(0.99, 0.1, 0.5)).kind).toBe('wander')
  })
  it('two meet in the middle for a high five, a chat or a game', () => {
    const hf = nextScene(2, seq(0.5, 0.3, 0.6))
    expect(hf.kind).toBe('highfive')
    expect(hf.places.slice(0, 2)).toEqual(MEET)
    expect(hf.steps[1].map(a => a.say)).toEqual(['✋', '✋'])
    expect(nextScene(3, seq(0.7, 0.1, 0.2, 0.3, 0.1)).kind).toBe('chat')
    const g = nextScene(2, seq(0.9, 0.1, 0.2, 0.0, 0.5))
    expect(g.kind).toBe('game')
    expect(g.steps.at(-1).map(a => a.say).sort().join('')).toMatch(/🏆|🤝/)
  })
  it('the others carry on when three are about', () => {
    const s = nextScene(3, seq(0.5, 0.1, 0.3, 0.6))
    expect(s.places).toHaveLength(3)
    expect(s.steps.every(st => st.length === 3 && st[2] === null)).toBe(true)
  })
})
