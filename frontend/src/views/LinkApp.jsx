// "Link the BadgeFit app" (BadgeFit, the website): the phone app opens this page in the browser,
// you sign in here the usual way (Google, Apple or a password), and one tap hands the app its
// pairing code through a badgefit:// link, so nothing is typed. The code is the same one
// Settings → Account → "Pair the mobile app" makes (/api/pair/create).
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { api, appBase } from '../lib/api.js'
import BadgeLogo from '../components/BadgeLogo.jsx'
import '../police.css'

const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) })
export const LINK_FLAG = 'badgefit_link_app'
export const appLink = code => `badgefit://pair?code=${encodeURIComponent(code)}`

export default function LinkApp() {
  const config = useStore(s => s.config)
  const [code, setCode] = useState(null)
  const [need, setNeed] = useState(null) // 'social' | 'password' | 'other'
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const make = async proof => {
    setErr('')
    try {
      const r = await post('/api/pair/create', proof || {})
      try { sessionStorage.removeItem(LINK_FLAG) } catch { /* private mode */ }
      setCode(r.code); setNeed(null)
      // Straight back into the app; the button below is there when the browser asks first.
      setTimeout(() => { try { window.location.href = appLink(r.code) } catch { /* the button does it */ } }, 300)
    } catch (e) {
      // The server's reason rides in the answer's body (lib/api.js puts it on e.data).
      const why = e?.data?.code || e?.code
      if (why === 'social-required') setNeed('social')
      else if (why === 'current-required') setNeed('password')
      else if (why === 'current-wrong') { setNeed('password'); setErr('That password is not right.') }
      else { setNeed('other'); setErr(e?.message || 'Could not make a code. Try again.') }
    }
  }
  useEffect(() => { make() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const again = p => { try { sessionStorage.setItem(LINK_FLAG, '1') } catch { /* private mode */ } window.location.href = appBase().replace(/\/$/, '') + '/api/auth/' + p }
  const social = config?.social || []
  return <div className="login-simple-bg"><div className="narrow login-simple">
    <div className="ls-shield"><BadgeLogo size={84} /></div>
    <h1 className="bf-word">Badge<span>Fit</span></h1>
    {code ? <>
      <p className="ls-tag">You are signed in. One tap takes you back to the app.</p>
      <a className="ls-btn ls-primary" href={appLink(code)}>Open the BadgeFit app</a>
      <p className="ls-fine">If nothing happens, tap the button again. It works for 5 minutes.</p>
      <button className="ls-link" onClick={() => make()}>Make a new code</button>
    </> : need === 'social' ? <>
      <p className="ls-tag">Confirm it is you to link the app.</p>
      {social.includes('google') && <button className="ls-btn ls-google" onClick={() => again('google')}><span className="ls-g" aria-hidden="true">G</span> Confirm with Google</button>}
      {social.includes('apple') && <button className="ls-btn ls-apple" onClick={() => again('apple')}>Confirm with Apple</button>}
    </> : need === 'password' ? <>
      <p className="ls-tag">Enter your password to link the app.</p>
      <input className="input" type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} />
      <button className="ls-btn ls-primary" onClick={() => make({ current: pw })}>Link the app</button>
    </> : need === 'other' ? <button className="ls-btn ls-primary" onClick={() => make()}>Try again</button>
      : <p className="ls-tag">Linking your app…</p>}
    {err && <p className="ls-fine" role="alert" style={{ color: '#ffb4a8' }}>{err}</p>}
  </div></div>
}
