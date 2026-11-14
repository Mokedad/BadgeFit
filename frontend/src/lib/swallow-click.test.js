// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { swallowNextClick } from './swallow-click.js'

describe('the tap after a hold', () => {
  it('is swallowed once, and only for a moment', () => {
    vi.useFakeTimers()
    const seen = vi.fn(); document.body.addEventListener('click', seen)
    swallowNextClick(500)
    document.body.click(); expect(seen).toHaveBeenCalledTimes(0)
    document.body.click(); expect(seen).toHaveBeenCalledTimes(1)
    swallowNextClick(500); vi.advanceTimersByTime(600)
    document.body.click(); expect(seen).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
