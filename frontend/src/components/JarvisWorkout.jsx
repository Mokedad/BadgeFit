// Jarvis in the workout (BadgeFit): no buttons, no screen. While a BadgeFit member trains he
// talks, so there is as little to tap as possible:
//   start       the plan for the first exercise (eased off after a rough morning check-in)
//   each set    the rep-range call, and the next weight already in the next set's row
//   rest        4:00 by default; halfway a push to stay locked in; at 20 seconds a bell and the
//               next set: weight, the plates on each side, one form cue
//   shorter     rest cut short (to 2:30, say) is remembered for that exercise from then on
//   the end     a wrap-up: volume against last time, PRs, what it means for the goal, days left
//   music mode  only the numbers: the weight calls, the 20-second bell, the next exercise
// Lines: lib/police/workout-voice.js, cues: form-cues.js, voice: voice.js. Mounted once in App.
// The first tap anywhere unlocks the sound, which an iPhone needs before a page plays anything.
import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { say, unlockOnce } from '../lib/police/voice.js'
import { tonePlayer } from '../lib/police/tones.js'
import { startLine, tickedSet, setDoneLine, restLine, restMotivation, nextSetLine, plateWords, upNext, wrapUpLine } from '../lib/police/workout-voice.js'
import { cueLine } from '../lib/police/form-cues.js'
import { checkinCall } from '../lib/police/checkin.js'
import { daysUntil } from '../lib/police/programme.js'
import { rowLoad, loadKindFor, baseWeightFor, inventoryFor } from '../lib/plates.js'
import { todayISO, exerciseNameText } from '../lib/format.js'
import { buildPushPlan } from '../lib/police/push-plan.js'

export const DEFAULT_REST_SEC = 240
const member = S => !!S?.police?.level
// Music mode (S.police.musicMode): training to Spotify or YouTube, so Jarvis keeps to the numbers.
const quiet = S => !!S?.police?.musicMode
const round15 = sec => Math.max(30, Math.round(sec / 15) * 15)

// The exercise names live in the big exercise library: loaded only when there is a line to say.
let names = null
const nameOf = async () => {
  if (!names) {
    const { EXIDX } = await import('../lib/exercises.js')
    names = id => (EXIDX[id] ? exerciseNameText(EXIDX[id]) : 'the next one')
  }
  return names
}
const speak = async build => { const text = build(await nameOf()); if (text) say(text) }
let bell = null

/** The 20-second call for the set after this rest: weight, plates each side, a form cue. */
function nextCall(S, nameOf, short = false) {
  const A = S.active
  const n = upNext(A)
  if (!n) return ''
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const w = Number(n.entry.sets[n.setIdx]?.w)
  let plates = ''
  try { plates = w > 0 ? plateWords(rowLoad(loadKindFor(S, n.entry.id), w, baseWeightFor(S, n.entry.id), inventoryFor(S)), unit) : '' } catch { /* no plate maths for this one */ }
  return nextSetLine(A, { nameOf, unit, plates, cue: short ? '' : cueLine(nameOf(n.entry.id), n.setNo) })
}

