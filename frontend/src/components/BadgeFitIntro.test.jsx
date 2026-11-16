// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import BadgeFitIntro from './BadgeFitIntro.jsx'
import { presetOf } from '../lib/modules.js'
import { useStore } from '../store/useStore.js'
import { readTour, openTour, tourState } from '../lib/tour.js'

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  try { localStorage.clear() } catch { /* none */ }
  openTour({ kind: 'offer' })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('BadgeFitIntro', () => {
  it('is five slides, no how-much-app choice, and turns everything on', () => {
    act(() => root.render(<BadgeFitIntro />))
    expect(host.querySelectorAll('.bfi-slide').length).toBe(5)
    expect(host.textContent).not.toContain('Simple')
    expect(presetOf(useStore.getState().S)).toBe('all')
  })
  it("Let's go closes it for good", () => {
    act(() => root.render(<BadgeFitIntro />))
    const go = [...host.querySelectorAll('button')].find(b => b.textContent === "Let's go")
    act(() => go.click())
    expect(readTour().done).toBeTruthy()
    expect(tourState()).toBeNull()
  })
})
