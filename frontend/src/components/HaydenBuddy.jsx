// BadgeFit: Hayden floats in the corner of Home, the hub's pages, a run and a workout, blinking and
// bobbing. Tap him and he does a move and "says" it: one symbol in a bubble and a few robot beeps
// (lib/police/bot-voice.js, volume in Hayden's settings). In a workout he does the exercise you are
// on. Double tap: he hops to another spot at random. Press and hold him (a second, a ring fills)
// and he lifts up: drag him anywhere, and he is happy where you put him down. The switch
// (HaydenToggle: his head, crossed out when off) turns him off or on.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { EMOTES, IDLE, EMOTE_MS, ACT_MS, ACT_SAY, LIFT, DROP, HOLD_MS, nextEmote, haydenOn, exerciseAct, nextSpot, SPOTS } from '../lib/police/bot-emotes.js'
import { beep, beepVolume } from '../lib/police/bot-voice.js'
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

// Where he floats, kept while the app is open (he stays where he was put, screen to screen): one
// of the spots, or the place he was dragged to.
let spotNow = 'br'
let posNow = null

const SIZE = 62
// What he must not sit on: anything you can tap or type in, and the bars.
// Pictures you hold (Plan's exercise pictures), the week strip's days and fold headers count too.
const TAPPABLE = 'button, a[href], input, select, textarea, [role=button], [role=slider], [role=checkbox], .tappable, .calm-nav, #timer, .rp-mini, figure, .wday, summary, label'
const hits = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
/** How much of the tappable page the box `r` (his) covers, in square pixels; 0 when nothing. */
function covered(me, r) {
  let area = 0
  for (const el of document.querySelectorAll(TAPPABLE)) {
    if (me.contains(el) || el.contains(me) || el.closest('[aria-hidden=true]')) continue
    const b = el.getBoundingClientRect()
    if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > innerHeight) continue
    if (hits(r, b)) area += (Math.min(r.right, b.right) - Math.max(r.left, b.left)) * (Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top))
  }
  return area
}
/** The first spot, from `order`, where he covers nothing; else the one where he covers least. */
function freeSpot(me, order) {
  const was = me.className
  let best = null, least = Infinity
  for (const sp of order) {
    me.className = was.replace(/\bspot-\w+/, '') + ' spot-' + sp
    const a = covered(me, me.getBoundingClientRect())
    if (a < least) { least = a; best = sp }
    if (a === 0) break
  }
  me.className = was
  return best || order[0]
}
const clampPos = (x, y) => ({ x: Math.max(4, Math.min(window.innerWidth - SIZE - 4, x)), y: Math.max(40, Math.min(window.innerHeight - SIZE * 1.3 - 8, y)) })

