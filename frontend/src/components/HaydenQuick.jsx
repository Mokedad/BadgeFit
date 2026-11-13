// Hayden's quick answers (BadgeFit Home): the questions people actually ask about their
// training, answered from the plan and the test results on the phone, with no AI call
// (lib/police/offline-jarvis.js). Free, instant, and the same every time. A question of your own
// still goes to the AI coach, from the link at the bottom.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { todayISO } from '../lib/format.js'
import { policeBrief } from '../lib/police/brief.js'
import { answerOffline } from '../lib/police/offline-jarvis.js'
import { say, stopSpeaking } from '../lib/police/voice.js'

export const QUICK = [
  { q: 'What is today?', ask: 'what do i do today' },
  { q: 'What is tomorrow?', ask: 'tomorrow' },
  { q: 'Am I on track for my test?', ask: 'am i ready for the pct' },
  { q: 'What should I work on?', ask: 'what should i work on, my weak spot' },
  { q: 'What should I eat?', ask: 'what should i eat, protein' },
  { q: 'When do I go heavier?', ask: 'when do i go up, rep range' },
  { q: 'Something hurts', ask: 'pain' },
  { q: 'I am tired today', ask: 'tired, motivate me' },
]

export default function HaydenQuick({ close, onAsk, onTalk }) {
  const [pick, setPick] = useState(null)
  const answer = pick ? answerOffline(pick.ask, policeBrief(useStore.getState().S, todayISO())) : ''
  const done = fn => () => { stopSpeaking(); close(); fn?.() }
  return <div className="hq">
    <h3><span className="pf-orb" aria-hidden="true" /> Hayden</h3>
    {pick ? <>
      <div className="hq-q">{pick.q}</div>
      <p className="hq-a" role="status">{answer}</p>
      <div className="hq-row">
        <button className="hq-btn" onClick={() => { stopSpeaking(); say(answer).catch(() => {}) }}>🔊 Hear it</button>
        <button className="hq-btn" onClick={() => { stopSpeaking(); setPick(null) }}>Another question</button>
      </div>
    </> : <div className="hq-chips">
      {QUICK.map(x => <button key={x.q} onClick={() => setPick(x)}>{x.q}</button>)}
    </div>}
    {(onAsk || onTalk) && <div className="hq-more">
      {onTalk && <button onClick={done(onTalk)}>🎙 Talk to Hayden</button>}
      {onAsk && <button onClick={done(onAsk)}>Ask something else</button>}
    </div>}
  </div>
}
