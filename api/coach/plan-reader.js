/* "Upload my program" from a photo or screenshot (BadgeFit): a plan someone already has (from a
 * trainer, an app, a sheet of paper) is read by the Gemini model the admin connected and turned
 * into plain lines the phone's own reader understands (frontend/src/lib/police/program-text.js):
 *
 *   Monday: Legs
 *   Back squat 4x8
 *   Plank 3x45s
 *   Run 20 min
 *
 * The photo is used for that one request and kept nowhere: not on disk, not in a log, not in the
 * reply. Gemini only (the voice uses the same key); another provider answers 501 and the phone
 * says to type or paste instead. Bounded per profile, since every read costs a little. */
import * as cfgStore from './config.js';
import { baseUrlFor } from './core/providers.js';

export const MODELS = (process.env.COACH_VISION_MODEL || 'gemini-2.5-flash,gemini-2.0-flash').split(',').map(s => s.trim()).filter(Boolean);
export const MAX_BYTES = 3 * 1024 * 1024;
export const PER_DAY = 10;
const DAY_MS = 86400000, TIMEOUT_MS = 60000;
const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export const PROMPT = `This image is a person's own training plan (from a trainer, an app or a sheet of paper).
Write it out as plain text lines, nothing else:
- A day starts with its day or session name and a colon, for example "Monday: Legs" or "Day 1: Upper".
- Each exercise on its own line: the exercise name, then sets x reps, for example "Back squat 4x8".
  A timed hold: "Plank 3x45s". Cardio: "Run 20 min". Use the numbers in the image; leave out weights.
- Leave out anything that is not a day or an exercise: no notes, no names of people, no links.
If the image is not a training plan, answer with exactly: NOT A PLAN`;

/* The camera in the exercise picker (BadgeFit): a photo of the machine someone is standing at, named
 * as the exercises done on it, most likely first, so the phone can add it or swap it in. The same
 * rules as a plan: read once, kept nowhere, Gemini only, bounded per profile. */
export const MACHINE_PROMPT = `This photo shows a piece of gym equipment or a machine.
Name the exercises people do on it, the most likely first, at most 3, one per line.
Use plain common exercise names, for example "Lat pulldown", "Seated cable row", "Leg press", "Chest press machine".
Write only the names, no numbers, no other words.
If the photo does not show gym equipment, answer with exactly: NOT EQUIPMENT`;

/** The machine reader's answer: up to three short exercise names. */
export function machineNames(text) {
  return cleanLines(text).split('\n').map(l => l.replace(/^[-*\d.)\s]+/, '').replace(/["“”]/g, '').trim())
    .filter(l => l && l.length <= 60 && !/^NOT EQUIPMENT$/i.test(l)).slice(0, 3);
}

/** Plain lines back from the model: control characters out, bounded, '' for nothing. */
export function cleanLines(text) {
  return String(text || '').replace(/```[a-z]*\n?|```/gi, '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 200).join('\n').slice(0, 8000);
}

function geminiKey(uid) {
  const cfg = cfgStore.load();
  if (cfg.provider !== 'gemini') return null;
  const cred = cfgStore.credentialFor(uid);
  return cred.ok && cred.auth && cred.auth.token ? { key: cred.auth.token, base: baseUrlFor('gemini', cfg) } : null;
}

/** makePlanReader() → { read(uid, { image, mime }) }: { ok, text } or { ok: false, status, error }. */
export function makePlanReader({ fetchImpl = globalThis.fetch, keyFor = geminiKey, now = Date.now, prompt = PROMPT, perDay = PER_DAY, notIt = /^NOT A PLAN$/i, notItError = 'That does not look like a training plan.', busyError = 'Hayden has read a lot of plans today. Try again tomorrow, or type it in.' } = {}) {
  const hits = new Map(); // uid → [times]
  let working = null;
  async function read(uid, { image, mime } = {}) {
    const type = String(mime || '').toLowerCase();
    const data = typeof image === 'string' ? image.replace(/^data:[^,]*,/, '') : '';
    if (!MIMES.has(type) || !data || !/^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 200))) return { ok: false, status: 400, error: 'send a photo (JPEG or PNG)' };
    if (Math.floor(data.length * 3 / 4) > MAX_BYTES) return { ok: false, status: 413, error: 'that photo is too big' };
    const t = now();
    const mine = (hits.get(uid) || []).filter(x => t - x < DAY_MS);
    if (mine.length >= perDay) return { ok: false, status: 429, error: busyError };
    const cred = keyFor(uid);
    if (!cred) return { ok: false, status: 501, error: 'reading a photo needs the Coach on Google Gemini' };
    mine.push(t); hits.set(uid, mine);
    let last = 'no model could read it';
    for (const model of working ? [working, ...MODELS.filter(m => m !== working)] : MODELS) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      try {
        const res = await fetchImpl(`${cred.base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', signal: ctl.signal,
          headers: { 'content-type': 'application/json', 'x-goog-api-key': cred.key },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ inline_data: { mime_type: type, data } }, { text: prompt }] }], generationConfig: { maxOutputTokens: 4000, temperature: 0 } }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) { last = (out.error && out.error.message) || `status ${res.status}`; if (res.status === 404) continue; return { ok: false, status: 502, error: 'Hayden could not read that one' }; }
        const text = cleanLines(((out.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join(''));
        working = model;
        if (!text || notIt.test(text)) return { ok: false, status: 422, error: notItError };
        return { ok: true, text };
      } catch (e) { last = e.name === 'AbortError' ? 'it took too long' : 'could not reach the model'; }
      finally { clearTimeout(timer); }
    }
    return { ok: false, status: 502, error: last };
  }
  return { read };
}

/** makeMachineReader() → { read(uid, { image, mime }) }: { ok, names } or { ok: false, status, error }. */
export function makeMachineReader(opts = {}) {
  const r = makePlanReader({ ...opts, prompt: MACHINE_PROMPT, perDay: 30, notIt: /^NOT EQUIPMENT$/i,
    notItError: 'Hayden could not see a machine in that one. Try closer, the whole machine in the picture.',
    busyError: 'Hayden has looked at a lot of machines today. Search for it instead.' });
  return {
    async read(uid, input) {
      const out = await r.read(uid, input);
      if (!out.ok) return out;
      const names = machineNames(out.text);
      return names.length ? { ok: true, names } : { ok: false, status: 422, error: 'Hayden could not tell which machine that is. Search for it instead.' };
    },
  };
}
