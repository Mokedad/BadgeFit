// @vitest-environment happy-dom
// BadgeFit's "change this day" sheet: this week's sessions as round buttons (once each), the
// kinds of training (body parts, full body, runs) as round buttons with only the picked kind's
// workouts listed (members only), and rest. No day notes.
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

  const kind = (host, label) => [...host.querySelectorAll('.sp-pick')].filter(b => b.textContent === label).at(-1)

  it('lists nothing until a kind is picked, then only that kind', () => {
    setS({ id: 'u1', name: 'Mo' })
    dayOverrideSheet(todayISO())
    const host = renderTop()
    expect(host.querySelector('.tl-list')).toBe(null)
    act(() => kind(host, 'Intervals').click())
    const list = () => host.querySelector('.tl-list').textContent
    expect(list()).toMatch(/4×4/)
    expect(list()).not.toMatch(/Easy run/)
    act(() => kind(host, 'Legs').click())
    expect(list()).toMatch(/Squats & Push Power/)
    expect(list()).not.toMatch(/4×4/)
  })

  it('offers a full body session, once per name', () => {
    setS({ id: 'u1', name: 'Mo' })
    dayOverrideSheet(todayISO())
    const host = renderTop()
    act(() => kind(host, 'Full body').click())
    expect(texts(host, '.tl-list .tt')).toEqual(['Full Body Gym A'])
  })

  it('keeps a guest to the plan: no second row', () => {
    setS(null)
    dayOverrideSheet(todayISO())
    const host = renderTop()
    expect(texts(host, '.sp-picks')).toEqual(['ChestSquats'])
    expect(kind(host, 'Intervals')).toBe(undefined)
  })
})
