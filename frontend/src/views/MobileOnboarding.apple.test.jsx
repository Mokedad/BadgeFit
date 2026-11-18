// @vitest-environment happy-dom
// Sign in with Apple in the iPhone app: Apple's own sheet (AppleSignInPlugin), the token to the
// server, and the pairing code it answers with redeemed the usual way.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { _setLangState } from '../lib/i18n-core.js'

const cap = vi.hoisted(() => ({ platform: 'ios', available: true, signIn: null }))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => cap.platform, isPluginAvailable: () => cap.available, isNativePlatform: () => true },
  registerPlugin: () => ({ signIn: (...a) => cap.signIn(...a) }),
}))
import MobileOnboarding from './MobileOnboarding.jsx'

let root, host, calls
const appleButton = () => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continue with Apple')
const respond = (url, init) => {
  calls.push([url, init])
  if (url.endsWith('/api/config')) return { ok: true, json: async () => ({ social: [], appleNative: true }) }
  if (url.endsWith('/api/auth/apple/nonce')) return { ok: true, json: async () => ({ nonce: 'N.sig' }) }
  if (url.endsWith('/api/auth/apple/native')) return { ok: true, json: async () => ({ code: 'ABCD2345' }) }
  return { ok: false, json: async () => ({}) }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  _setLangState('en', null, null, null)
  useUI.setState({ sheets: [], toastMsg: '' })
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (url, init) => respond(String(url), init)))
  cap.platform = 'ios'; cap.available = true
  cap.signIn = vi.fn(async () => ({ idToken: 'id.tok.en', givenName: 'Sam' }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals() })

describe('Sign in with Apple in the BadgeFit app', () => {
  it('signs in with Apple\'s sheet and links the app with the code the server gives', async () => {
    const connectToServer = vi.fn(async () => {})
    useStore.setState({ connectToServer })
    await act(async () => root.render(<MobileOnboarding />))
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(appleButton()).toBeTruthy()
    // No password buttons beside it: Apple is the way in.
    expect([...host.querySelectorAll('button')].some(b => b.textContent.trim() === 'Log in')).toBe(false)
    await act(async () => { appleButton().click(); await new Promise(r => setTimeout(r, 0)) })
    expect(cap.signIn).toHaveBeenCalledWith({ nonce: 'N.sig' })
    const native = calls.find(([u]) => u.endsWith('/api/auth/apple/native'))
    expect(JSON.parse(native[1].body)).toEqual({ nonce: 'N.sig', idToken: 'id.tok.en', name: 'Sam' })
    expect(connectToServer).toHaveBeenCalledWith('app.badgefit.com.au', 'ABCD2345', expect.any(Function))
    expect(useUI.getState().toastMsg).toBe('Signed in')
  })

  it('says nothing when the sheet is closed', async () => {
    cap.signIn = vi.fn(async () => { throw Object.assign(new Error('closed'), { code: 'cancelled' }) })
    await act(async () => root.render(<MobileOnboarding />))
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    await act(async () => { appleButton().click(); await new Promise(r => setTimeout(r, 0)) })
    expect(useUI.getState().toastMsg).toBe('')
    expect(calls.some(([u]) => u.endsWith('/api/auth/apple/native'))).toBe(false)
  })

  it('is not offered off the iPhone', async () => {
    cap.platform = 'android'
    await act(async () => root.render(<MobileOnboarding />))
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(appleButton()).toBeFalsy()
  })
})
