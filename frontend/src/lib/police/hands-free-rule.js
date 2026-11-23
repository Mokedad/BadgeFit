// When Hayden listens through a workout on his own (components/JarvisHandsFree.jsx). With AirPods
// or any headphones in, their microphone is by your mouth, so he hears "20 kilos, 10 reps" from
// the bench: he listens from the first set. Without them the phone is on a rack across the room
// and hears little, so he waits for a tap on his face (and says headphones hear him best). On the
// web, where the phone cannot say what is plugged in, he listens as before. Tapped off once stays
// off (police.handsFree false) until tapped on.
export function shouldAutoListen({ setting, headphones, recognition = true } = {}) {
  if (!recognition) return false
  if (setting === false) return false
  if (headphones === null || headphones === undefined) return true
  return !!headphones
}

/** The short line under the bar, and the toast when a tap starts him. */
export const LISTEN_LINE = { on: '🎧 Listening', heard: 'Heard: ', tapNoPhones: 'Hayden hears you best with AirPods in', tapOn: '🎧 Hayden is listening', off: 'Hayden stopped listening' }
