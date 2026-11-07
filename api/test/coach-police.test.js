/* The police applicant context (BadgeFit) on a Coach question: bounded, typed, and only on `ask`.
 * The prompt switches the answer to the Jarvis voice when it is there. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { tempData } from './helpers.mjs';

tempData();
const payloadLib = await import('../coach/core/payload.js');
const { buildPromptParts } = await import('../coach/core/prompt.js');

const NOW = Date.parse('2026-11-07T10:00:00Z');
const police = {
  level: 'intermediate', start: '2026-10-20', testDate: '2026-12-05', weightKg: 110, age: 28, beepTarget: '7.1', beepGoal: '7.2', diet: 'high-protein',
  results: [
    { id: 'pushups', v: 18, at: '2026-10-20' }, { id: 'pushups', v: 21, at: '2026-10-27' },
    { id: 'pushups', v: 24, at: '2026-11-03' }, { id: 'pushups', v: 26, at: '2026-11-06' },
    { id: 'grip', v: { left: 31, right: 28 }, at: '2026-11-01' },
    { id: 'beep', v: '6.8', at: '2026-11-02' },
    { id: 'beep', v: 'drop table', at: '2026-11-02' },
    { id: 'hack', v: 1, at: '2026-11-02' },
  ],
};

test('cleanPolice keeps the useful part, bounded and typed', () => {
  const p = payloadLib.cleanPolice(police, NOW);
  assert.equal(p.level, 'intermediate');
  assert.equal(p.week, 3);
  assert.equal(p.age, 28);
  assert.equal(p.beepPass, '7.1');
  assert.equal(p.beepGoal, '7.2');
  assert.deepEqual(p.results.pushups.map(r => r.v), [21, 24, 26]); // the latest three
  assert.deepEqual(p.results.grip[0].v, { left: 31, right: 28 });
  assert.deepEqual(p.results.beep, [{ at: '2026-11-02', v: '6.8' }]);
  assert.equal(p.results.hack, undefined);
  assert.equal(p.daysToTest, 28);
  assert.equal(p.weightKg, 110);
});

test('cleanPolice: nothing there, nothing sent', () => {
  assert.equal(payloadLib.cleanPolice(null), null);
  assert.equal(payloadLib.cleanPolice({}), null);
  assert.equal(payloadLib.cleanPolice([1, 2]), null);
});

test('a question carries it, and the prompt knows to answer as Jarvis', () => {
  const S = { unit: 'kg', routines: [], workouts: [], police };
  const p = payloadLib.build(S, { handle: 'u1', kind: 'ask', note: 'What should I work on?', now: NOW });
  assert.equal(p.police.level, 'intermediate');
  const { system } = buildPromptParts('ask', p);
  assert.match(system, /speak as Jarvis/);
  assert.match(system, /caterpillar/);
  const review = payloadLib.build(S, { handle: 'u1', kind: 'review', now: NOW });
  assert.equal(review.police, undefined);
});