export default function JarvisWorkout() {
  useEffect(() => {
    const unlock = () => {
      if (!member(useStore.getState().S)) return
      unlockOnce()
      if (!bell) { bell = tonePlayer({ freq: 1320, ms: 180, tones: 2, gapMs: 120 }); bell.unlock() }
    }
    document.addEventListener('pointerdown', unlock, { capture: true, passive: true })
    const update = fn => useStore.getState().update(fn)

    // The planned reminders (lib/police/push-plan.js) cover the next days: rebuilt once a day, and
    // whenever the app comes back, so the morning nudge always says the right session.
    const refreshPlan = () => {
      const P = useStore.getState().S.police
      if (!P?.nudge?.on || P.pushPlan?.built === todayISO()) return
      let tz = 'UTC'
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { /* UTC */ }
      update(s => { s.police = { ...s.police, pushPlan: buildPushPlan(s.police, todayISO(), tz) } })
    }
    refreshPlan()
    const onVisible = () => { if (document.visibilityState === 'visible') refreshPlan() }
    document.addEventListener('visibilitychange', onVisible)

    const offStore = useStore.subscribe((st, prev) => {
      const S = st.S, P = prev.S
      if (!member(S) || S === P) return
      const A = S.active, B = P?.active
      // A new session: 4:00 rest for members (once), each exercise's remembered rest, the opener.
      if (A && (!B || A.start !== B.start)) {
        if (A.backfill) return
        const mine = S.police?.restByEx || {}
        update(s => {
          if (!s.police?.rest4) { s.restSec = DEFAULT_REST_SEC; s.police = { ...s.police, rest4: true } }
          for (const e of s.active?.entries || []) if (mine[e.id] > 0 && !(e.target?.restSec > 0)) e.target = { ...(e.target || {}), restSec: mine[e.id] }
        })
        const call = checkinCall(S.police?.checkins?.[todayISO()])
        const ease = call === 'easy' ? 'Easy day, like we said: about half the sets, nothing to failure. ' : call === 'light' ? 'Light day: two easy sets each, and stop if anything hurts. ' : ''
        speak(nameOf => { const first = A.entries?.[0]; return ease + startLine(A, nameOf) + (first && !quiet(S) ? ' ' + cueLine(nameOf(first.id), 1) : '') })
        return
      }
      // A set ticked in the running one.
      if (A && B && !A.backfill) {
        const at = tickedSet(B, A)
        if (at) speak(nameOf => {
          const line = setDoneLine(A, at, { nameOf, unit: S.unit === 'lb' ? 'lb' : 'kg' })
          // In music mode only a line with a number or the next exercise in it is worth the interruption.
          return quiet(S) && !/\d|Next up|last one/.test(line) ? '' : line
        })
        return
      }
      // The session ended: saved (it is in the history now) or dropped (nothing to say).
      if (!A && B && !B.backfill) {
        const w = (S.workouts || []).find(x => x.start === B.start)
        if (w) {
          const days = S.police?.testDate ? daysUntil(S.police.testDate, todayISO()) : null
          speak(nameOf => wrapUpLine(w, { workouts: S.workouts, goal: S.police?.goal || 'lose', weightKg: S.police?.weightKg || null, days: days != null && days >= 0 ? days : null, testName: (S.police?.testName || '').trim() || 'PCT', nameOf }))
        }
      }
    })

    // The rest: what started it, the push halfway, the bell at 20 s, and how long it really was.
    let rest = null
    const offUI = useUI.subscribe((ui, prev) => {
      const a = prev.timer, b = ui.timer
      const S = useStore.getState().S
      if (!member(S) || !S.active) { rest = null; return }
      if (b && !b.ready && b.kind !== 'switch' && (!a || a.ready || a.forIdx !== b.forIdx || (b.total > a.total + 20 && b.left > a.left))) {
        rest = { start: Date.now(), planned: b.total, forIdx: b.forIdx, mid: false, warned: false }
      }
      if (rest && b && !b.ready && !b.paused) {
        const el = (Date.now() - rest.start) / 1000
        if (!rest.mid && b.total >= 90 && el >= 45 && b.left > 40) { rest.mid = true; if (!quiet(S)) say(restMotivation()) }
        if (!rest.warned && b.left <= 20 && b.left > 3) {
          rest.warned = true
          bell?.play()
          speak(nameOf => { const now = useStore.getState().S; return nextCall(now, nameOf, quiet(now)) })
        }
      }
      const ended = a && !a.ready && a.kind !== 'switch' && (!b || b.ready)
      if (ended && rest) {
        const used = (Date.now() - rest.start) / 1000
        const ranOut = a.endsAt && a.endsAt <= Date.now() + 1500
        // Cut short by more than 20 s (but a real rest): that exercise keeps the shorter rest.
        const entry = S.active.entries?.[rest.forIdx]
        if (entry && used >= 30 && used < rest.planned - 20 && !ranOut) {
          const sec = round15(used)
          update(s => {
            s.police = { ...s.police, restByEx: { ...(s.police?.restByEx || {}), [entry.id]: sec } }
            for (const e of s.active?.entries || []) if (e.id === entry.id) e.target = { ...(e.target || {}), restSec: sec }
          })
        }
        rest = null
        if (ranOut && !quiet(S)) speak(() => restLine(S.active))
      }
    })

    return () => { document.removeEventListener('pointerdown', unlock, { capture: true }); document.removeEventListener('visibilitychange', onVisible); offStore(); offUI() }
  }, [])
  return null
}
