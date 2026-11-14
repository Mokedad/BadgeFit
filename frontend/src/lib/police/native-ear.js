// Hayden's ears in the iPhone app: Apple's own speech recognition (the HaydenEar plugin,
// scripts/ios/badgefit/HaydenEarPlugin.swift), shaped like the web's SpeechRecognition so every
// listener (lib/police/listen.js listenOnce) takes it as it is. The web's recognition inside the
// app was often missing, or lost the microphone to the silent session that keeps Hayden talking,
// so "20 kilos, 10 reps" or "set done" went unheard. Elsewhere (the website) the browser's is used.

const plugin = () => {
  const C = typeof window !== 'undefined' ? window.Capacitor : null
  if (!C?.isNativePlatform?.() || !C.isPluginAvailable?.('HaydenEar')) return null
  try { return C.registerPlugin('HaydenEar') } catch { return null }
}

export class NativeRecognition {
  constructor() { this.lang = 'en-AU'; this.interimResults = true; this.continuous = false; this.onresult = null; this.onerror = null; this.onend = null; this.p = plugin() }
  start() {
    const p = this.p
    if (!p) throw new Error('unavailable')
    let last = ''
    const say = text => { last = text; this.onresult?.({ resultIndex: 0, results: [[{ transcript: text }]] }) }
    ;(async () => {
      let sub = null
      try { sub = await p.addListener('heard', d => { if (d?.text) say(d.text) }) } catch { /* no live words */ }
      let r = {}
      try { r = (await p.listen({ lang: this.lang, silenceMs: 1500, noSpeechMs: 20000, maxMs: 20000 })) || {} } catch { r = { error: 'start' } }
      try { await sub?.remove() } catch { /* gone */ }
      if (r.error) this.onerror?.({ error: r.error })
      else if (r.text && r.text !== last) say(r.text)
      this.onend?.()
    })()
  }
  stop() { try { this.p?.stop() } catch { /* not listening */ } }
  abort() { try { this.p?.cancel() } catch { /* not listening */ } }
}

/** What to listen with: Apple's recognition in the iPhone app, else the browser's, else null. */
export function pickRecognition() {
  if (plugin()) return NativeRecognition
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}
