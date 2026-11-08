import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSpeaker, cleanSpeech, pcmToWav, STYLE, TTS_VOICE } from '../coach/tts.js';

const audio = Buffer.from([1, 0, 2, 0, 3, 0]).toString('base64');
const ok = (calls) => async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
  return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: audio } }] } }] }) };
};
const keyFor = () => ({ key: 'k', base: 'https://g.example' });

test('cleanSpeech: plain, one line, bounded', () => {
  assert.equal(cleanSpeech('  **Go** \n now  '), 'Go now');
  assert.equal(cleanSpeech(42), '');
  assert.equal(cleanSpeech('x'.repeat(900)).length, 700);
});

test('pcmToWav wraps the samples in a 44-byte header', () => {
  const wav = pcmToWav(Buffer.alloc(10), 24000);
  assert.equal(wav.length, 54);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(24), 24000);
});

test('speak: one fixed voice, the key in a header, the line only, cached', async () => {
  const calls = [];
  const s = makeSpeaker({ fetchImpl: ok(calls), keyFor });
  const r = await s.speak('u1', 'Rest is up. Set two.');
  assert.equal(r.ok, true);
  assert.equal(r.wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers['x-goog-api-key'], 'k');
  assert.ok(!calls[0].url.includes('k='));
  assert.equal(calls[0].body.contents[0].parts[0].text, `${STYLE} Rest is up. Set two.`);
  assert.equal(calls[0].body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, TTS_VOICE);
  await s.speak('u1', 'Rest is up. Set two.');
  assert.equal(calls.length, 1, 'the second time comes from the cache');
});

test('speak: refuses without a Gemini key, nothing to say, or past the limit', async () => {
  assert.equal((await makeSpeaker({ keyFor: () => null }).speak('u', 'hi')).status, 501);
  assert.equal((await makeSpeaker({ keyFor }).speak('u', '   ')).status, 400);
  const calls = [];
  const s = makeSpeaker({ fetchImpl: ok(calls), keyFor });
  for (let i = 0; i < 60; i++) await s.speak('u', 'line ' + i);
  assert.equal((await s.speak('u', 'one more')).status, 429);
});

test('speak: tries the next voice model when one is unknown', async () => {
  let n = 0;
  const fetchImpl = async (url, init) => {
    n++;
    if (n === 1) return { ok: false, status: 404, json: async () => ({ error: { message: 'model not found' } }) };
    return ok([])(url, init);
  };
  const r = await makeSpeaker({ fetchImpl, keyFor }).speak('u', 'hello');
  assert.equal(r.ok, true);
  assert.equal(n, 2);
});
