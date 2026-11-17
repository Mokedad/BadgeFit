/* Reading a plan from a photo (coach/plan-reader.js): Gemini only, bounded, the photo kept nowhere. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { makePlanReader, cleanLines, PER_DAY } from '../coach/plan-reader.js';

const img = Buffer.from('fake image').toString('base64');
const answer = text => async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });

test('a photo comes back as plain plan lines', async () => {
  let sent = null;
  const r = makePlanReader({ keyFor: () => ({ key: 'k', base: 'https://g' }), fetchImpl: async (url, o) => { sent = JSON.parse(o.body); return answer('```\nMonday: Legs\nBack squat 4x8\n```')(); } });
  const out = await r.read('u1', { image: img, mime: 'image/jpeg' });
  assert.deepEqual(out, { ok: true, text: 'Monday: Legs\nBack squat 4x8' });
  assert.equal(sent.contents[0].parts[0].inline_data.data, img);
});

test('refuses what is not a photo, not a plan, too much, or with no Gemini', async () => {
  const ok = { keyFor: () => ({ key: 'k', base: 'https://g' }), fetchImpl: answer('NOT A PLAN') };
  assert.equal((await makePlanReader(ok).read('u1', { image: img, mime: 'text/html' })).status, 400);
  assert.equal((await makePlanReader(ok).read('u1', { image: img, mime: 'image/png' })).status, 422);
  assert.equal((await makePlanReader({ keyFor: () => null }).read('u1', { image: img, mime: 'image/png' })).status, 501);
  const r = makePlanReader({ ...ok, fetchImpl: answer('Day 1: A\nPlank 3x45s') });
  for (let i = 0; i < PER_DAY; i++) assert.equal((await r.read('u2', { image: img, mime: 'image/png' })).ok, true);
  assert.equal((await r.read('u2', { image: img, mime: 'image/png' })).status, 429);
});

test('cleans the lines', () => {
  assert.equal(cleanLines('  Run   20 min \n\n\u0007x'), 'Run 20 min\nx');
});
