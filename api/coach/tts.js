/* Jarvis's voice (BadgeFit): the server turns a short line into speech with the Gemini key the
 * admin connected, and the phone plays it as an audio file. Safari on iPhone blocks or mutes its
 * own speech synthesis in too many ways (no tap, silent switch, right after the microphone), and
 * an audio file plays where that does not. One voice for everyone: a fixed Gemini voice told to
 * speak as an Australian male trainer. No voice options by design.
 *
 * Gemini only: with another provider (or none) the route answers 501 and the phone falls back to
 * its own speech synthesis. What leaves: only the line to be spoken (the words the phone would
 * say out loud anyway), never training data. Bounded per profile and cached by text, since the
 * workout cues repeat. */
import crypto from 'node:crypto';
import * as cfgStore from './config.js';
import { baseUrlFor } from './core/providers.js';

// Puck: Gemini's upbeat male voice, the closest to a trainer's; COACH_TTS_VOICE picks another.
export const TTS_VOICE = process.env.COACH_TTS_VOICE || 'Puck';
export const TTS_MODELS = (process.env.COACH_TTS_MODEL || 'gemini-2.5-flash-preview-tts,gemini-2.5-pro-preview-tts')
  .split(',').map(s => s.trim()).filter(Boolean);
export const STYLE = 'You are Jarvis, an Australian personal trainer talking to your client in the gym or on a run. Speak naturally and conversationally with a relaxed Australian accent, warm and energetic, like a real coach beside them: natural pauses, a smile in your voice, never like reading a script. Say exactly these words and nothing else:';
export const MAX_CHARS = 700;
const PER_WINDOW = 60, WINDOW_MS = 10 * 60 * 1000, CACHE_MAX = 300, TIMEOUT_MS = 30000;

/** The line as it will be spoken: plain text, one line, bounded; '' when there is nothing. */
export function cleanSpeech(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/[*_#`>|~]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
}

/** 16-bit mono PCM (what Gemini returns) wrapped in a WAV header, so any browser plays it. */
export function pcmToWav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const rateOf = mime => { const m = /rate=(\d+)/.exec(mime || ''); return m ? Number(m[1]) : 24000; };

/** The Gemini key the admin connected, or null (another provider, per-profile without a key...). */
function geminiKey(uid) {
  const cfg = cfgStore.load();
  if (cfg.provider !== 'gemini') return null;
  const cred = cfgStore.credentialFor(uid);
  return cred.ok && cred.auth && cred.auth.token ? { key: cred.auth.token, base: baseUrlFor('gemini', cfg) } : null;
}

/**
 * makeSpeaker() → { speak(uid, text) }: { ok: true, wav } or { ok: false, status, error }.
 * `fetchImpl`, `keyFor` and `now` are injectable for the tests.
 */
export function makeSpeaker({ fetchImpl = globalThis.fetch, keyFor = geminiKey, now = Date.now } = {}) {
  const cache = new Map(); // text → wav, oldest first
  const hits = new Map(); // uid → [times]
  let workingModel = null;

  async function speak(uid, raw) {
    const text = cleanSpeech(raw);
    if (!text) return { ok: false, status: 400, error: 'nothing to say' };
    const cached = cache.get(text);
    if (cached) { cache.delete(text); cache.set(text, cached); return { ok: true, wav: cached }; }
    const t = now();
    const mine = (hits.get(uid) || []).filter(x => t - x < WINDOW_MS);
    if (mine.length >= PER_WINDOW) return { ok: false, status: 429, error: 'Jarvis has talked a lot just now. Give it a few minutes.' };
    const cred = keyFor(uid);
    if (!cred) return { ok: false, status: 501, error: 'the server voice needs the Coach on Google Gemini' };
    mine.push(t); hits.set(uid, mine);

    let lastError = 'no voice model answered';
    for (const model of workingModel ? [workingModel, ...TTS_MODELS.filter(m => m !== workingModel)] : TTS_MODELS) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      try {
        const res = await fetchImpl(`${cred.base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          signal: ctl.signal,
          headers: { 'content-type': 'application/json', 'x-goog-api-key': cred.key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${STYLE} ${text}` }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } } },
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) { lastError = (data && data.error && data.error.message) || `HTTP ${res.status}`; if (res.status === 404 || res.status === 400) continue; break; }
        const part = (((data && data.candidates) || [])[0]?.content?.parts || []).find(p => p.inlineData && p.inlineData.data);
        if (!part) { lastError = 'the voice model sent no audio'; continue; }
        const wav = pcmToWav(Buffer.from(part.inlineData.data, 'base64'), rateOf(part.inlineData.mimeType));
        workingModel = model;
        cache.set(text, wav);
        while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
        return { ok: true, wav };
      } catch (e) {
        lastError = e && e.name === 'AbortError' ? 'the voice took too long' : 'the voice could not be reached';
      } finally { clearTimeout(timer); }
    }
    return { ok: false, status: 502, error: lastError };
  }
  return { speak };
}

export const textHash = text => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
