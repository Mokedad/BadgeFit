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

const b64 = blob => new Promise(res => {
  try { const r = new FileReader(); r.onload = () => res(String(r.result || '').split(',')[1] || ''); r.onerror = () => res(''); r.readAsDataURL(blob) } catch { res('') }
})

/**
 * Plays a clip of Hayden's natural voice (the server's, lib/police/voice.js) through the phone
 * itself: over the music, which dips under it, with the screen locked and the silent switch on.
 * The clip's length in ms once it has started, 0 when it could not be played here.
 */
export async function pocketPlay(blob) {
  const p = await native()
  if (!p || !blob) return 0
  try { const audio = await b64(blob); if (!audio) return 0; return (await p.play({ audio }))?.ms || 0 } catch { return 0 }
}

/** Stops whatever the phone is saying for Hayden. */
export async function pocketHush() { const p = plugin; try { await p?.hush() } catch { /* nothing playing */ } }

/**
 * The handed steps with Hayden's own voice attached where a clip is ready (`clipOf(text)` → Blob
 * or null), within a size the bridge takes comfortably; the rest are said in the phone's voice.
 */
export async function withClips(cues, clipOf, budget = 6e6) {
  const out = []
  let used = 0
  for (const c of cues) {
    const blob = clipOf?.(c.text)
    if (blob && used + blob.size <= budget) { const audio = await b64(blob); if (audio) { used += blob.size; out.push({ ...c, audio }); continue } }
    out.push(c)
  }
  return out
}

/** Says one line through the pocket session (it survives the lock screen); false when not kept. */
export async function pocketSay(text) {
  // Any time, not only during a session: this is the phone voice that is male and low (it picks
  // one), where the other native voice is the phone's default.
  const p = await native()
  if (!p) return false
  try { await p.say({ text: String(text) }); return true } catch { return false }
}
