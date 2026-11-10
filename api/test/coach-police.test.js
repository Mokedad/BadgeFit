/* The police applicant context (BadgeFit) on a Coach question: bounded, typed, and only on `ask`.
 * The prompt switches the answer to the Hayden voice when it is there. */
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

test('a question carries it, and the prompt knows to answer as Hayden', () => {
  const S = { unit: 'kg', routines: [], workouts: [], police };
  const p = payloadLib.build(S, { handle: 'u1', kind: 'ask', note: 'What should I work on?', now: NOW });
  assert.equal(p.police.level, 'intermediate');
  const { system } = buildPromptParts('ask', p);
  assert.match(system, /speak as Hayden/);
  assert.match(system, /caterpillar/);
  const review = payloadLib.build(S, { handle: 'u1', kind: 'review', now: NOW });
  assert.equal(review.police, undefined);
});

test('the trainer brief from the device is cleaned, bounded and reaches the prompt', () => {
  const S = { unit: 'kg', routines: [], workouts: [], police };
  const brief = {
    level: 'intermediate', week: 8, daysToTest: 27, phase: { n: 2, range: '6-8' },
    today: { title: 'Recovery: treadmill incline walk', kind: 'walk', minutes: 40, details: ['30 min brisk walk', 'x'.repeat(900), 'a', 'b', 'c'] },
    gaps: Array.from({ length: 9 }, (_, i) => ({ standard: 'Push-ups', latest: '22 reps', pct: 88, pass: false, area: 'Chest', train: 'push-ups', evil: '<script>' })),
    foodToday: { kcal: 520, protein: '42', kcalTarget: 2740, proteinTarget: 242 },
    junk: { deep: 'ignored' },
  };
  const p = payloadLib.build(S, { handle: 'u1', kind: 'ask', note: 'What should I do today?', now: NOW, police: brief });
  const b = p.police.brief;
  assert.equal(b.today.details.length, 4);
  assert.ok(b.today.details[1].length <= 160);
  assert.equal(b.gaps.length, 6);
  assert.equal(b.gaps[0].evil, undefined);
  assert.equal(b.foodToday.protein, 42);
  assert.equal(b.junk, undefined);
  assert.match(buildPromptParts('ask', p).system, /be their personal trainer/);
  // a brief alone (no BadgeFit state on the server yet) still counts
  assert.ok(payloadLib.build({ unit: 'kg', routines: [], workouts: [] }, { handle: 'u1', kind: 'ask', note: 'x', now: NOW, police: brief }).police.brief);
  assert.equal(payloadLib.cleanBrief('nope'), null);
});
