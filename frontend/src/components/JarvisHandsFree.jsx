// Hands-free Hayden (BadgeFit): through the workout he listens for his name, so nothing needs a
// tap. "Hayden, that's 20 kg, 4 reps" logs the set (and the rep-range call for the next set
// follows, or the next exercise after the last set); "Hayden, skip rest", "Hayden, swap to
// dumbbells", "Hayden, wrap up" ("Hey" or "H" first works too, lib/police/wake-word.js). Saying only "Hayden" gets a short beep (not a spoken "Yeah?",
// which stopped the listening and lost the weight said over it) and the next words count. A
// weight heard alone ("55 kg", cut off by a pause) waits for the reps that follow.
// Anything else said to him is a question for the coach. Words not said to him are ignored, and
// he stops listening while he talks so he never hears himself.
//
// Turned on with one tap on the workout's 🎤 (a browser lets a page open the microphone only
// from a tap); remembered, so the next workout starts listening on its own where the phone
// allows it. Mounted once in App.
import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { useJarvis } from '../store/useJarvis.js'
import { listenOnce } from '../lib/police/listen.js'
import { splitWake } from '../lib/police/wake-word.js'
import { say, isSpeaking, onSpeaking, primeSpeech } from '../lib/police/voice.js'
import { runCommand } from './jarvis-actions.js'
import { tonePlayer } from '../lib/police/tones.js'
import { parseCommand } from '../lib/police/voice-commands.js'

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
// Long listens: a gym set or a sentence with a pause in it should not be cut short.
const TIMING = { silenceMs: 1800, noSpeechMs: 20000, maxMs: 20000, endWaitMs: 1200 }
const wait = ms => new Promise(r => setTimeout(r, ms))
export const handsFreeAvailable = () => !!Recognition

let running = false, current = null, beep = null
const ping = () => { try { beep?.play() } catch { /* no audio */ } }

/** Starts listening for the rest of this workout. Call from a tap the first time. */
export function startHandsFree() {
  if (!Recognition) { useUI.getState().toast('This browser cannot listen. Use the 🎤 to type, or try Safari or Chrome.'); return }
  primeSpeech()
  if (!beep) { beep = tonePlayer({ freq: 1046, ms: 120, volume: 0.5 }); beep.unlock() }
  useJarvis.setState({ handsFree: true })
  useStore.getState().update(s => { s.police = { ...s.police, handsFree: true } })
  if (!running) loop()
}

/** Stops listening (and remembers that, for the next workout). */
export function stopHandsFree(remember = true) {
  useJarvis.setState({ handsFree: false })
  current?.cancel()
  if (remember) useStore.getState().update(s => { s.police = { ...s.police, handsFree: false } })
}

async function loop() {
  running = true
  let armedUntil = 0, failures = 0, held = '', armedShort = false
  while (useJarvis.getState().handsFree) {
    const S = useStore.getState().S
    if (!S.active) { stopHandsFree(false); break }
    if (document.hidden || useJarvis.getState().active || isSpeaking()) { await wait(400); continue }
    const l = listenOnce(Recognition, { timing: TIMING })
    current = l
    const off = onSpeaking(on => { if (on) l.cancel() })
    const out = await l.done
    off(); current = null
    if (!useJarvis.getState().handsFree) break
    if (out.error === 'not-allowed' || out.error === 'service-not-allowed') {
      stopHandsFree(false)
      useUI.getState().toast('🎤 Tap the mic in your workout to let Hayden listen')
      break
    }
    if (out.error) { failures++; await wait(Math.min(5000, 500 * failures)); continue }
    failures = 0
    if (!out.text) {
      // The reps never came: log the weight held with the reps already filled in.
      if (held && Date.now() > armedUntil) { const line = await runCommand(`${held} done`); held = ''; if (line) await say(line) }
      continue
    }
    const { woke, rest, short } = splitWake(out.text)
    let said = null
    // "Hey, how are you" to a mate is not for Hayden: after a bare "Hey" or "H" only a workout
    // command counts (his name still takes a question for the coach).
    if (woke && rest && short && !parseCommand(rest)) continue
    if (woke && rest) said = rest
    else if (woke) { armedUntil = Date.now() + 8000; armedShort = !!short; ping(); continue }
    else if (Date.now() < armedUntil) { if (armedShort && !parseCommand(out.text)) continue; said = out.text }
    if (!said) continue
    armedUntil = 0
    if (held) { said = `${held} ${said}`; held = '' }
    // Only a weight, the reps cut off by a pause: keep it and listen for the rest.
    const c = parseCommand(said)
    if (c?.type === 'set' && c.weight != null && c.reps == null && !/\b(done|log|that'?s it)\b/.test(said)) {
      held = said; armedUntil = Date.now() + 8000; ping(); continue
    }
    const line = await runCommand(said)
    if (line == null) { useJarvis.setState({ question: said }); useJarvis.getState().start() } // a question: the coach answers
    else if (line) await say(line)
  }
  running = false
}

export default function JarvisHandsFree() {
  useEffect(() => useStore.subscribe((st, prev) => {
    const A = st.S.active, B = prev.S.active
    // A new workout with hands-free on last time: listen again (the start was a tap).
    if (A && (!B || A.start !== B.start) && !A.backfill && st.S.police?.level && st.S.police?.handsFree && Recognition) {
      useJarvis.setState({ handsFree: true })
      if (!running) loop()
    }
    if (!A && B && useJarvis.getState().handsFree) stopHandsFree(false)
  }), [])
  return null
}