export default function HaydenBuddy() {
  const loc = useLocation()
  const on = useStore(s => !!s.S.police?.level && haydenOn(s.S))
  const covered = useUI(s => s.sheets.length > 0)
  const [look, setLook] = useState(IDLE)
  const last = useRef(-1), timer = useRef(0), lastTap = useRef(0), hopT = useRef(0)
  const holdT = useRef(0), press = useRef(null)
  const [spot, setSpot] = useState(spotNow)
  const [pos, setPos] = useState(posNow)
  const [hop, setHop] = useState(false)
  const [holding, setHolding] = useState(false)
  const [dragging, setDragging] = useState(false)
  const me = useRef(null)
  // iPhone: a finger held still on him must not start a scroll or the system's long-press, which
  // would cancel the pick-up. Native listeners, since React's touch listeners cannot preventDefault.
  useEffect(() => {
    const el = me.current
    if (!el) return
    const stop = e => { if (press.current) e.preventDefault() }
    el.addEventListener('touchmove', stop, { passive: false })
    el.addEventListener('touchstart', stop, { passive: false })
    return () => { el.removeEventListener('touchmove', stop); el.removeEventListener('touchstart', stop) }
  })
  // On every screen, and once it has settled, he moves off anything he would cover (unless you
  // put him somewhere yourself): his spot if it is clear, else the first clear one.
  useLayoutEffect(() => {
    const look = () => {
      if (!me.current || posNow) return
      const sp = freeSpot(me.current, [spotNow, ...SPOTS.filter(x => x !== spotNow)])
      if (sp !== spotNow) { spotNow = sp; setSpot(sp) }
    }
    look()
    const t = setTimeout(look, 600)
    // After a scroll, too: what was under him may have moved. Only when the scroll has stopped.
    let st = 0
    const onScroll = () => { clearTimeout(st); st = setTimeout(look, 350) }
    window.addEventListener('scroll', onScroll, { passive: true })
    // And after a tap anywhere (not on him): the page may have changed under him (next day, a fold).
    const onTap = e => { if (!me.current?.contains(e.target)) onScroll() }
    document.addEventListener('click', onTap, true)
    return () => { clearTimeout(t); clearTimeout(st); window.removeEventListener('scroll', onScroll); document.removeEventListener('click', onTap, true) }
  }, [loc.pathname, loc.search]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(hopT.current); clearTimeout(holdT.current) }, [])
  // The guided run (RunHost) covers the screen: he floats over it, and runs when tapped.
  const running = useRun(s => !!s.run && !s.minimized)
  const place = running || loc.pathname === '/home' || loc.pathname === '/workout' || loc.pathname === '/police'
  if (!on || !place || covered) return null

  const react = (l, ms = EMOTE_MS) => {
    setLook(l); clearTimeout(timer.current)
    if (l.mood) beep(l.mood, beepVolume(useStore.getState().S.police))
    timer.current = setTimeout(() => setLook(IDLE), ms)
  }
  // Double tap: he hops to another spot, at random (never the one he is in).
  const hopAway = () => {
    setHop(true); clearTimeout(hopT.current)
    hopT.current = setTimeout(() => {
      // Somewhere new at random, and clear of buttons when one of the others is.
      const others = SPOTS.filter(x => x !== spotNow).sort(() => Math.random() - 0.5)
      spotNow = me.current ? freeSpot(me.current, others) : nextSpot(spotNow)
      posNow = null; setPos(null); setSpot(spotNow); setHop(false)
    }, 200)
  }
  const tap = () => {
    const at = Date.now()
    if (at - lastTap.current < 320) { lastTap.current = 0; hopAway(); return }
    lastTap.current = at
    const A = useStore.getState().S.active
    const act = running ? 'run' : loc.pathname === '/workout' && A ? exerciseAct(EXIDX[A.entries?.[A.cur]?.id]) : null
    if (act) { const [sym, mood] = ACT_SAY[act] || ['💪', 'proud']; react({ act, sym, mood }, ACT_MS); return }
    const i = nextEmote(last.current); last.current = i
    react(EMOTES[i])
  }

  const down = e => {
    const r = e.currentTarget.getBoundingClientRect()
    press.current = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false, lifted: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setHolding(true); clearTimeout(holdT.current)
    holdT.current = setTimeout(() => {
      if (!press.current || press.current.moved) return
      press.current.lifted = true
      setHolding(false); setDragging(true)
      try { navigator.vibrate?.(25) } catch { /* none */ }
      react(LIFT, 60000)
    }, HOLD_MS)
  }
  const moveTo = e => {
    const p = press.current
    if (!p) return
    if (!p.lifted) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 22) { p.moved = true; setHolding(false); clearTimeout(holdT.current) }
      return
    }
    const next = clampPos(e.clientX - p.dx, e.clientY - p.dy)
    posNow = next; setPos(next)
  }
  const up = () => {
    const p = press.current
    press.current = null
    clearTimeout(holdT.current); setHolding(false)
    if (!p) return
    if (p.lifted) { setDragging(false); react(DROP); return }
    if (!p.moved) tap()
  }

  const placed = pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined
  return <button type="button" ref={me} style={placed}
    className={'hb-buddy' + (pos ? ' placed' + (pos.x < window.innerWidth / 2 ? ' say-right' : '') : ' spot-' + spot) + (hop ? ' hop' : '') + (holding ? ' holding' : '') + (dragging ? ' dragging' : '') + (loc.pathname === '/workout' ? ' in-workout' : '') + (running ? ' on-run' : '')}
    onPointerDown={down} onPointerMove={moveTo} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()}
    aria-label="Hayden. Tap for a move, double tap to move him, hold to pick him up">
    {look.sym && <span className="hb-say" aria-hidden="true">{look.sym}</span>}
    {holding && <span className="hb-ring" aria-hidden="true" />}
    <HaydenBot size={SIZE} eyes={look.eyes} pose={look.pose} act={look.act} />
  </button>
}
