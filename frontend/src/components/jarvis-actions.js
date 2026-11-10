// What a workout command does (BadgeFit), the same from the 🎤 call (JarvisLive) and from
// hands-free (JarvisHandsFree): log a set, swap, rest, what's next, wrap up. Returns what Hayden
// should say ('' when the workout's own call follows, as after a logged set), or null when the
// words are not a command. The workout screen registers the actions (store/useJarvis.js).
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { useJarvis } from '../store/useJarvis.js'
import { parseCommand } from '../lib/police/voice-commands.js'
import { nextSetLine } from '../lib/police/workout-voice.js'
import { exerciseNameText } from '../lib/format.js'

const names = async () => { const { EXIDX } = await import('../lib/exercises.js'); return id => (EXIDX[id] ? exerciseNameText(EXIDX[id]) : 'that one') }

export async function runCommand(text) {
  const w = useJarvis.getState().workout
  const cmd = useStore.getState().S.active ? parseCommand(text) : null
  if (!cmd || !w) return null
  const ui = useUI.getState()
  const unit = useStore.getState().S.unit === 'lb' ? 'lb' : 'kg'
  if (cmd.type === 'set' || cmd.type === 'same') {
    const n = cmd.type === 'same' ? w.sameAgain() : w.logSet(cmd)
    if (!n) return 'Nothing to log right now.'
    ui.toast(`✅ Set ${n.setNo} logged${cmd.reps ? `: ${cmd.reps} reps` : ''}${cmd.weight ? ` at ${cmd.weight} ${unit}` : ''}`)
    return '' // the rep-range call follows from the workout itself (JarvisWorkout)
  }
  if (cmd.type === 'swap') {
    const hit = w.swap(cmd.query)
    if (!hit) return `I could not find ${cmd.query}. Try the full name, like dumbbell incline bench press.`
    const nameOf = await names()
    return `Swapped to ${nameOf(hit.id)}. ${nextSetLine(useStore.getState().S.active, { nameOf, unit }).replace(/^20 seconds\. /, '')}`
  }
  if (cmd.type === 'skipRest') { ui.skipRest?.(); return 'Let us go.' }
  if (cmd.type === 'addRest') { ui.addRest?.(cmd.sec); return cmd.sec >= 60 ? 'Another minute.' : `${cmd.sec} more seconds.` }
  if (cmd.type === 'next') return nextSetLine(useStore.getState().S.active, { nameOf: await names(), unit }).replace(/^20 seconds\. /, 'Next: ') || 'That is everything. Say wrap up when you are ready.'
  if (cmd.type === 'finish') { w.finish(); return '' }
  return null
}
