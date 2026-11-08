// Beeps as audio files (BadgeFit beep test, components/BeepTrainer.jsx). An iPhone mutes Web
// Audio with the silent switch and can suspend it; an <audio> element playing a file is the
// sound it lets through. Built once in memory: a short sine tone, or a few in a row.

/** 16-bit mono PCM WAV bytes: `tones` beeps of `freq` Hz, `ms` long, `gapMs` apart. */
export function toneWav({ freq = 880, ms = 220, tones = 1, gapMs = 110, rate = 22050, volume = 0.8 } = {}) {
  const one = Math.round(rate * ms / 1000), gap = Math.round(rate * gapMs / 1000)
  const n = tones * one + (tones - 1) * gap
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf)
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, n * 2, true)
  const fade = Math.round(rate * 0.008)
  for (let k = 0; k < tones; k++) {
    const at = k * (one + gap)
    for (let i = 0; i < one; i++) {
      const env = Math.min(1, i / fade, (one - i) / fade)
      v.setInt16(44 + (at + i) * 2, Math.round(Math.sin(2 * Math.PI * freq * i / rate) * env * volume * 32767), true)
    }
  }
  return new Uint8Array(buf)
}

/** A player for one tone, to unlock inside a tap (`unlock`) and play later (`play`). */
export function tonePlayer(opts) {
  if (typeof Audio === 'undefined' || typeof Blob === 'undefined') return { unlock() {}, play() {} }
  const url = URL.createObjectURL(new Blob([toneWav(opts)], { type: 'audio/wav' }))
  const a = new Audio(url)
  a.preload = 'auto'
  return {
    unlock() { try { a.muted = true; a.play()?.then?.(() => { a.pause(); a.currentTime = 0; a.muted = false }, () => { a.muted = false }) } catch { /* no audio */ } },
    play() { try { a.currentTime = 0; a.play()?.catch?.(() => {}) } catch { /* no audio */ } },
  }
}
