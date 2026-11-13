// BadgeFit: Hayden floats in the corner of Home, the hub's pages, a run and a workout, blinking and
// bobbing. Tap him and he does a move (lib/police/bot-emotes.js). The 🤖/🚷 switch
// (HaydenToggle: his head, crossed out when off) turns him off or on for this member.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { EMOTES, IDLE, EMOTE_MS, ACT_MS, nextEmote, haydenOn, exerciseAct, nextSpot } from '../lib/police/bot-emotes.js'
import { EXIDX } from '../lib/exercises.js'
import { useRun } from '../store/useRun.js'
import HaydenBot, { HaydenMark } from './HaydenBot.jsx'

export function HaydenToggle({ className = '' }) {
  const on = useStore(s => haydenOn(s.S))
  const flip = () => {
    useStore.getState().update(s => { s.police = { ...(s.police || {}), haydenOff: on ? true : undefined } })
    useUI.getState().toast(on ? 'Hayden is off' : 'Hayden is back')
  }
  return <button type="button" className={'hb-toggle' + (on ? '' : ' off') + ' ' + className} aria-pressed={on} onClick={flip}
    aria-label={on ? 'Hayden on. Tap to turn him off' : 'Hayden off. Tap to turn him on'}>
    <HaydenMark size={34} />{!on && <span className="hb-toggle-x" aria-hidden="true" />}
  </button>
}

// Where he floats, kept while the app is open (he stays where he was put, screen to screen).
let spotNow = 'br'

export default function HaydenBuddy() {
  const loc = useLocation()
  const on = useStore(s => !!s.S.police?.level && haydenOn(s.S))
  const covered = useUI(s => s.sheets.length > 0)
  const [look, setLook] = useState(IDLE)
  const last = useRef(-1), timer = useRef(0), lastTap = useRef(0), hopT = useRef(0)
  const [spot, setSpot] = useState(spotNow)
  const [hop, setHop] = useState(false)
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(hopT.current) }, [])
  // The guided run (RunHost) covers the screen: he floats over it, and runs when tapped.
  const running = useRun(s => !!s.run && !s.minimized)
  const place = running || loc.pathname === '/home' || loc.pathname === '/workout' || loc.pathname === '/police'
  if (!on || !place || covered) return null
  // In a workout he does the exercise you are on (bench press, squat, curls...), on a run he runs;
  // anywhere else, or on an exercise he has no move for, one of his moves.
  // Double tap: he hops to another corner, at random (never the one he is in).
  const move = () => {
    setHop(true); clearTimeout(hopT.current)
    hopT.current = setTimeout(() => { spotNow = nextSpot(spotNow); setSpot(spotNow); setHop(false) }, 200)
  }
  const tap = () => {
    const at = Date.now()
    if (at - lastTap.current < 320) { lastTap.current = 0; move(); return }
    lastTap.current = at
    const A = useStore.getState().S.active
    const act = running ? 'run' : loc.pathname === '/workout' && A ? exerciseAct(EXIDX[A.entries?.[A.cur]?.id]) : null
    clearTimeout(timer.current)
    if (act) { setLook({ act }); timer.current = setTimeout(() => setLook(IDLE), ACT_MS); return }
    const i = nextEmote(last.current); last.current = i
    setLook(EMOTES[i])
    timer.current = setTimeout(() => setLook(IDLE), EMOTE_MS)
  }
  return <button type="button" className={'hb-buddy spot-' + spot + (hop ? ' hop' : '') + (loc.pathname === '/workout' ? ' in-workout' : '') + (running ? ' on-run' : '')} onClick={tap} aria-label="Hayden">
    <HaydenBot size={62} {...look} />
  </button>
}
