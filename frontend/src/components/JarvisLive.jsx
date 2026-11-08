// Talk to Jarvis, live (BadgeFit): voice only. Speak, Jarvis answers out loud in an Australian
// voice (lib/police/voice.js), then listens again, like a call. Nothing is shown as text and
// nothing is saved to the chat: the screen only shows a symbol for what is happening (listening,
// thinking, talking). Speech recognition is the browser's own (lib/police/listen.js); where it is
// missing or blocked, a small keyboard button lets you type instead. The answer comes from the
// app's AI Coach (lib/coach-api.js askCoach), which answers as Jarvis for a BadgeFit member
// (api/coach/prompts/ask.md). English only, like the BadgeFit hub.
import { useEffect, useRef, useState } from 'react'
import { askCoach, coachStatus, resolvePending, jobErrorText, isDeclined, JOB_ERRORS } from '../lib/coach-api.js'
import { say, stopSpeaking, loadVoices, voiceOptions, pickVoice, savedVoice, saveVoice } from '../lib/police/voice.js'
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
 * The call as a small floating card. `hidden` keeps it alive while minimised (a reply in progress
 * still arrives and is spoken); `onPhase` tells the floating orb what Jarvis is doing.
 */
export default function JarvisLive({ onClose, onMinimize, hidden = false, onPhase }) {
  const [phase, setPhase] = useState('idle') // idle | listening | thinking | speaking
  const [note, setNote] = useState('')
  const [typing, setTyping] = useState(!Recognition)
  const [typed, setTyped] = useState('')
  const [voices, setVoices] = useState([])
  const [voice, setVoice] = useState(savedVoice() || '')
  const rec = useRef(null), closed = useRef(false)

  useEffect(() => { loadVoices().then(v => { setVoices(voiceOptions(v)); if (!savedVoice()) setVoice(pickVoice(v)?.voiceURI || '') }) }, [])
  useEffect(() => {
    if (Recognition) listen() // opened with a tap: start listening straight away
    return () => { closed.current = true; rec.current?.cancel(); stopSpeaking() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onPhase?.(phase) }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // A problem is said out loud as well as shown in one short line.
  const problem = text => { setNote(text); setPhase('idle'); say(text) }

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
      setTyping(true)
      setNote('Microphone blocked. Allow it in Settings → Safari → Microphone, or type.')
      setPhase('idle'); return
    }
    if (out.text) { ask(out.text); return }
    setPhase('idle')
    if (out.error) { setTyping(true); setNote('Voice did not work just now. Tap to try again, or type.') }
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
      if (Recognition) listen(); else setPhase('idle')
    } catch (e) {
      if (isDeclined(e)) { setPhase('idle'); return }
      problem(e?.data?.code === 'off' ? OFF_TEXT : JOB_ERRORS[e?.data?.code] || e?.message || 'Jarvis could not be reached.')
    }
  }

  const tapOrb = () => {
    if (phase === 'listening') { rec.current?.finish(); return }
    if (phase === 'speaking') { stopSpeaking(); return }
    if (phase === 'idle') listen()
  }

  const label = { idle: Recognition ? 'Tap to talk' : 'Type to ask', listening: 'Listening… tap when done', thinking: 'Thinking…', speaking: 'Talking · tap to stop' }[phase]

  return <div className="jl jl-v" role="dialog" aria-label="Talk to Jarvis" hidden={hidden}>
    <div className="jl-top">
      <b>Jarvis</b>
      {onMinimize && <button className="jl-ic" onClick={onMinimize} aria-label="Minimise" title="Minimise">–</button>}
      <button className="jl-ic" onClick={onClose} aria-label="End" title="End">✕</button>
    </div>
    <button className={'jv-orb ' + phase} onClick={tapOrb} disabled={phase === 'thinking' || !Recognition} aria-label={label}>
      <span className="jv-waves" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span className="jv-ico" aria-hidden="true">{phase === 'idle' ? '🎤' : ''}</span>
    </button>
    <div className="jl-state" aria-live="polite">{note || label}</div>
    <div className="jv-tools">
      {Recognition && <button className="jl-ic" onClick={() => setTyping(!typing)} aria-label="Type instead" title="Type instead">⌨️</button>}
      {voices.length > 0 && <select className="jv-voice" value={voice} aria-label="Jarvis's voice" onChange={e => { setVoice(e.target.value); saveVoice(e.target.value); say('G\'day. This is my voice now. Let\'s get to work.') }}>
        {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>🗣️ {v.name}</option>)}
      </select>}
    </div>
    {typing && <form className="jl-type" onSubmit={e => { e.preventDefault(); if (typed.trim() && phase !== 'thinking') { stopSpeaking(); rec.current?.cancel(); ask(typed.trim()); setTyped('') } }}>
      <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Ask Jarvis…" aria-label="Your question" />
      <button type="submit" disabled={!typed.trim() || phase === 'thinking'}>Send</button>
    </form>}
  </div>
}
