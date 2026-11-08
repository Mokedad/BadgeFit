import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useJarvis, tapJarvis } from './useJarvis.js'

describe('useJarvis', () => {
  beforeEach(() => useJarvis.getState().end())
  it('a tap starts the call, the next taps go to it, end stops it', () => {
    tapJarvis()
    expect(useJarvis.getState()).toMatchObject({ active: true, panel: false })
    const tap = vi.fn()
    useJarvis.setState({ tap })
    tapJarvis()
    expect(tap).toHaveBeenCalledTimes(1)
    useJarvis.getState().end()
    expect(useJarvis.getState()).toMatchObject({ active: false, tap: null })
  })
})
