// BadgeFit's workout controls: hold Finish in the workout header to pause, finish, switch to
// something else today, wipe today's plan, or cancel the whole workout. A tap on Finish stays the
// plain Finish sheet. Pausing stops the clock: on resume the start time moves forward by the
// pause, so the saved duration counts only the time spent training. English only.
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { menuSheet, confirmSheet, finishWorkoutSheet, dayOverrideSheet } from './sheets.jsx'
import { todayISO } from './lib/format.js'
import { REST } from './lib/rotation.js'

const S = () => useStore.getState().S
const toast = m => useUI.getState().toast(m)

export const isPaused = A => !!A?.pausedAt

export function pauseWorkout() {
  useStore.getState().update(s => { if (s.active && !s.active.pausedAt) s.active.pausedAt = Date.now() })
  toast('⏸ Workout paused. The clock has stopped.')
}

export function resumeWorkout() {
  useStore.getState().update(s => {
    const a = s.active
    if (!a?.pausedAt) return
    a.start += Math.max(0, Date.now() - a.pausedAt)
    delete a.pausedAt
  })
  toast('▶ Back at it.')
}

/**
 * The hold-Finish sheet. `discardNow` drops the session without asking (the Workout screen's own,
 * which also stops the timers and tells the watch); every way out that loses sets asks first.
 */
export function workoutControlsSheet({ discardNow }) {
  const A = S().active
  if (!A) return
  const paused = isPaused(A)
  const ask = (title, message, confirmText, then) => confirmSheet({ title, message, confirmText, danger: true, onConfirm: then })
  menuSheet({
    title: 'Workout controls',
    subtitle: paused ? 'Paused. The clock is stopped.' : 'Pause, finish, change today, or stop.',
    sections: [
      { items: [
        paused
          ? { icon: 'play', accent: true, label: 'Resume workout', onClick: resumeWorkout }
          : { icon: 'pause', label: 'Pause workout', onClick: pauseWorkout },
        { icon: 'flag', label: 'Finish and save', onClick: () => finishWorkoutSheet({ onDiscard: () => ask('Discard workout?', 'The sets you logged in this session will be lost.', 'Discard', discardNow) }) },
      ] },
      { items: [
        { icon: 'swap', label: 'Do something else today', onClick: () => ask('Do something else today?', 'This workout is dropped and you pick another one (or rest) for today.', 'Choose another', () => { discardNow(); setTimeout(() => dayOverrideSheet(todayISO()), 50) }) },
        { icon: 'moon', label: 'Wipe today (rest day)', onClick: () => ask('Wipe today?', 'This workout is dropped and today becomes a rest day. Your plan for the other days stays.', 'Wipe today', () => {
          discardNow()
          useStore.getState().update(s => { s.dayPlan = { ...(s.dayPlan || {}), [todayISO()]: REST } })
          toast('🧹 Today is wiped. Rest up, or start anything from Home.')
        }) },
      ] },
      { items: [
        { icon: 'trash', danger: true, label: 'Cancel workout', onClick: () => ask('Cancel this workout?', 'Nothing from this session is saved.', 'Cancel workout', discardNow) },
      ] },
    ],
  })
}
