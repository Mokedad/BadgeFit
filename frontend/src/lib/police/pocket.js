// Hayden in your pocket (the BadgeFit iPhone app): his voice with the screen locked or another app
// in front, and Spotify dipping under it. A web page goes quiet once the phone locks, so the app
// has a small native part (scripts/ios/badgefit/RunCuesPlugin.swift) that
//   - keeps the app awake during a run, a walk or a gym session (a silent audio session that
//     mixes with other audio), so Hayden's lines from the app still play;
//   - is handed the run's coming steps when the app leaves the screen, and says each at its time
//     itself, whatever the page is doing meanwhile.
// Nowhere else (the website, Android for now) do these calls do anything.
import { MOBILE } from '../mobile.js'
import { segSeconds } from './runs.js'

/**
 * The steps still to come in a run, as { in: seconds from now, text } for the phone to say, from
 * `idx` at `offset` seconds in. Stops at a step measured by distance (nobody knows when it ends)
 * and ends with the finish line when every step to the end is timed. At most `max` lines.
 */
export function pocketCues(run, idx, offset, sayStep, max = 60) {
  const segs = run?.segments || []
  const out = []
  if (!segs[idx] || segs[idx].sec == null) return out
  let at = segSeconds(segs[idx]) - Math.max(0, offset)
  for (let i = idx + 1; i < segs.length && out.length < max; i++) {
    out.push({ in: Math.max(1, Math.round(at)), text: sayStep(segs[i]) })
    if (segs[i].sec == null) return out
    at += segSeconds(segs[i])
  }
  if (out.length < max) out.push({ in: Math.max(1, Math.round(at)), text: 'That is the session done. Great work.' })
  return out
}

const NATIVE = MOBILE && import.meta.env?.MODE !== 'test'
let plugin = null, keeping = false, handed = false
async function native() {
  if (!NATIVE) return null
  if (plugin) return plugin
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core')
    if (!Capacitor.isPluginAvailable('RunCues')) return null
    plugin = registerPlugin('RunCues')
  } catch { plugin = null }
  return plugin
}

/** Keeps the app awake behind the lock screen while a session is on (true), or lets go (false). */
export async function pocketKeep(on) {
  if (on === keeping) return
  keeping = on
  if (!on) handed = false
  const p = await native()
  try { await p?.keep({ on }) } catch { /* an older build without the plugin */ }
}

/** Hands the phone the lines to say on its own, replacing any handed before. */
export async function pocketSchedule(cues) {
  const p = await native()
  if (!p || !keeping) return false
  try { await p.schedule({ cues }); handed = true; return true } catch { handed = false; return false }
}

/** Takes the handed lines back: the app is on screen again and speaks for itself. */
export async function pocketClear() {
  if (!handed) return
  handed = false
  const p = await native()
  try { await p?.clear() } catch { /* nothing handed */ }
}

/** Whether the phone is saying the run's steps itself right now (the app keeps quiet). */
export const pocketHanded = () => handed

/** Says one line through the pocket session (it survives the lock screen); false when not kept. */
export async function pocketSay(text) {
  if (!keeping) return false
  const p = await native()
  if (!p) return false
  try { await p.say({ text: String(text) }); return true } catch { return false }
}
