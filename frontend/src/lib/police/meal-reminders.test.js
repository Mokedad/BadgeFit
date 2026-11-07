import { describe, it, expect } from 'vitest'
import { MEALS, LINES, lineFor, mealSettings, buildMealNotifications, allMealIds, MEAL_ID_BASE } from './meal-reminders.js'
import * as server from '../../../../api/meal-reminders.js'

describe('meal reminders on the phone', () => {
  it('match the server: the same meals, times and lines', () => {
    expect(MEALS).toEqual(server.MEALS)
    expect(LINES).toEqual(server.LINES)
    expect(lineFor('dinner', '2026-11-08')).toBe(server.lineFor('dinner', '2026-11-08'))
  })
  it('fills in defaults', () => {
    const s = mealSettings({ on: true, meals: { lunch: { time: '13:15' }, dinner: { on: false } } })
    expect(s.meals.breakfast).toEqual({ on: true, time: '07:00' })
    expect(s.meals.lunch.time).toBe('13:15')
    expect(s.meals.dinner.on).toBe(false)
  })
  it('schedules the next 7 days of each switched-on meal, only in the future', () => {
    const now = new Date(2026, 10, 8, 10, 0) // 10:00, breakfast already gone today
    const n = buildMealNotifications({ on: true, meals: { dinner: { on: false } } }, now)
    // breakfast 6 days (today's passed), lunch 7, pre-workout 7, dinner none
    expect(n.length).toBe(6 + 7 + 7)
    expect(n.every(x => x.schedule.at > now)).toBe(true)
    const lunchToday = n.find(x => x.id === MEAL_ID_BASE + 10)
    expect(lunchToday.title).toBe('🥗 Lunch')
    expect(lunchToday.schedule.at.getHours()).toBe(12)
    expect(lunchToday.schedule.at.getMinutes()).toBe(30)
    expect(buildMealNotifications({ on: false }, now)).toEqual([])
  })
  it('ids stay in their own range', () => {
    const ids = allMealIds()
    expect(ids.length).toBe(28)
    expect(Math.min(...ids)).toBe(3000)
    expect(Math.max(...ids)).toBeLessThan(3100)
  })
})
