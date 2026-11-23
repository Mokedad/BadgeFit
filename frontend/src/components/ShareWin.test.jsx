// @vitest-environment happy-dom
// A win goes to Community once (components/ShareWin.jsx): the tick is remembered per share.
import { describe, expect, it, beforeEach } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { markShared, unmarkShared, sharedId, shareWin } from './ShareWin.jsx'

const clone = v => JSON.parse(JSON.stringify(v))

describe('shared once', () => {
  beforeEach(() => { useStore.setState({ S: { ...clone(DEF), police: { level: 'beginner' } }, user: { id: 'u1' } }) })

  it('remembers what was posted and forgets it on Undo', () => {
    expect(sharedId('day:2026-11-23:Easy run')).toBe(null)
    markShared('day:2026-11-23:Easy run', 'p1')
    expect(sharedId('day:2026-11-23:Easy run')).toBe('p1')
    unmarkShared('day:2026-11-23:Easy run')
    expect(sharedId('day:2026-11-23:Easy run')).toBe(null)
  })

  it('keeps only the last 40', () => {
    for (let i = 0; i < 45; i++) markShared('k' + i, 'p' + i)
    const sh = useStore.getState().S.police.shared
    expect(Object.keys(sh).length).toBe(40)
    expect(sh.k0).toBeUndefined()
    expect(sh.k44).toBe('p44')
  })

  it('will not open the share again for something already posted', () => {
    markShared('passed', 'p9')
    expect(shareWin('I passed!', 'win', 'passed')).toBe(false)
  })
})
