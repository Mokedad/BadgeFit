// BadgeFit: Hayden floats in the corner of Home, the hub's pages and a workout, blinking and
// bobbing. Tap him and he does a move (lib/police/bot-emotes.js). The 🤖/🚷 switch
// (HaydenToggle) turns him off or on for this member.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { EMOTES, IDLE, EMOTE_MS, nextEmote, haydenOn } from '../lib/police/bot-emotes.js'
import HaydenBot from './HaydenBot.jsx'

export function HaydenToggle({ className = '' }) {
  const on = useStore(s => haydenOn(s.S))
  const flip = () => {
    useStore.getState().update(s => { s.police = { ...(s.police || {}), haydenOff: on ? true : undefined } })
    useUI.getState().toast(on ? 'Hayden is off' : 'Hayden is back')
  }
  return <button type="button" className={'hb-toggle ' + className} aria-pressed={on} onClick={flip}
    aria-label={on ? 'Hayden on. Tap to turn him off' : 'Hayden off. Tap to turn him on'}>
    <span aria-hidden="true">{on ? '🤖' : '🚷'}</span>
  </button>
}

export default function HaydenBuddy() {
  const loc = useLocation()
  const on = useStore(s => !!s.S.police?.level && haydenOn(s.S))
  const covered = useUI(s => s.sheets.length > 0)
  const [look, setLook] = useState(IDLE)
  const last = useRef(-1), timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const place = loc.pathname === '/home' || loc.pathname === '/workout'
    || (loc.pathname === '/police' && !new URLSearchParams(loc.search).get('run'))
  if (!on || !place || covered) return null
  const tap = () => {
    const i = nextEmote(last.current); last.current = i
    setLook(EMOTES[i]); clearTimeout(timer.current)
    timer.current = setTimeout(() => setLook(IDLE), EMOTE_MS)
  }
  return <button type="button" className={'hb-buddy' + (loc.pathname === '/workout' ? ' in-workout' : '')} onClick={tap} aria-label="Hayden">
    <HaydenBot size={62} {...look} />
  </button>
}
