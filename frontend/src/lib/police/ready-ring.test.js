import { describe, it, expect } from 'vitest'
import { readyView, workOnLine, shownValue } from './ready-ring.js'
import { standardById } from './standards.js'

const all = (over = {}) => [
  { id: 'grip', v: { left: 32, right: 31 }, at: '2026-11-01' },
  { id: 'bridge', v: 95, at: '2026-11-01' },
  { id: 'jump', v: 34, at: '2026-11-01' },
  { id: 'pushups', v: 26, at: '2026-11-01' },
  { id: 'illinois', v: 19.2, at: '2026-11-01' },
  { id: 'beep', v: '7.4', at: '2026-11-01' },
].map(r => (over[r.id] != null ? { ...r, v: over[r.id] } : r))

describe('ready ring', () => {
  it('asks for a first test when nothing is tested', () => {
    const v = readyView([])
    expect(v).toMatchObject({ tested: false, pct: 0, passed: 0, total: 6, untested: 6, next: null })
    expect(v.rows.map(r => r.id)).toEqual(['grip', 'bridge', 'jump', 'pushups', 'illinois', 'beep'])
    expect(v.rows.every(r => !r.tested && !r.pass && r.pct === 0)).toBe(true)
  })

  it('points at what is still untested', () => {
    const v = readyView([{ id: 'pushups', v: 20, at: '2026-11-01' }])
    expect(v.tested).toBe(true)
    expect(v.untested).toBe(5)
    expect(v.next).toEqual({ kind: 'test', text: '5 not tested yet' })
    const one = readyView(all().filter(r => r.id !== 'illinois'))
    expect(one.next).toEqual({ kind: 'test', text: 'Test your agility' })
  })

  it('names the weakest standard, from where you are to the pass mark', () => {
    const v = readyView(all({ beep: '6.4', pushups: 22 }))
    expect(v.passed).toBe(4)
    expect(v.next).toEqual({ kind: 'work', text: 'Work on: Beep 6.4 → 7.1' })
    // One arc per standard: the passing ones full, the others part way to their pass mark.
    expect(v.rows.find(r => r.id === 'grip')).toEqual({ id: 'grip', tested: true, pass: true, pct: 100 })
    expect(v.rows.find(r => r.id === 'pushups')).toEqual({ id: 'pushups', tested: true, pass: false, pct: 88 })
    expect(v.rows.find(r => r.id === 'beep').pct).toBeLessThan(100)
  })

  it('says keep it there once everything passes', () => {
    const v = readyView(all())
    expect(v.passed).toBe(6)
    expect(v.pct).toBe(100)
    expect(v.next.kind).toBe('keep')
  })

  it('writes each standard its own way', () => {
    expect(workOnLine(standardById('illinois'), { v: 21.4 })).toBe('Agility 21.4 → 20 s')
    expect(workOnLine(standardById('grip'), { v: { left: 28, right: 31 } })).toBe('Grip 28 → 30 kg')
    expect(workOnLine(standardById('pushups'), { v: 22 })).toBe('Push-ups 22 → 25')
    expect(workOnLine(standardById('beep'), { v: { level: 6, shuttle: 4 } }, '7.5')).toBe('Beep 6.4 → 7.5')
    expect(shownValue('beep', '8.10')).toBe('8.10')
  })
})
