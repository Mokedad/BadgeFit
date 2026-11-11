// The rest-day card on Home and the breakfast fuel notification.
import { describe, expect, it } from 'vitest'
import { restDayCard, isRestDay, hasWeekOfData, levelOf, foodTips, moveTips, buildFuelNotifications, FUEL_ID_BASE } from './rest-day.js'
import { fatigueOf } from './recovery.js'

const SQUAT = '0043', BENCH = '0025', ROW = '0027', RDL = '0085', OHP = '0091'
// Wednesday 28 Oct 2026, 09:00. Weekday 3; the plan trains Monday (1) and Friday (5).
const TODAY = '2026-10-28'
const NOW = new Date(2026, 9, 28, 9).getTime()
const daysAgo = n => { const x = new Date(2026, 9, 28 - n, 18); const d = new Date(x); return { d: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, start: x.getTime(), end: x.getTime() + 3600e3 } }
const sets = (n, w = 60) => Array.from({ length: n }, () => ({ w, r: 8, done: true }))
const workout = (n, ids, k = 5) => ({ id: 'w' + n + ids.join(''), ...daysAgo(n), entries: ids.map(id => ({ id, sets: sets(k) })) })
const legs = n => workout(n, [SQUAT, RDL])
const upper = n => workout(n, [BENCH, ROW, OHP])
const routine = (id, ids, k = 4) => ({ id, name: id, ex: ids.map(x => ({ id: x, sets: k, reps: 8, weight: 60 })) })

function state(workouts, extra = {}) {
  return { unit: 'kg', workouts, bodyweight: [], routines: [routine('Legs', [SQUAT, RDL]), routine('Push', [BENCH, OHP])], week: { 1: ['Legs'], 5: ['Push'] }, dayPlan: {}, ...extra }
}
const card = (S, extra = {}) => restDayCard(S, { now: NOW, today: TODAY, fatigue: fatigueOf(S.workouts, NOW, { unit: 'kg' }), ...extra })

describe('isRestDay', () => {
  it('a weekday with nothing planned is a rest day when a plan exists', () => {
    expect(isRestDay(state([]), TODAY)).toBe(true)
    expect(isRestDay(state([]), '2026-10-26')).toBe(false) // Monday: Legs
  })
  it('no plan at all: no way to tell, so not a rest day, unless the day is marked rest', () => {
    expect(isRestDay(state([], { week: {} }), TODAY)).toBe(false)
    expect(isRestDay(state([], { week: {}, dayPlan: { [TODAY]: 'rest' } }), TODAY)).toBe(true)
  })
})

describe('restDayCard', () => {
  it('always shows on a rest day, even for a brand new profile', () => {
    const c = card(state([]))
    expect(c.level).toBe('beginner')
    expect(c.food).toHaveLength(4)
    expect(c.move.kind).toBe('starter')
  })
  it('not on a training day, a logged day, while hidden for today or when switched off', () => {
    expect(card(state([], { week: { 3: ['Legs'] } }))).toBeNull()
    expect(card(state([workout(0, [BENCH])]))).toBeNull()
    expect(card(state([], { restDayHide: TODAY }))).toBeNull()
    expect(card(state([], { restDay: false }))).toBeNull()
  })
})

describe('moveTips', () => {
  it('first week: the same easy ideas for everyone', () => {
    const S = state([legs(3), upper(2), legs(1)])
    expect(hasWeekOfData(S, NOW)).toBe(false)
    expect(moveTips(S, { now: NOW }).kind).toBe('starter')
  })
  it('from week two it reads the fatigue: legs recovering → bands for the upper body', () => {
    const S = state([legs(12), upper(10), legs(6), upper(4), legs(1)])
    expect(hasWeekOfData(S, NOW)).toBe(true)
    expect(card(S).move.kind).toBe('upper')
  })
  it('upper body recovering → bands for the legs', () => {
    expect(card(state([legs(14), upper(10), legs(9), upper(1)])).move.kind).toBe('legs')
  })
  it('well recovered → a light full-body circuit', () => {
    expect(card(state([legs(14), upper(12), legs(10), upper(8)])).move.kind).toBe('full')
  })
  it('both recovering → just rest', () => {
    expect(moveTips(state([legs(12), upper(10), legs(6)]), { now: NOW, fatigue: { quadriceps: 0.9, chest: 0.9 } }).kind).toBe('rest')
  })
})

describe('food', () => {
  it('the Coach intake decides the level, else the workout count', () => {
    expect(levelOf({ workouts: [], coach: { profile: { experience: 'regular' } } })).toBe('regular')
    expect(levelOf({ workouts: Array(25).fill({}) })).toBe('regular')
    expect(levelOf({ workouts: Array(25).fill({}), coach: { profile: { experience: 'new' } } })).toBe('beginner')
  })
  it('a regular gets protein and water from the body weight', () => {
    const S = { unit: 'kg', workouts: Array(25).fill({}) }
    const tips = foodTips(S, { w: 80 })
    expect(tips[0].text).toBe('About 130 g today, spread over 3 or 4 meals.')
    expect(tips[3].text).toBe('About 3.0 litres through the day.')
    expect(foodTips({ ...S, unit: 'lb' }, { w: 176 })[0].text).toBe('About 130 g today, spread over 3 or 4 meals.')
  })
})

describe('buildFuelNotifications', () => {
  const now = new Date(NOW)
  it('off unless switched on', () => {
    expect(buildFuelNotifications(state([]), now)).toEqual([])
  })
  it('a food idea on rest days and a pre-workout tip on training days, at the chosen time', () => {
    const n = buildFuelNotifications(state([], { fuelNotify: { on: true, time: '07:30' } }), now)
    // 09:00 today is past 07:30, so it starts tomorrow (Thursday, a rest day).
    expect(n[0].id).toBe(FUEL_ID_BASE + 1)
    expect(n[0].title).toBe('Rest day')
    expect(n[0].schedule.at.getHours()).toBe(7)
    expect(n[0].schedule.at.getMinutes()).toBe(30)
    const fri = n.find(x => x.schedule.at.getDate() === 30)
    expect(fri.title).toBe('Fuel for today’s workout')
    expect(fri.body).toMatch(/^Push today\./)
  })
  it('skips excused days, and every day when there is no plan', () => {
    const S = state([], { fuelNotify: { on: true, time: '07:30' } })
    expect(buildFuelNotifications(S, now, { excused: d => d === '2026-10-29' }).some(x => x.id === FUEL_ID_BASE + 1)).toBe(false)
    expect(buildFuelNotifications({ ...S, week: {} }, now)).toEqual([])
  })
})
