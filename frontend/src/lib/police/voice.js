// Hayden's voice: one natural male voice, no options. In the phone app, the native voice that
// lowers your music while he talks. On the web, first choice is the server's voice
// (api/coach/tts.js, Gemini text-to-speech) played as an audio file, which iPhones play far more
// reliably than their own speech synthesis. Without it (another AI provider, offline, the phone
// app unpaired) the device's own speech reads it, with the most natural male voice
// the device has. Never an imitation of any real person.
//
import { pocketSay } from './pocket.js'
import { apiPostBlob, apiPostBlobInfo } from '../api.js'
import { spoken } from './spoken.js'
import { MOBILE as NATIVE } from '../mobile.js'
const KEY = 'badgefit_voice'
// The phone's own voice (the fallback): the most natural English voice the device has, a male one
// where there is a choice. No accent preferred: Hayden sounds like a natural AI voice.
const MALE = ['alex', 'aaron', 'evan', 'nathan', 'tom', 'reed', 'eddy', 'guy', 'davis', 'daniel', 'arthur', 'oliver', 'ryan', 'george', 'thomas', 'lee', 'william', 'gordon', 'james', 'fred', 'rishi', 'ralph', 'albert', 'bruce', 'junior', 'male']
// Female voices to skip when looking for a male one (a voice reports its language, not gender).
const FEMALE = ['karen', 'catherine', 'natasha', 'annette', 'carly', 'isabella', 'hayley', 'tina', 'elsie', 'freya', 'joanne', 'kim', 'tracey', 'samantha', 'serena', 'kate', 'moira', 'tessa', 'fiona', 'martha', 'sonia', 'libby', 'female', 'zira', 'hazel', 'susan', 'ava', 'allison', 'nicky', 'zoe', 'aria', 'jenny', 'victoria', 'kathy', 'vicki', 'veena', 'shelley', 'sandy', 'flo', 'grandma', 'princess', 'tara', 'nora', 'emma', 'amy', 'sara', 'sarah', 'olivia', 'michelle']

const low = v => `${v?.name || ''} ${v?.voiceURI || ''}`.toLowerCase()
const has = (v, words) => words.some(w => new RegExp(`\\b${w}\\b`).test(low(v)))
const quality = v => (/premium|natural|neural|enhanced|online|siri/.test(low(v)) ? 40 : 0) + (v.localService === false ? 5 : 0)

/** Ranks a voice for Hayden: higher is better, -1 for one that is not English. */
export function scoreVoice(v) {
  const lang = String(v?.lang || '').toLowerCase().replace('_', '-')
  if (!lang.startsWith('en')) return -1
  let s = lang === 'en-us' ? 10 : 5
  if (has(v, MALE)) s += 15
  if (has(v, FEMALE)) s -= 30
  return s + quality(v)
}

/** The voice to use: the saved choice if this device still has it, else the best ranked. */
export function pickVoice(voices, saved = null) {
  const list = (voices || []).filter(v => scoreVoice(v) >= 0)
  if (saved) { const v = list.find(x => x.voiceURI === saved || x.name === saved); if (v) return v }
  return list.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null
}

/** English voices for the picker, best first. */
export const voiceOptions = voices => (voices || []).filter(v => scoreVoice(v) >= 0).sort((a, b) => scoreVoice(b) - scoreVoice(a))

export function savedVoice() { try { return localStorage.getItem(KEY) } catch { return null } }
export function saveVoice(uri) { try { uri ? localStorage.setItem(KEY, uri) : localStorage.removeItem(KEY) } catch { /* private mode */ } }

/** The device's voices; some browsers fill the list only after a moment. */
export function loadVoices() {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!synth) return Promise.resolve([])
  const now = synth.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise(res => {
    const done = () => res(synth.getVoices())
    synth.addEventListener?.('voiceschanged', done, { once: true })
    setTimeout(done, 800)
  })
}

// A coach's delivery: a touch slower and lower than the default, short pauses between sentences.
export const DELIVERY = { rate: 0.97, pitch: 0.92 }

/**
 * Says `text` in Hayden's voice: one natural male voice, no options. Resolves when it has
 * finished (or failed), so a conversation can listen again straight after. Returns false when
 * nothing could be played.
 */
