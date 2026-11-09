// Hands-free Jarvis (BadgeFit): through the workout he listens for his name, so nothing needs a
// tap. "Jarvis, that's 20 kg, 4 reps" logs the set (and the rep-range call for the next set
// follows, or the next exercise after the last set); "Jarvis, skip rest", "Jarvis, swap to
// dumbbells", "Jarvis, wrap up". Saying only "Jarvis" gets a "Yeah?" and the next words count.
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

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
// Long listens: a gym set or a sentence with a pause in it should not be cut short.
const TIMING = { silenceMs: 1300, noSpeechMs: 20000, maxMs: 20000, endWaitMs: 1200 }
const wait = ms => new Promise(r => setTimeout(r, ms))
export const handsFreeAvailable = () => !!Recognition

let running = false, current = null

/** Starts listening for the rest of this workout. Call from a tap the first time. */
export function startHandsFree() {
  if (!Recognition) { useUI.getState().toast('This browser cannot listen. Use the 🎤 to type, or try Safari or Chrome.'); return }
  primeSpeech()
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
  let armedUntil = 0, failures = 0
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
      useUI.getState().toast('🎤 Tap the mic in your workout to let Jarvis listen')
      break
    }
    if (out.error) { failures++; await wait(Math.min(5000, 500 * failures)); continue }
    failures = 0
    if (!out.text) continue
    const { woke, rest } = splitWake(out.text)
    let said = null
    if (woke && rest) said = rest
    else if (woke) { armedUntil = Date.now() + 8000; await say('Yeah?'); continue }
    else if (Date.now() < armedUntil) said = out.text
    if (!said) continue
    armedUntil = 0
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
