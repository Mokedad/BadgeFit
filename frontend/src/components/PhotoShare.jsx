// BadgeFit: "Photo with your workout". Take a photo (or choose one) and it becomes a story-size
// picture with the session's name, time and your countdown on it, handed to the phone's own share
// sheet (Instagram, WhatsApp, Messages...). Nothing is uploaded by BadgeFit.
import { useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { sharePhoto } from '../lib/police/share-card.js'
import { useUI } from '../store/useUI.js'

/** `session`: what cardModel takes ({ title, minutes, km, daysToTest, week, weeks }). */
export default function PhotoShare({ session, className = 'calm-share', label = 'Photo with your workout' }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const onFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try { await sharePhoto(session, file, m => useUI.getState().toast(m)) } finally { setBusy(false) }
  }
  return <>
    <button type="button" className={className} disabled={busy} onClick={() => input.current?.click()}><Icon name="camera" /> {busy ? 'Making your picture…' : label}</button>
    <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
  </>
}
