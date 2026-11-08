// Jarvis's voice: the most natural Australian male voice the device has, read out with the
// browser's own speech (no account, no cost, works offline). A generic Aussie bloke, never an
// imitation of any real person. The person can pick another voice; the choice is a fact about
// this device (its installed voices), so it stays in localStorage and does not sync.
//
// Best results: iPhone Settings → Accessibility → Spoken Content → Voices → English → Australian
// → download "Lee (Premium)" or "(Enhanced)". Edge has "William (Natural)", Australian English.

const KEY = 'badgefit_voice'
// Known Australian male voices across iOS/macOS, Windows/Edge and Android, best first.
const AU_MALE = ['lee', 'william', 'gordon', 'james', 'darren', 'duncan', 'ken', 'tim', 'neil']
// Female voices to skip when looking for a male one (a voice reports its language, not gender).
const FEMALE = ['karen', 'catherine', 'natasha', 'annette', 'carly', 'isabella', 'hayley', 'tina', 'elsie', 'freya', 'joanne', 'kim', 'tracey', 'samantha', 'serena', 'kate', 'moira', 'tessa', 'fiona', 'martha', 'sonia', 'libby', 'female', 'zira', 'hazel', 'susan']
const UK_MALE = ['daniel', 'arthur', 'oliver', 'ryan', 'george', 'thomas', 'male']

const low = v => `${v?.name || ''} ${v?.voiceURI || ''}`.toLowerCase()
const has = (v, words) => words.some(w => new RegExp(`\\b${w}\\b`).test(low(v)))
const quality = v => (/premium|natural|neural|enhanced|online/.test(low(v)) ? 3 : 0) + (v.localService === false ? 1 : 0)

/** Ranks a voice for Jarvis: higher is better, -1 for one that is not English. */
export function scoreVoice(v) {
  const lang = String(v?.lang || '').toLowerCase().replace('_', '-')
  if (!lang.startsWith('en')) return -1
  let s = 0
  if (lang === 'en-au') s += 50
  else if (lang === 'en-nz') s += 30
  else if (lang === 'en-gb') s += 15
  if (has(v, AU_MALE) && lang === 'en-au') s += 30
  else if (has(v, UK_MALE)) s += 12
  if (has(v, FEMALE)) s -= 40
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
 * Says `text` in Jarvis's voice. Resolves when it has finished (or failed), so a conversation
 * can listen again straight after. Returns false when the device cannot speak.
 */
export async function say(text, { onStart } = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  if (!synth || !text) return false
  const voice = pickVoice(await loadVoices(), savedVoice())
  synth.cancel()
  // Sentence by sentence: long utterances get cut off on some phones, and the gaps sound natural.
  const parts = String(text).replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [text]
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
      else u.lang = 'en-AU'
      u.rate = DELIVERY.rate; u.pitch = DELIVERY.pitch
      u.onend = next; u.onerror = () => end(false)
      if (i === 1) onStart?.()
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
export const stopSpeaking = () => { try { window.speechSynthesis?.cancel() } catch { /* none */ } stopCurrent?.() }