export async function say(text, opts = {}) {
  if (!text) return false
  text = spoken(text) // "Let's go", not "Let us go": how people talk (spoken.js)
  talking(+1)
  try { return await sayNow(text, opts) } finally { talking(-1) }
}

// Whether Hayden is talking right now, for hands-free listening (it must not hear itself).
let speakingCount = 0
const speakingFns = new Set()
const talking = d => { speakingCount = Math.max(0, speakingCount + d); speakingFns.forEach(f => { try { f(speakingCount > 0) } catch { /* a listener */ } }) }
export const isSpeaking = () => speakingCount > 0
/** Calls fn(true|false) whenever Hayden starts or stops talking; returns the unsubscribe. */
export function onSpeaking(fn) { speakingFns.add(fn); return () => speakingFns.delete(fn) }

async function sayNow(text, opts = {}) {
  // The phone app: the native voice (RestAlertPlugin.speak), which lowers Spotify or YouTube while
  // Hayden talks and brings it back up after, and plays with the silent switch on. A web page
  // cannot do that. It answers when the line starts, so the wait covers the time it takes.
  if (NATIVE) {
    const { speakNative } = await import('../rest-alert.js')
    // During a run or a gym session the pocket session says it: that one plays with the screen
    // locked (lib/police/pocket.js).
    if (await pocketSay(String(text)) || await speakNative(String(text), { lang: 'en-US', rate: 1, onSilent: true })) {
      opts.onStart?.()
      await new Promise(r => { nativeStop = () => r(false); setTimeout(r, speakMs(text) * 0.7) })
      nativeStop = null
      return true
    }
  }
  // First choice: the server's voice (api/coach/tts.js), played as an audio file. Safari plays a
  // file it has been allowed to play (primeSpeech, on a tap) far more reliably than it speaks.
  // `music`: music is playing (a run): the phone's own voice, which talks over it, rather than an
  // audio file, which a web page plays by stopping the music.
  if (!opts.music && Date.now() > serverOffUntil) {
    const blob = preloaded.get(String(text)) || await apiPostBlob('/api/coach/speak', { text: String(text) })
    if (blob && blob.size > 100) {
      const played = await playClip(blob, opts.onStart)
      if (played !== null) return played
    } else serverOffUntil = Date.now() + 60000 // not on this server, or down: the phone's voice for a minute
  }
  return sayOnDevice(text, opts)
}

// The one audio player for Hayden, unlocked by a tap (primeSpeech) and reused for every clip.
let player = null, serverOffUntil = 0, stopClip = null, unlocked = false, nativeStop = null
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='
function playerOf() {
  if (!player && typeof Audio !== 'undefined') { player = new Audio(); player.preload = 'auto'; player.setAttribute?.('playsinline', '') }
  return player
}

/** Plays one clip: true when it finished, false when stopped or broken, null when not allowed. */
function playClip(blob, onStart) {
  const a = playerOf()
  if (!a) return Promise.resolve(null)
  stopSpeaking()
  const url = URL.createObjectURL(blob)
  return new Promise(resolve => {
    let over = false, timer = null
    const end = v => { if (over) return; over = true; clearTimeout(timer); a.onended = a.onerror = null; if (stopClip === stop) stopClip = null; setTimeout(() => URL.revokeObjectURL(url), 1000); resolve(v) }
    const stop = () => { try { a.pause() } catch { /* gone */ } end(false) }
    stopClip = stop
    a.onended = () => end(true)
    a.onerror = () => end(false)
    a.src = url
    a.play().then(() => {
      onStart?.()
      // A clip that never says it ended (a stalled player) still lets the call go on.
      timer = setTimeout(() => end(true), (Number.isFinite(a.duration) && a.duration > 0 ? a.duration * 1000 : 60000) + 3000)
    }, () => end(null))
  })
}

