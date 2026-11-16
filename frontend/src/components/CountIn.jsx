// BadgeFit: Hayden counts you in. Whatever you picked (a run, a gym session), he does the move
// himself and counts 3, 2, 1, then it starts. "Start now" skips the count; swiping the sheet away
// cancels, so a wrong pick costs nothing.
import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { useRun } from '../store/useRun.js'
import HaydenBot from './HaydenBot.jsx'
import { beep, beepVolume } from '../lib/police/bot-voice.js'
import { exerciseAct } from '../lib/police/bot-emotes.js'
import { EXIDX } from '../lib/exercises.js'

export const COUNT_FROM = 3

function CountInSheet({ close, title, sub, act, onGo }) {
  const [n, setN] = useState(COUNT_FROM)
  const gone = useRef(false)
  const go = () => { if (gone.current) return; gone.current = true; close(); onGo() }
  useEffect(() => {
    if (n <= 0) { go(); return }
    try { beep('happy', beepVolume(useStore.getState().S.police)) } catch { /* no sound */ }
    const t = setTimeout(() => setN(x => x - 1), 1000)
    return () => clearTimeout(t)
  }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="count-in">
    <HaydenBot size={150} act={act || 'run'} />
    <b className="count-in-n" key={n} aria-live="assertive">{Math.max(1, n)}</b>
    <h3>{title}</h3>
    {sub && <p className="pf-sub">{sub}</p>}
    <button className="pf-go" onClick={go}>Start now</button>
    <p className="pf-sub">Wrong one? Swipe down.</p>
  </div>
}

/** Counts in, then calls `onGo`. Closing the sheet first cancels. */
export const countIn = ({ title, sub, act, onGo }) => useUI.getState().openSheet(close => <CountInSheet close={close} title={title} sub={sub} act={act} onGo={onGo} />)

/** A guided run: counted in, then the run opens over whatever screen you are on. A run already going just comes back. */
export function countInRun(run, minutes) {
  if (!run) return
  if (useRun.getState().run) { useRun.getState().open(useRun.getState().run); return }
  countIn({ title: run.name, sub: minutes ? `${minutes} min` : '', act: 'run', onGo: () => useRun.getState().open(run) })
}

/** What Hayden does for a gym routine: its first exercise's move. */
export const actForRoutine = r => exerciseAct(EXIDX[r?.ex?.[0]?.id]) || 'press'
