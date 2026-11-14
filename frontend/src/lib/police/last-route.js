// After iOS restarts the app behind your back (it reloads the page when it is short of memory),
// it comes back on the screen you were on, not at the start. The screen is remembered with the
// time; one older than 10 minutes, or one of the sign-in and pairing screens, is not brought back.
export const KEEP_MS = 10 * 60 * 1000
// The screens worth coming back to; Home is where the app opens anyway, and sign-in screens never.
const SCREENS = /^#\/(police|plan|stats|library|workout|community|settings|measurements|progress-photos)\b/

export const rememberable = hash => SCREENS.test(String(hash || ''))

/** The screen to go back to, or null. `saved`: { h, at } as stored. */
export function restoreTarget(saved, nowHash, now = Date.now()) {
  if (!saved || typeof saved.h !== 'string' || !(now - saved.at < KEEP_MS)) return null
  if (nowHash && nowHash !== '#/' && nowHash !== '#/home' && nowHash !== '#') return null
  return rememberable(saved.h) ? saved.h : null
}
