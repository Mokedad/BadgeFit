// Jarvis in the workout (BadgeFit): no buttons, no screen. While a BadgeFit member trains he
// talks: the plan at the start, the rep-range call after each work set, "rest is up" when the
// rest runs out, and a summary when the session is saved (lines: lib/police/workout-voice.js,
// voice: lib/police/voice.js). Mounted once in App. The first tap anywhere unlocks the sound,
// which an iPhone needs before a page may play anything.
import { useEffect } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { say, unlockOnce } from '../lib/police/voice.js'
import { startLine, tickedSet, setDoneLine, restLine, finishLine } from '../lib/police/workout-voice.js'
import { daysUntil } from '../lib/police/programme.js'
import { todayISO, exerciseNameText } from '../lib/format.js'

const member = S => !!S?.police?.level
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

export default function JarvisWorkout() {
  useEffect(() => {
    const unlock = () => { if (member(useStore.getState().S)) unlockOnce() }
    document.addEventListener('pointerdown', unlock, { capture: true, passive: true })

    const offStore = useStore.subscribe((st, prev) => {
      const S = st.S, P = prev.S
      if (!member(S) || S === P) return
      const A = S.active, B = P?.active
      // A new session.
      if (A && (!B || A.start !== B.start)) { if (!A.backfill) speak(nameOf => startLine(A, nameOf)); return }
      // A set ticked in the running one.
      if (A && B && !A.backfill) {
        const at = tickedSet(B, A)
        if (at) speak(nameOf => setDoneLine(A, at, { nameOf, unit: S.unit === 'lb' ? 'lb' : 'kg' }))
        return
      }
      // The session ended: saved (it is in the history now) or dropped (nothing to say).
      if (!A && B && !B.backfill) {
        const w = (S.workouts || []).find(x => x.start === B.start)
        if (w) {
          const days = S.police?.testDate ? daysUntil(S.police.testDate, todayISO()) : null
          speak(() => finishLine(w, { days: days != null && days >= 0 ? days : null, testName: (S.police?.testName || '').trim() || 'PCT' }))
        }
      }
    })

    const offUI = useUI.subscribe((ui, prev) => {
      const a = prev.timer, b = ui.timer
      if (!a || a.paused || a.kind === 'switch' || (b && !b.ready && b.endsAt === a.endsAt)) return
      const ranOut = (!b || b.ready) && a.endsAt && a.endsAt <= Date.now() + 1500
      const S = useStore.getState().S
      if (ranOut && member(S) && S.active) speak(() => restLine(S.active))
    })

    return () => { document.removeEventListener('pointerdown', unlock, { capture: true }); offStore(); offUI() }
  }, [])
  return null
}
