// Hayden, opened from Home (BadgeFit): a personal coach, not a menu. He opens with his own words
// about this person today (lib/police/hayden-opening.js), spoken only, and then listens. A question,
// spoken or tapped, is answered from the plan and the test results on the phone with no AI call
// (lib/police/offline-jarvis.js), shown and read out. Back (or a swipe right) returns to the
// questions. The ball is the microphone: tap it to make him listen again, or to stop him.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { policeBrief } from '../lib/police/brief.js'
import { answerOffline } from '../lib/police/offline-jarvis.js'
import { openingLine } from '../lib/police/hayden-opening.js'
import { listenOnce } from '../lib/police/listen.js'
import { say, stopSpeaking, primeSpeech } from '../lib/police/voice.js'
import { MOBILE } from '../lib/mobile.js'

const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null

export const QUICK = [
  { q: 'What is today?', ask: 'what do i do today' },
  { q: 'What is tomorrow?', ask: 'tomorrow' },
  { q: 'Am I on track?', ask: 'am i ready for the pct' },
  { q: 'What should I work on?', ask: 'what should i work on, my weak spot' },
  { q: 'What should I eat?', ask: 'what should i eat, protein' },
  { q: 'When do I go heavier?', ask: 'when do i go up, rep range' },
  { q: 'Something hurts', ask: 'pain' },
  { q: 'I am tired today', ask: 'tired, motivate me' },
]
const HELP = 'I did not catch that one. Ask me about today, tomorrow, your test, food, when to go heavier, something that hurts, or if you are tired.'

/** Hayden's answer to a question in the person's own words, from the plan (no AI). */
export function quickAnswer(question, brief) {
  const a = answerOffline(question, brief)
  return /^I cannot get to my full brain/.test(a) ? HELP : a
}

export default function HaydenQuick({ close, today = null, done = null }) {
  // `today`: what today is as it stands now (Home works it out: a swap or an added workout
  // included), so Hayden never names the plan's day when the member changed it.
  const brief = () => { const b = policeBrief(useStore.getState().S, todayISO()); return today ? { ...b, today, todayRun: null } : b }
  const [opening] = useState(() => {
    const st = useStore.getState(), now = new Date()
    return openingLine(brief(), { name: st.user?.name || '', hour: now.getHours(), seed: Math.floor(now.getTime() / 86400000),
      done: done ?? (st.S.workouts || []).some(w => w.d === todayISO()) })
  })
  const [view, setView] = useState(null) // null: the opening and the questions; { q, a }: an answer
  const [phase, setPhase] = useState('idle') // 'speaking' | 'listening' | 'idle'
  const [heard, setHeard] = useState('')
  const [note, setNote] = useState('')
  const rec = useRef(null), gone = useRef(false), turn = useRef(0)

  const listen = async () => {
    if (!Recognition || gone.current) { setPhase('idle'); return }
    const mine = ++turn.current
    setHeard(''); setPhase('listening')
    const l = listenOnce(Recognition, { onInterim: t => { if (turn.current === mine) setHeard(t) } })
    rec.current = l
    const out = await l.done
    if (rec.current === l) rec.current = null
    if (gone.current || turn.current !== mine) return
    if (out.error === 'not-allowed' || out.error === 'service-not-allowed') {
      setPhase('idle')
      setNote(MOBILE ? 'To talk to me, allow the microphone and speech for BadgeFit in your phone’s Settings. The buttons work without it.' : 'To talk to me, allow the microphone for this site. The buttons work without it.')
      return
    }
    if (out.text) answer(out.text, out.text)
    else setPhase('idle') // nothing heard: he rests until the ball is tapped
  }
  const speak = async text => {
    const mine = ++turn.current
    rec.current?.cancel(); rec.current = null
    stopSpeaking(); setPhase('speaking')
    await say(text).catch(() => {})
    if (!gone.current && turn.current === mine) listen()
  }
  const answer = (ask, shown) => {
    const a = quickAnswer(ask, brief())
    setNote(''); setView({ q: shown, a }); speak(a)
  }
  const back = () => { setView(null); turn.current++; stopSpeaking(); listen() }
  // The ball: stop him talking, or stop or start listening.
  const ball = () => {
    if (phase === 'speaking') { turn.current++; stopSpeaking(); listen(); return }
    if (phase === 'listening') { turn.current++; rec.current?.cancel(); rec.current = null; setPhase('idle'); return }
    listen()
  }

  useEffect(() => {
    gone.current = false
    primeSpeech()
    speak(opening)
    return () => { gone.current = true; turn.current++; rec.current?.cancel(); stopSpeaking() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe right on an answer goes back to the questions.
  const sw = useRef(null)
  const onTouchStart = e => { const t = e.touches[0]; sw.current = { x: t.clientX, y: t.clientY } }
  const onTouchEnd = e => {
    const s = sw.current; sw.current = null
    const t = e.changedTouches[0]
    if (s && view && t.clientX - s.x > 70 && Math.abs(t.clientX - s.x) > Math.abs(t.clientY - s.y) * 2) back()
  }

  const status = phase === 'listening' ? (heard || 'Listening…') : phase === 'speaking' ? 'Tap to cut in' : Recognition && !note ? 'Tap to talk' : ''
  return <div className="hq" data-noswipe onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    <div className="hq-top">
      {view ? <button className="hq-back" onClick={back} aria-label="Back to the questions">‹ Back</button> : <span />}
      <button className="hq-x" onClick={close} aria-label="Close">Done</button>
    </div>
    <button className={'hq-ball ' + phase} onClick={ball} aria-label={phase === 'listening' ? 'Stop listening' : 'Talk to Hayden'}><span className="pf-orb" aria-hidden="true" /></button>
    <div className="hq-status" role="status">{status}</div>
    {view ? <>
      <div className="hq-q">{view.q}</div>
      <p className="hq-a">{view.a}</p>
    </> : <>
      {/* His opening is said, not shown: a coach talks to you, he does not hand you a page. */}
      <div className="hq-chips">
        {QUICK.map(x => <button key={x.q} onClick={() => answer(x.ask, x.q)}>{x.q}</button>)}
      </div>
    </>}
    {note && <p className="hq-note" role="alert">{note}</p>}
  </div>
}
