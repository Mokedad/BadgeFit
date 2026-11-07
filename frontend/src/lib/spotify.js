// Music in the app (BadgeFit): Spotify, two ways.
//
// 1. The embed: any playlist, album or track link plays in Spotify's own embedded player, with
//    no account connection. Full tracks when the browser is logged in to Spotify, previews if not.
// 2. Connect (Web API, Authorization Code with PKCE, no client secret): remote control of the
//    Spotify app already playing on a device (play, pause, skip, start a playlist). Needs Spotify
//    Premium and a Spotify developer app's Client ID (VITE_SPOTIFY_CLIENT_ID at build time, or
//    typed in on the device). The redirect lands back on this page with ?code=…, which
//    completeLogin() picks up at start (main.jsx).
//
// Everything here stays on the device (localStorage): music tokens are never synced to the
// server or to other devices. Every storage access is guarded; a private window just forgets.

const PREFS = 'badgefit_music'
const TOKEN = 'badgefit_spotify_token'
const PENDING = 'badgefit_spotify_pkce'
export const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing'
const ACCOUNTS = 'https://accounts.spotify.com'
const API = 'https://api.spotify.com/v1'

const load = k => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
const save = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

export const musicPrefs = () => load(PREFS) || {}
export const setMusicPrefs = patch => save(PREFS, { ...musicPrefs(), ...patch })

/** The Client ID in use: the device's own, else the build's. */
export const clientId = () => musicPrefs().clientId || import.meta.env?.VITE_SPOTIFY_CLIENT_ID || ''

// --- the embed ---------------------------------------------------------------------------

/**
 * A Spotify link (https://open.spotify.com/playlist/…, …/intl-xx/album/…, spotify:track:…) as
 * { type, id, uri, embed }, or null for anything that is not one.
 */
export function parseSpotifyLink(link) {
  const s = String(link || '').trim()
  let m = /^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]{10,40})$/.exec(s)
  if (!m) m = /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]{10,40})(?:[/?#].*)?$/.exec(s)
  if (!m) return null
  const [, type, id] = m
  return { type, id, uri: `spotify:${type}:${id}`, embed: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0` }
}

// --- PKCE login --------------------------------------------------------------------------

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function randomVerifier(len = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const rnd = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(rnd, b => chars[b % chars.length]).join('')
}

export async function challengeFor(verifier) {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
}

/** Where Spotify sends the user back: this page, without query or hash. */
export const redirectUri = (loc = location) => loc.origin + loc.pathname

export function authorizeUrl({ client, redirect, challenge, state }) {
  const q = new URLSearchParams({
    response_type: 'code', client_id: client, scope: SCOPES, redirect_uri: redirect,
    code_challenge_method: 'S256', code_challenge: challenge, state,
  })
  return `${ACCOUNTS}/authorize?${q}`
}

/** Starts the login: remembers the verifier and where to come back to, then leaves the page. */
export async function startLogin(returnHash = '#/police') {
  const client = clientId()
  if (!client) throw new Error('No Spotify Client ID')
  const verifier = randomVerifier()
  const state = randomVerifier(16)
  save(PENDING, { verifier, state, returnHash, redirect: redirectUri() })
  location.assign(authorizeUrl({ client, redirect: redirectUri(), challenge: await challengeFor(verifier), state }))
}

const storeToken = (data, prev = {}) => {
  const tok = {
    access: data.access_token,
    refresh: data.refresh_token || prev.refresh,
    expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60000,
  }
  save(TOKEN, tok)
  return tok
}

async function tokenRequest(body) {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body),
  })
  if (!res.ok) throw new Error('Spotify login failed (' + res.status + ')')
  return res.json()
}

/**
 * If this page load is Spotify's redirect (?code=…&state=… matching a login this device
 * started), trades the code for tokens, cleans the address bar and goes back to where the login
 * began. Returns true when it did. Never throws: a stale or foreign redirect is just ignored.
 */
export async function completeLogin(loc = location, hist = history) {
  try {
    const q = new URLSearchParams(loc.search)
    const code = q.get('code'), state = q.get('state'), err = q.get('error')
    const pending = load(PENDING)
    if (!pending || (!code && !err) || state !== pending.state) return false
    save(PENDING, null)
    hist.replaceState(null, '', loc.pathname + (pending.returnHash || '#/police'))
    if (err) return false
    storeToken(await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: pending.redirect, client_id: clientId(), code_verifier: pending.verifier }))
    return true
  } catch { return false }
}

export const isConnected = () => !!load(TOKEN)?.refresh || !!load(TOKEN)?.access
export const disconnect = () => save(TOKEN, null)

async function accessToken() {
  const tok = load(TOKEN)
  if (!tok) return null
  if (tok.access && tok.expires > Date.now()) return tok.access
  if (!tok.refresh) return null
  try {
    return storeToken(await tokenRequest({ grant_type: 'refresh_token', refresh_token: tok.refresh, client_id: clientId() }), tok).access
  } catch { disconnect(); return null }
}

// --- remote control ----------------------------------------------------------------------

async function api(method, path, body) {
  const token = await accessToken()
  if (!token) return { ok: false, status: 401 }
  const res = await fetch(API + path, {
    method, headers: { Authorization: 'Bearer ' + token, ...(body && { 'Content-Type': 'application/json' }) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return { ok: true, status: 204, data: null }
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

/** What is playing now: { playing, track, artist, art, device } or null (nothing active). */
export async function nowPlaying() {
  const r = await api('GET', '/me/player')
  return r.ok ? readPlayer(r.data) : null
}

export function readPlayer(data) {
  if (!data || !data.item) return data?.device ? { playing: false, track: null, artist: '', art: null, device: data.device.name } : null
  const it = data.item
  return {
    playing: !!data.is_playing,
    track: it.name,
    artist: (it.artists || []).map(a => a.name).join(', ') || it.show?.name || '',
    art: it.album?.images?.at(-1)?.url || it.images?.at(-1)?.url || null,
    device: data.device?.name || '',
  }
}

export const play = uri => api('PUT', '/me/player/play', uri ? { context_uri: uri } : undefined)
export const pause = () => api('PUT', '/me/player/pause')
export const next = () => api('POST', '/me/player/next')
export const previous = () => api('POST', '/me/player/previous')
