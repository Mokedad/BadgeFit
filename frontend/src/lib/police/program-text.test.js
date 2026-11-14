import { describe, it, expect } from 'vitest'
import { exerciseLine, dayLine, parseProgramText, asPlanFile } from './program-text.js'

const LIB = { 'bench press': 'b', 'squat': 's', 'plank': 'p', 'lat pulldown': 'l', 'overhead press': 'o' }
const find = name => LIB[name.toLowerCase().replace(/^barbell /, '')] || null

describe('reading a programme written as text', () => {
  it('reads the ways people write sets and reps', () => {
    expect(exerciseLine('Bench press 4x8')).toEqual({ name: 'Bench press', sets: 4, reps: 8 })
    expect(exerciseLine('- Overhead press: 3 x 8-12 @ 30kg')).toEqual({ name: 'Overhead press', sets: 3, reps: 12, repsMin: 8, weight: 30 })
    expect(exerciseLine('1. Lat pulldown 3 sets of 10 reps')).toEqual({ name: 'Lat pulldown', sets: 3, reps: 10 })
    expect(exerciseLine('Plank 3 x 45s')).toEqual({ name: 'Plank', sets: 3, sec: 45 })
    expect(exerciseLine('Squat, 5, 5, 100')).toEqual({ name: 'Squat', sets: 5, reps: 5, weight: 100 })
    expect(exerciseLine('Rest 2 minutes between sets')).toBe(null)
    expect(exerciseLine('Warm up well')).toBe(null)
  })
  it('knows a day when it sees one', () => {
    expect(dayLine('Day 1 - Push')).toEqual({ name: 'Day 1 - Push', weekday: null })
    expect(dayLine('Monday')).toEqual({ name: 'Monday', weekday: 1 })
    expect(dayLine('## Upper body')).toEqual({ name: 'Upper body', weekday: null })
    expect(dayLine('Legs:')).toEqual({ name: 'Legs', weekday: null })
    expect(dayLine('Bench press 4x8')).toBe(null)
  })
  it('builds routines, the week and what it could not place', () => {
    const text = `My trainer plan\n\nMonday - Push\nBench press 4x8\nOverhead press 3x10\nCable fly 3x12\n\nWednesday - Legs\nBarbell squat 5x5 @ 100kg\nPlank 3 x 45 sec\n\nWeek 2\nMonday\nBench press 4x6`
    const p = parseProgramText(text, find, { title: 'Trainer' })
    expect(p.routines.map(r => r.name)).toEqual(['Monday - Push', 'Wednesday - Legs'])
    expect(p.routines[0].ex.map(e => e.id)).toEqual(['b', 'o'])
    expect(p.routines[1].ex[0]).toMatchObject({ id: 's', sets: 5, reps: 5, weight: 100 })
    expect(p.routines[1].ex[1]).toMatchObject({ id: 'p', mode: 'time', sec: 45 })
    expect(p.week).toEqual({ 1: ['up1'], 3: ['up2'] })
    expect(p.unknown).toEqual(['Cable fly'])
    expect(asPlanFile(p).opengym_plan).toBe(1)
  })
  it('a list with no days is one routine', () => {
    const p = parseProgramText('Bench press 3x10\nSquat 3x10', find)
    expect(p.routines).toHaveLength(1)
    expect(p.routines[0].ex).toHaveLength(2)
  })
})

import { weekFor } from './program-text.js'
describe('days for a programme that names none', () => {
  it('spreads them over the week; a named week is kept', () => {
    const r = n => ({ routines: Array.from({ length: n }, (_, i) => ({ id: 'r' + i })), week: {} })
    expect(weekFor(r(3))).toEqual({ 1: ['r0'], 3: ['r1'], 5: ['r2'] })
    expect(weekFor({ routines: [{ id: 'a' }], week: { 2: ['a'] } })).toEqual({ 2: ['a'] })
  })
})
