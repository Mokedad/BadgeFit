// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseSpotifyLink, authorizeUrl, challengeFor, randomVerifier, completeLogin, readPlayer, musicPrefs, setMusicPrefs, isConnected } from './spotify.js'

describe('parseSpotifyLink', () => {
  it('reads web links, intl links and URIs', () => {
    expect(parseSpotifyLink('https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP?si=abc')).toEqual({
      type: 'playlist', id: '37i9dQZF1DX76Wlfdnj7AP', uri: 'spotify:playlist:37i9dQZF1DX76Wlfdnj7AP',
      embed: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX76Wlfdnj7AP?utm_source=generator&theme=0',
    })
    expect(parseSpotifyLink('https://open.spotify.com/intl-de/album/4aawyAB9vmqN3uQ7FjRGTy').type).toBe('album')
    expect(parseSpotifyLink('spotify:track:4cOdK2wGLETKBW3PvgPWqT').uri).toBe('spotify:track:4cOdK2wGLETKBW3PvgPWqT')
  })
  it('refuses anything else', () => {
    expect(parseSpotifyLink('https://evil.example/playlist/37i9dQZF1DX76Wlfdnj7AP')).toBeNull()
    expect(parseSpotifyLink('https://open.spotify.com.evil.example/playlist/37i9dQZF1DX76Wlfdnj7AP')).toBeNull()
    expect(parseSpotifyLink('')).toBeNull()
  })
})

describe('PKCE', () => {
  it('makes the RFC 7636 challenge', async () => {
    // RFC 7636 appendix B
    expect(await challengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
    expect(randomVerifier()).toMatch(/^[A-Za-z0-9\-._~]{64}$/)
  })
  it('builds the authorize URL', () => {
    const u = new URL(authorizeUrl({ client: 'abc', redirect: 'https://app.example/', challenge: 'ch', state: 'st' }))
    expect(u.origin + u.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(u.searchParams.get('code_challenge_method')).toBe('S256')
    expect(u.searchParams.get('scope')).toContain('user-modify-playback-state')
  })
})

describe('completeLogin', () => {
  beforeEach(() => localStorage.clear())
  it('ignores a page load that is not its redirect', async () => {
    expect(await completeLogin({ search: '?code=x&state=y', pathname: '/' }, { replaceState: vi.fn() })).toBe(false)
  })
  it('trades the code when the state matches, and cleans the URL', async () => {
    localStorage.setItem('badgefit_spotify_pkce', JSON.stringify({ verifier: 'v', state: 'st', returnHash: '#/police', redirect: 'https://a/' }))
    setMusicPrefs({ clientId: 'cid' })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ access_token: 'A', refresh_token: 'R', expires_in: 3600 }) })
    const hist = { replaceState: vi.fn() }
    expect(await completeLogin({ search: '?code=c&state=st', pathname: '/' }, hist)).toBe(true)
    expect(hist.replaceState).toHaveBeenCalledWith(null, '', '/#/police')
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('code_verifier=v')
    expect(isConnected()).toBe(true)
    fetchMock.mockRestore()
  })
})

describe('readPlayer', () => {
  it('reads the track and device', () => {
    expect(readPlayer({ is_playing: true, device: { name: 'iPhone' }, item: { name: 'Song', artists: [{ name: 'A' }, { name: 'B' }], album: { images: [{ url: 'big' }, { url: 'small' }] } } }))
      .toEqual({ playing: true, track: 'Song', artist: 'A, B', art: 'small', device: 'iPhone' })
    expect(readPlayer(null)).toBeNull()
  })
  it('keeps prefs on the device', () => {
    localStorage.clear()
    setMusicPrefs({ link: 'x' })
    expect(musicPrefs()).toEqual({ link: 'x' })
  })
})
