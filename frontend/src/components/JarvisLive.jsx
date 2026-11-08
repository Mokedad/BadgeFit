// Talk to Jarvis, live (BadgeFit): tap the mic, speak, Jarvis answers out loud in an Australian
// voice (lib/police/voice.js), then listens again, like a conversation. Speech recognition is
// the browser's own (Safari on iPhone and Chrome on Android have it); where it is missing, a text
// box stands in. The answer comes from the app's AI Coach (lib/coach-api.js askCoach), which
// answers as Jarvis for a BadgeFit member (api/coach/prompts/ask.md). The exchange is also kept
// in the Coach chat, so nothing said here is lost. English only, like the BadgeFit hub.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { askCoach, coachStatus, resolvePending, jobErrorText, isDeclined, JOB_ERRORS } from '../lib/coach-api.js'
import { appendChat } from '../lib/coach.js'
import { say, stopSpeaking, loadVoices, voiceOptions, pickVoice, savedVoice, saveVoice } from '../lib/police/voice.js'
import '../police.css'

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
const POLL_MS = 1500
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

export default function JarvisLive({ onClose, opener }) {
  const update = useStore(s => s.update)
  const [phase, setPhase] = useState('idle') // idle | listening | thinking | speaking
  const [turns, setTurns] = useState(opener ? [{ who: 'jarvis', text: opener }] : [])
  const [interim, setInterim] = useState('')
  const [typed, setTyped] = useState('')
  const [handsFree, setHandsFree] = useState(true)
  const [voices, setVoices] = useState([])
  const [voice, setVoice] = useState(savedVoice() || '')
  const rec = useRef(null), closed = useRef(false), endRef = useRef(null)

  useEffect(() => { loadVoices().then(v => { setVoices(voiceOptions(v)); if (!savedVoice()) setVoice(pickVoice(v)?.voiceURI || '') }) }, [])
  useEffect(() => () => { closed.current = true; try { rec.current?.abort() } catch { /* gone */ } stopSpeaking() }, [])
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }) }, [turns.length, interim, phase])

  const speak = async text => { setPhase('speaking'); await say(text); if (!closed.current) setPhase('idle') }

  const listen = () => {
    if (!Recognition) return
    stopSpeaking()
    const r = new Recognition()
    r.lang = 'en-AU'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1
    let final = ''
    r.onresult = e => {
      let text = ''
      for (const res of e.results) { text += res[0].transcript; if (res.isFinal) final = text }
      setInterim(text)
    }
    r.onerror = e => { setPhase('idle'); setInterim(''); if (e.error === 'not-allowed') setTurns(t => [...t, { who: 'system', text: 'Microphone blocked. Allow the microphone for this site (iPhone: Settings → Safari → Microphone).' }]) }
    r.onend = () => { setInterim(''); if (final.trim()) ask(final.trim()); else if (!closed.current) setPhase('idle') }
    rec.current = r
    setPhase('listening')
    try { r.start() } catch { setPhase('idle') }
  }

  const ask = async text => {
    setTurns(t => [...t, { who: 'you', text }])
    setPhase('thinking')
    try {
      await askCoach(text)
      update(s => { appendChat(s, { role: 'user', kind: 'text', text }) })
      const r = await waitForAnswer(() => closed.current)
      if (!r || closed.current) return
      if (r.error) { setTurns(t => [...t, { who: 'system', text: r.error }]); setPhase('idle'); return }
      update(s => { if (!(s.coach?.chat || []).some(m => m.pid === r.id)) appendChat(s, { role: 'coach', kind: 'text', text: r.answer, pid: r.id }) })
      resolvePending({ accepted: ['ask'] }).catch(() => {})
      setTurns(t => [...t, { who: 'jarvis', text: r.answer }])
      await speak(r.answer)
      if (handsFree && Recognition && !closed.current) listen()
    } catch (e) {
      if (!isDeclined(e)) setTurns(t => [...t, { who: 'system', text: JOB_ERRORS[e?.data?.code] || e?.message || 'Jarvis could not be reached.' }])
      setPhase('idle')
    }
  }

  const tapMic = () => {
    if (phase === 'listening') { try { rec.current?.stop() } catch { /* gone */ } return }
    if (phase === 'speaking') { stopSpeaking(); setPhase('idle'); return }
    if (phase === 'idle') listen()
  }

  const label = { idle: Recognition ? 'Tap to talk' : 'Type your question', listening: 'Listening…', thinking: 'Jarvis is thinking…', speaking: 'Jarvis is talking · tap to stop' }[phase]

  return <div className="jl" role="dialog" aria-label="Talk to Jarvis">
    <div className="jl-top">
      <button className="rp-x" onClick={onClose} aria-label="Close">✕</button>
      <b>Jarvis · live</b>
      <label className="jl-hf"><input type="checkbox" checked={handsFree} onChange={e => setHandsFree(e.target.checked)} /> Hands-free</label>
    </div>
    <div className="jl-feed">
      {turns.length === 0 && <p className="jl-hint">Ask anything: "What should I work on this week?", "My shins hurt after running", "What do I eat before intervals?"</p>}
      {turns.map((t, i) => <div key={i} className={'jl-msg ' + t.who}>{t.text}</div>)}
      {interim && <div className="jl-msg you interim">{interim}</div>}
      <div ref={endRef} />
    </div>
    <div className="jl-bottom">
      <button className={'jl-orb ' + phase} onClick={tapMic} disabled={phase === 'thinking' || (!Recognition && phase === 'idle')} aria-label={label}>
        <span aria-hidden="true">{phase === 'speaking' ? '🔊' : phase === 'thinking' ? '…' : '🎤'}</span>
      </button>
      <div className="jl-state" aria-live="polite">{label}</div>
      {<form className="jl-type" onSubmit={e => { e.preventDefault(); if (typed.trim() && phase === 'idle') { ask(typed.trim()); setTyped('') } }}>
        <input value={typed} onChange={e => setTyped(e.target.value)} placeholder={Recognition ? 'Or type here…' : 'Ask Jarvis…'} aria-label="Your question" />
        <button type="submit" disabled={!typed.trim() || phase !== 'idle'}>Send</button>
      </form>}
      {voices.length > 0 && <label className="jl-voice">🗣️ Voice
        <select value={voice} onChange={e => { setVoice(e.target.value); saveVoice(e.target.value); say('G\'day. This is my voice now. Let\'s get to work.') }}>
          {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
        </select>
      </label>}
    </div>
  </div>
}
