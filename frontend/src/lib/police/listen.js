// One turn of listening for Hayden live, robust to the phones' speech recognition quirks:
// iPhone Safari often never marks a result final and sometimes never fires `end`, which left the
// screen stuck on "Listening…". Here the turn always ends: a short silence after speech sends
// what was heard, no speech at all gives up, a hard cap stops it, and a stop that never gets its
// `end` event is finished by a watchdog. Takes the Recognition class as an argument (testable).

export const LISTEN = { silenceMs: 1600, noSpeechMs: 8000, maxMs: 20000, endWaitMs: 1200 }

/**
 * Starts listening. Returns { done, finish, cancel }: `done` resolves once with
 * { text } (possibly '') or { error } ('not-allowed', 'no-speech', ...). `finish` sends what was
 * heard so far; `cancel` drops it.
 */
export function listenOnce(Recognition, { lang = 'en-AU', onInterim = () => {}, timing = LISTEN, timers = globalThis } = {}) {
  let heard = '', settled = false, cancelled = false
  let resolveDone
  const done = new Promise(r => { resolveDone = r })
  const t = {}
  const clear = k => { if (t[k]) { timers.clearTimeout(t[k]); t[k] = null } }
  const clearAll = () => Object.keys(t).forEach(clear)
  const settle = out => {
    if (settled) return
    settled = true
    clearAll()
    resolveDone(cancelled ? { text: '' } : out)
  }
  let r
  try { r = new Recognition() } catch { settle({ error: 'unavailable' }); return { done, finish() {}, cancel() {} } }
  r.lang = lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1

  const stop = () => {
    clear('silence'); clear('noSpeech'); clear('max')
    try { r.stop() } catch { /* already stopped */ }
    // Some phones never send `end` after stop(): finish with what was heard.
    if (!t.end) t.end = timers.setTimeout(() => { try { r.abort() } catch { /* gone */ } settle({ text: heard.trim() }) }, timing.endWaitMs)
  }

  r.onresult = e => {
    let text = ''
    for (const res of e.results) text += res[0].transcript
    heard = text
    onInterim(text)
    clear('noSpeech')
    clear('silence')
    if (text.trim()) t.silence = timers.setTimeout(stop, timing.silenceMs)
  }
  r.onerror = e => {
    const err = e?.error || 'error'
    if (err === 'no-speech' || err === 'aborted') settle({ text: heard.trim() })
    else settle(heard.trim() ? { text: heard.trim() } : { error: err })
  }
  r.onend = () => settle({ text: heard.trim() })

  try { r.start() } catch { settle({ error: 'start' }); return { done, finish() {}, cancel() {} } }
  t.noSpeech = timers.setTimeout(stop, timing.noSpeechMs)
  t.max = timers.setTimeout(stop, timing.maxMs)
  return {
    done,
    finish: () => { if (!settled) stop() },
    cancel: () => { cancelled = true; try { r.abort() } catch { /* gone */ } settle({ text: '' }) },
  }
}
