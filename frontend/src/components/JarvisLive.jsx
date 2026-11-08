// Talk to Jarvis, live (BadgeFit): voice only, no pop-up. Speak, Jarvis answers out loud in an
// Australian voice (lib/police/voice.js), then listens again, like a call. Nothing is shown as
// text and nothing is saved to the chat: the button that started the call shows what is happening
// (store/useJarvis.js, components/JarvisOrb.jsx). Speech recognition is the browser's own
// (lib/police/listen.js); where it is missing or blocked, a small card lets you type instead. The answer comes from the
// app's AI Coach (lib/coach-api.js askCoach), which answers as Jarvis for a BadgeFit member
// (api/coach/prompts/ask.md). English only, like the BadgeFit hub.
import { useEffect, useRef, useState } from 'react'
import { askCoach, coachStatus, resolvePending, jobErrorText, isDeclined, JOB_ERRORS } from '../lib/coach-api.js'
import { say, stopSpeaking } from '../lib/police/voice.js'
import { useJarvis } from '../store/useJarvis.js'
import { useUI } from '../store/useUI.js'
import { listenOnce } from '../lib/police/listen.js'
import '../police.css'

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
const POLL_MS = 1500
// The server has no AI connected yet: say who can fix it and where.
const OFF_TEXT = 'Jarvis is not switched on on this server yet. The admin opens Settings → Account → Admin dashboard → AI Coach, adds an AI key and taps Test.'
const MAX_WAIT_MS = 120000

/** Waits for the answer to the question just asked: the `ask` proposal, or the job's failure. */
async function waitForAnswer(cancelled) {
  const t0 = Date.now()
  let sawJob = false
  while (!cancelled() && Date.now() - t0 < MAX_WAIT_MS) {
    const s = await coachStatus().catch(() => null)
    if (s?.pending?.kind === 'ask' && !s.job) return { answer: String(s.pending.answer || ''), id: s.pending.id }
    if (s?.job) sawJob = true
    else if (sawJob || Date.now() - t0 > 6000) {
      const cls = s?.lastError?.errorClass || (s?.last?.outcome === 'failed' ? (s.last.errorClass || 'internal') : null)
      if (cls) return { error: jobErrorText(cls, s?.lastError?.detail) }
    }
    await new Promise(r => setTimeout(r, POLL_MS))
  }
  return cancelled() ? null : { error: 'Jarvis took too long to answer. Try again in a moment.' }
}

/**
 * The call. Runs while `useJarvis().active`; shows nothing of its own (the button that started it
 * shows the phase) unless typing is needed, then a small card with a text box.
 */
export default function JarvisLive() {
  const phase = useJarvis(s => s.phase)
  const panel = useJarvis(s => s.panel)
  const setPhase = p => useJarvis.setState({ phase: p })
  const [note, setNote] = useState('')
  const [typed, setTyped] = useState('')
  const rec = useRef(null), closed = useRef(false), phaseRef = useRef('idle')
  phaseRef.current = phase

  useEffect(() => {
    if (Recognition) listen() // opened with a tap: start listening straight away
    else useJarvis.setState({ panel: true })
    return () => { closed.current = true; rec.current?.cancel(); stopSpeaking() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // A problem is said out loud and shown for a moment; the call waits for a tap.
  const problem = text => { setNote(text); setPhase('idle'); useUI.getState().toast(text); say(text) }

  const listen = async () => {
    if (!Recognition) return
    stopSpeaking()
    setNote('')
    setPhase('listening')
    const l = listenOnce(Recognition, {})
    rec.current = l
    const out = await l.done
    if (rec.current === l) rec.current = null
    if (closed.current) return
    if (out.error === 'not-allowed' || out.error === 'service-not-allowed') {
      setPhase('idle')
      setNote('Microphone blocked. Allow it in Settings → Safari → Microphone, or type.')
      useJarvis.setState({ panel: true }); return
    }
    if (out.text) { ask(out.text); return }
    setPhase('idle') // nothing heard: rest until the next tap
    if (out.error) { setNote('Voice did not work just now. Type instead.'); useJarvis.setState({ panel: true }) }
  }

  const ask = async text => {
    setNote('')
    setPhase('thinking')
    try {
      await askCoach(text)
      const r = await waitForAnswer(() => closed.current)
      if (!r || closed.current) return
      if (r.error) { problem(r.error); return }
      resolvePending({ accepted: ['ask'] }).catch(() => {})
      setPhase('speaking')
      await say(r.answer)
      if (closed.current) return
      if (Recognition && !useJarvis.getState().panel) listen(); else setPhase('idle')
    } catch (e) {
      if (isDeclined(e)) { setPhase('idle'); return }
      problem(e?.data?.code === 'off' ? OFF_TEXT : JOB_ERRORS[e?.data?.code] || e?.message || 'Jarvis could not be reached.')
    }
  }

  // The button's tap while the call runs.
  useEffect(() => {
    useJarvis.setState({ tap: () => {
      const p = phaseRef.current
      if (p === 'listening') rec.current?.finish()
      else if (p === 'speaking') { stopSpeaking(); setPhase('idle') }
      else if (p === 'idle') listen()
    } })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!panel) return null
  const label = { idle: 'Type to ask', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Talking…' }[phase]
  return <div className="jl jl-v jl-t" role="dialog" aria-label="Type to Jarvis">
    <div className="jl-top">
      <b>Jarvis</b>
      {Recognition && <button className="jl-ic" onClick={() => useJarvis.setState({ panel: false })} aria-label="Back to voice" title="Back to voice">🎤</button>}
      <button className="jl-ic" onClick={() => useJarvis.getState().end()} aria-label="End" title="End">✕</button>
    </div>
    <div className="jl-state" aria-live="polite">{note || label}</div>
    <form className="jl-type" onSubmit={e => { e.preventDefault(); if (typed.trim() && phase !== 'thinking') { stopSpeaking(); rec.current?.cancel(); ask(typed.trim()); setTyped('') } }}>
      <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Ask Jarvis…" aria-label="Your question" />
      <button type="submit" disabled={!typed.trim() || phase === 'thinking'}>Send</button>
    </form>
  </div>
}
