// @vitest-environment happy-dom
// BadgeFit's "change this day" sheet: this week's sessions as round buttons (once each), the
// kinds of run as round buttons with only that kind's runs listed, rest, and older routines
// folded under Other workouts (members only). No day notes.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { dayOverrideSheet } from './sheets.jsx'
import { todayISO } from './lib/format.js'

const r = (id, name) => ({ id, name, emoji: 'barbell', ex: [{ id: '0025' }] })
const routines = [r('a', 'Chest, Shoulders & Abs'), r('b', 'Squats & Push Power'), r('a2', 'Chest, Shoulders & Abs'), r('old', 'Full Body Gym A'), r('old2', 'Full Body Gym A')]
const mounted = []
function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}
const setS = user => useStore.setState(s => ({ S: { ...s.S, routines, week: { 1: ['a'], 3: ['b'], 5: ['a2'] }, dayPlan: {}, workouts: [], active: null, queue: null, police: { level: 'beginner', start: todayISO() } }, user, config: { passkeys: false } }))
const texts = (host, sel) => [...host.querySelectorAll(sel)].map(e => e.textContent)

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  document.body.innerHTML = ''
})
afterEach(() => { act(() => { mounted.splice(0).forEach(x => x.unmount()) }) })

describe('BadgeFit change-this-day sheet', () => {
  it('shows the week once each as round buttons, and no day note', () => {
    setS({ id: 'u1', name: 'Mo' })
    dayOverrideSheet(todayISO())
    const host = renderTop()
    expect(texts(host, '.bf-day .sp-picks')[0]).toBe('ChestSquats')
    expect(host.textContent).not.toMatch(/note/i)
  })

  it('lists only the runs of the kind picked', () => {
    setS({ id: 'u1', name: 'Mo' })
    dayOverrideSheet(todayISO())
    const host = renderTop()
    const runs = () => texts(host, '.bf-day .list')[0]
    expect(runs()).toMatch(/Easy run, 30 min/)
    expect(runs()).not.toMatch(/4×4/)
    const vo2 = [...host.querySelectorAll('.sp-pick')].find(b => b.textContent === 'VO2 max')
    act(() => vo2.click())
    expect(runs()).toMatch(/4×4/)
    expect(runs()).not.toMatch(/Easy run/)
  })

  it('folds older routines once per name for a member', () => {
    setS({ id: 'u1', name: 'Mo' })
    dayOverrideSheet(todayISO())
    const host = renderTop()
    expect(host.textContent).not.toMatch(/Full Body Gym A/)
    const more = host.querySelector('.menu-more')
    act(() => more.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(texts(host, '.item .tt').filter(x => x === 'Full Body Gym A')).toHaveLength(1)
  })

  it('gives a guest no Other workouts', () => {
    setS(null)
    dayOverrideSheet(todayISO())
    expect(renderTop().querySelector('.menu-more')).toBe(null)
  })
})
