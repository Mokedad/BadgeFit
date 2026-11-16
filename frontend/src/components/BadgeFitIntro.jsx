// BadgeFit's first-run intro: five slides you swipe through, in place of the long coach-mark tour
// (that one still runs from Settings → Tutorials). Everyone gets the whole app (the 'all' preset,
// lib/modules.js), with no choice to make first. Each slide is a small
// picture of the real screen, so people know what to expect and find the rest themselves.
import RunnerIcon, { FinishFlag } from './RunnerIcon.jsx'
import { iconFor } from '../lib/police/emoji-icon.js'
import Icon from './Icon.jsx'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { presetOf, applyPreset } from '../lib/modules.js'
import { markTourDone, markOffered, closeTour } from '../lib/tour.js'
import BadgeLogo from './BadgeLogo.jsx'
import '../police.css'

const EXTRAS = {
  training: [['🏠', 'Today', 'what to train, one tap to start'], ['📅', 'Plan', 'your weeks up to the test'], ['play', 'Start', 'goes green ✓ when the day is done']],
  body: [['⚖️', 'Weigh-ins', 'Home, under your plan'], ['📏', 'Measurements', 'and progress photos'], ['📈', 'Stats', 'what moved this month']],
  all: [['🎯', 'PCT tab', 'Test day, beep trainer, your standards'], ['💬', 'Hayden chat', 'ask anything, any time'], ['👥', 'Community', 'train alongside other recruits']],
}

export default function BadgeFitIntro() {
  const S = useStore(s => s.S)
  const track = useRef(null)
  const [at, setAt] = useState(0)
  const N = 5
  const go = i => { const el = track.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }) }
  const done = () => { markTourDone(); closeTour() }
  const onScroll = () => { const el = track.current; if (el) setAt(Math.round(el.scrollLeft / el.clientWidth)) }
  // Everyone gets the whole app (the lot): no choice to make before starting.
  useEffect(() => { markOffered(); if (presetOf(useStore.getState().S) !== 'all') useStore.getState().update(st => applyPreset(st, 'all')) }, [])
  useEffect(() => { const k = e => { if (e.key === 'Escape') done() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  const level = S.police?.level === 'intermediate' ? 'intermediate' : 'beginner'
  const p = 'all'
  return <div className="bfi" role="dialog" aria-modal="true" aria-label="Welcome to BadgeFit">
    <button type="button" className="bfi-skip" onClick={done}>Skip</button>
    <div className="bfi-track" ref={track} onScroll={onScroll}>
      <section className="bfi-slide">
        <BadgeLogo size={72} />
        <h2 className="bf-word">Welcome to Badge<span>Fit</span></h2>
        <p>Your plan to the PCT, Hayden your trainer, and a crew cheering you on. Swipe to see how it works.</p>
      </section>
      <section className="bfi-slide">
        <div className="bfi-pic">
          <div className="bfi-cd"><b>26</b><span>days to your PCT</span></div>
          <div className="bfi-week">{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => <span key={d} className={i < 2 ? 'ok' : i === 2 ? 'now' : ''}>{d}<i>{i < 2 ? '✓' : '•'}</i></span>)}</div>
          <div className="bfi-row"><Icon name="figureRun" /> <b>Easy run, 30 min</b><em>Start</em></div>
        </div>
        <h2>Your day, at a glance</h2>
        <p>The countdown to your test, this week's ticks, and today's session. Swipe today's box left to remove it, or hold it to swap.</p>
      </section>
      <section className="bfi-slide">
        <div className="bfi-pic">
          <div className="bfi-say">“Hey, 55 kilos 12 reps”</div>
          <div className="bfi-hay">Hayden: 12 reps, top of the range. Move up to 57.5 next set.</div>
          <div className="bfi-say">“2 minutes rest instead”</div>
          <div className="bfi-say">“Next exercise, I'm done with this machine”</div>
        </div>
        <h2>Hayden trains with you</h2>
        <p>Tap Hayden's head once in a workout, then just talk: “Hayden”, “Hey” or “H”, and your set. He logs it, sets your next weight and calls your rest.</p>
      </section>
      <section className="bfi-slide">
        <div className="bfi-pic">
          <div className="bfi-runbar"><i style={{ width: '45%' }} /><span style={{ left: '45%' }}><RunnerIcon size={22} /></span><b><FinishFlag /></b></div>
          <div className="bfi-big">12:40</div>
          <div className="bfi-row"><Icon name="pause" /> Pause like music · drag the runner to move the time</div>
        </div>
        <h2>Guided runs</h2>
        <p>Hayden talks you through every run: warm-up, the hard bits, check-ins and your finish. {level === 'intermediate' ? 'Your plan has tempo, intervals and a hard steady run.' : 'Your plan builds you up with easy runs first.'}</p>
      </section>
      <section className="bfi-slide">
        <div className="bfi-list">{EXTRAS[p].map(([i, a, b]) => <div key={a} className="bfi-li"><span><Icon name={iconFor(i)} /></span><b>{a}</b><small>{b}</small></div>)}</div>
        <h2>{p === 'training' ? 'That is all there is' : p === 'body' ? 'And your body too' : 'And everything else'}</h2>
        <p>Every day is done when it shows ✓. Need more? “Add an extra workout” on Home. The full tour is in Settings any time.</p>
        <button type="button" className="bfi-go" onClick={done}>Let's go</button>
      </section>
    </div>
    <div className="bfi-foot">
      <div className="bfi-dots" aria-hidden="true">{Array.from({ length: N }, (_, i) => <i key={i} className={i === at ? 'on' : ''} />)}</div>
      {at < N - 1 ? <button type="button" className="bfi-next" onClick={() => go(at + 1)}>Next</button> : <span />}
    </div>
  </div>
}
