// Music without leaving the app (BadgeFit): the Spotify embed for a saved playlist, and, once
// the account is connected, remote controls for whatever device Spotify is playing on.
// lib/spotify.js holds the logic; English only, like the BadgeFit hub.
import { useEffect, useState } from 'react'
import { MOBILE } from '../lib/mobile.js'
import { musicPrefs, setMusicPrefs, parseSpotifyLink, clientId, startLogin, isConnected, disconnect, nowPlaying, play, pause, next, previous } from '../lib/spotify.js'
import { useUI } from '../store/useUI.js'
import { Button, TextField } from './ui.jsx'
import '../police.css'

const toast = m => useUI.getState().toast(m)

function Remote({ link }) {
  const [np, setNp] = useState(null)
  const refresh = () => nowPlaying().then(setNp).catch(() => setNp(null))
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [])
  const act = async (fn, arg) => {
    const r = await fn(arg).catch(() => ({ ok: false }))
    if (r.status === 404) toast('Open Spotify on your phone or speaker first, then try again')
    else if (r.status === 403) toast('Remote control needs Spotify Premium')
    else if (!r.ok) toast('Spotify did not respond')
    setTimeout(refresh, 600)
  }
  return <div className="mb-remote">
    {np?.art && <img src={np.art} alt="" width="44" height="44" />}
    <div className="mb-np">
      <b>{np?.track || 'Nothing playing'}</b>
      <span>{np?.track ? np.artist : np?.device ? `Ready on ${np.device}` : 'Start Spotify on any device'}</span>
    </div>
    <div className="mb-ctl">
      <button aria-label="Previous" onClick={() => act(previous)}>⏮</button>
      <button aria-label={np?.playing ? 'Pause' : 'Play'} className="mb-play"
        onClick={() => act(np?.playing ? pause : play, np?.track ? undefined : link?.uri)}>{np?.playing ? '⏸' : '▶'}</button>
      <button aria-label="Next" onClick={() => act(next)}>⏭</button>
    </div>
  </div>
}

/** compact: the one-line version for the workout screen (no setup there, only playing). */
export default function MusicBar({ compact = false }) {
  const [prefs, setPrefs] = useState(musicPrefs)
  const [draft, setDraft] = useState(prefs.link || '')
  const [cid, setCid] = useState(prefs.clientId || '')
  const [connected, setConnected] = useState(isConnected)
  const link = parseSpotifyLink(prefs.link)
  const savePrefs = patch => { setMusicPrefs(patch); setPrefs(musicPrefs()) }

  if (compact) {
    if (!link && !connected) return null
    return <div className="mb mb-compact">
      {connected ? <Remote link={link} /> : <iframe title="Spotify" src={link.embed} height="80" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />}
    </div>
  }

  return <div className="card mb">
    <h3>Music</h3>
    {connected && <Remote link={link} />}
    {link && !connected && <iframe title="Spotify" src={link.embed} height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />}
    <label className="mb-l">Your training playlist (Spotify link)
      <div className="mb-row">
        <TextField value={draft} placeholder="https://open.spotify.com/playlist/…" onChange={e => setDraft(e.target.value)} />
        <Button size="sm" variant="primary" onClick={() => {
          if (!draft.trim()) { savePrefs({ link: '' }); return }
          if (!parseSpotifyLink(draft)) { toast('That is not a Spotify playlist, album or track link'); return }
          savePrefs({ link: draft.trim() }); toast('Playlist saved. It shows on your workout screen too.')
        }}>Save</Button>
      </div>
    </label>
    <p className="pf-sub">In Spotify: ⋯ on a playlist → Share → Copy link. It plays right here and on the workout screen, so you never have to leave mid-set.</p>
    {connected
      ? <Button size="sm" onClick={() => { disconnect(); setConnected(false) }}>Disconnect Spotify</Button>
      : MOBILE
        ? <p className="pf-sub">Remote control from the phone app is coming. For now, log in to Spotify once in the player above for full songs.</p>
        : <details className="pf-more"><summary>Connect your Spotify account (Premium)</summary>
          <p className="pf-sub">Play, pause and skip on any device without leaving the app. One-time setup: create a free app at developer.spotify.com, add this redirect URI, and paste its Client ID here.</p>
          <p className="pf-sub mb-uri">{location.origin + location.pathname}</p>
          {!import.meta.env?.VITE_SPOTIFY_CLIENT_ID && <TextField value={cid} placeholder="Client ID" onChange={e => setCid(e.target.value.trim())} />}
          <Button size="sm" variant="primary" onClick={() => {
            if (cid) savePrefs({ clientId: cid })
            if (!clientId()) { toast('Add the Client ID first'); return }
            startLogin(location.hash || '#/police').catch(() => toast('Could not start the Spotify login'))
          }}>Connect Spotify</Button>
        </details>}
  </div>
}