/** The phone's own speech synthesis: the fallback when the server has no voice. */
async function sayOnDevice(text, { onStart } = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!synth || !text) return false
  const voice = pickVoice(await loadVoices())
  // iPhone Safari drops an utterance queued straight after cancel(), and can sit paused.
  if (synth.speaking || synth.pending) { synth.cancel(); await new Promise(r => setTimeout(r, 150)) }
  try { synth.resume() } catch { /* not paused */ }
  // Sentence by sentence: long utterances get cut off on some phones, and the gaps sound natural.
  // Sentence ends only: the dot in 22.5 kg is not one.
  const parts = String(text).replace(/\s+/g, ' ').match(/(?:[^.!?]|[.!?](?=\d))+[.!?]*/g) || [text]
  return new Promise(resolve => {
    let i = 0, timer = null, over = false
    const end = ok => { if (over) return; over = true; clearTimeout(timer); if (stopCurrent === stop) stopCurrent = null; resolve(ok) }
    const stop = () => end(false)
    stopCurrent = stop
    const next = () => {
      clearTimeout(timer)
      if (over) return
      if (i >= parts.length) return end(true)
      const part = parts[i++].trim()
      const u = new SpeechSynthesisUtterance(part)
      if (voice) { u.voice = voice; u.lang = voice.lang }
      else u.lang = 'en-US'
      u.rate = DELIVERY.rate; u.pitch = DELIVERY.pitch
      u.onend = next; u.onerror = () => end(false)
      if (i === 1) onStart?.()
      held.push(u); if (held.length > 20) held.shift() // a collected utterance never fires `end`
      synth.speak(u)
      // Some phones never fire `end`: move on after the time the sentence should take.
      timer = setTimeout(next, speakMs(part))
    }
    next()
  })
}

/** A generous guess at how long a sentence takes to say, for the watchdog above. */
export const speakMs = text => 2500 + String(text).split(/\s+/).length * 480

let stopCurrent = null
const held = []

/**
 * Call inside a tap. iPhone Safari only lets a page speak once speech has started from a tap, and
 * Hayden answers seconds later, after the server: a silent utterance now unlocks the voice for
 * the answer.
 */
export function primeSpeech() {
  // The audio player first: a silent clip played inside the tap unlocks it for the answer.
  const a = playerOf()
  if (a && (a.paused || a.ended) && !stopClip) { try { a.src = SILENT_WAV; a.play()?.then?.(() => { unlocked = true }, () => {}) } catch { /* nothing to unlock */ } }
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return
  try {
    synth.resume()
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    held.push(u)
    synth.speak(u)
  } catch { /* nothing to unlock */ }
}
export const stopSpeaking = () => { nativeStop?.(); stopClip?.(); try { window.speechSynthesis?.cancel() } catch { /* none */ } stopCurrent?.() }

/** primeSpeech once: for a listener on the first tap anywhere, so Hayden can talk in a workout. */
export function unlockOnce() { if (!unlocked) primeSpeech() }

// Lines fetched ahead of time (the beep test's "Level 7"), so they play the moment they are due.
const preloaded = new Map()
/** Fetches the server's clip for `text` now, for a say() that must not wait. */
export async function preloadSpeech(text) {
  const k = spoken(String(text))
  if (preloaded.has(k) || Date.now() <= serverOffUntil) return
  const blob = await apiPostBlob('/api/coach/speak', { text: k })
  if (blob && blob.size > 100) { preloaded.set(k, blob); if (preloaded.size > 40) preloaded.delete(preloaded.keys().next().value) }
}

/**
 * "Hear Hayden" (the BadgeFit hub): says one line and reports which voice it was, so a robotic
 * voice has a reason: { via: 'gemini' } or { via: 'phone', why }. Call from a tap.
 */
export async function voiceCheck(text) {
  text = spoken(text)
  primeSpeech()
  if (NATIVE) { await say(text); return { via: 'native' } }
  const r = await apiPostBlobInfo('/api/coach/speak', { text })
  if (r.blob && r.blob.size > 100) {
    serverOffUntil = 0
    talking(+1)
    try { const played = await playClip(r.blob); if (played !== null) return { via: 'gemini' } } finally { talking(-1) }
    await sayOnDevice(text)
    return { via: 'phone', why: 'this phone would not play the Gemini clip. Turn the silent switch off and try again.' }
  }
  await sayOnDevice(text)
  const why = r.status === 501 ? 'the AI Coach is not on Google Gemini.'
    : r.status === 503 ? 'the AI Coach is switched off on the server.'
      : r.status === 401 ? 'you are not signed in.'
        : r.status === 404 ? 'the server is on an older version. Run the update.'
          : r.status === 429 ? 'Hayden has talked a lot in the last 10 minutes.'
            : `the Gemini voice did not answer (${r.error || 'unknown'}).`
  return { via: 'phone', why }
}
