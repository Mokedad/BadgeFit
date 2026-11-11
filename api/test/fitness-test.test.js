import test from 'node:test';
import assert from 'node:assert/strict';
import { tempData, sampleState } from './helpers.mjs';
import { parseBeep, meets, standardOf, fitnessStatus, fitnessTestOf } from '../coach/core/fitness-test.js';

tempData();
const payload = await import('../coach/core/payload.js');

const ft = (results = [], extra = {}) => ({ standard: 'nsw', every: 14, results, ...extra });

test('the beep test is a level and a shuttle, not a decimal', () => {
  assert.deepEqual(parseBeep('7.1'), [7, 1]);
  assert.deepEqual(parseBeep('7/10'), [7, 10]);
  assert.equal(parseBeep('abc'), null);
  assert.equal(meets('beep', '7.10', '7.9'), true);
  assert.equal(meets('beep', '5.8', '7.1'), false);
  assert.equal(meets('illinois', 19.5, 20), true);   // lower is better
  assert.equal(meets('illinois', 21, 20), false);
});

test('NSW standard, without grip, and own targets win', () => {
  assert.deepEqual(standardOf(ft()).targets, { beep: '7.1', plank: 90, vjump: 30, pushups: 25, illinois: 20 });
  assert.equal(standardOf(ft([], { targets: { beep: '8.2' } })).targets.beep, '8.2');
  assert.equal('plank' in standardOf(ft([], { skip: ['plank'] })).targets, false);
});

test('gaps: furthest off first, trends, next test date and weight', () => {
  const st = fitnessStatus(ft([
    { d: '2026-10-28', beep: '5.6', plank: 95, vjump: 32, pushups: 20, illinois: 21, bw: 92 },
    { d: '2026-11-04', beep: '5.8', plank: 95, vjump: 33, pushups: 22, illinois: 20.5, bw: 91 },
  ], { goalWeight: 85 }), '2026-11-11');
  assert.deepEqual(st.gaps.map(g => g.test), ['beep', 'pushups', 'illinois']);
  assert.equal(st.gaps[0].focus, 'endurance');
  assert.equal(st.gaps[0].trend, 'up');
  assert.equal(st.nextTest, '2026-11-18');
  assert.equal(st.due, false);
  assert.equal(st.daysToNext, 7);
  assert.deepEqual(st.weight, { have: 91, goal: 85, toLose: 6 });
  assert.equal(fitnessStatus(ft([{ d: '2026-10-01', beep: '7.1' }]), '2026-11-11').due, true);
});

test('never tested: everything is a gap and the test is due today', () => {
  const st = fitnessStatus(ft(), '2026-11-11');
  assert.equal(st.gaps.length, 5);
  assert.equal(st.due, true);
});

test('the Coach payload carries the fitness test for a plan and a review, not a debrief', () => {
  const S = { ...sampleState(), fitnessTest: ft([{ d: '2026-11-04', beep: '5.8', pushups: 30 }]) };
  const now = Date.parse('2026-11-11T09:00:00Z');
  const p = payload.build(S, { handle: 'h'.repeat(16), kind: 'create', now });
  assert.equal(p.fitnessTest.standard, 'NSW Police PCT');
  assert.equal(p.fitnessTest.priorities[0], 'endurance');
  assert.equal(p.fitnessTest.tests.find(x => x.test === 'pushups').pass, true);
  assert.ok(payload.build(S, { handle: 'h'.repeat(16), kind: 'review', now }).fitnessTest);
  assert.equal(fitnessTestOf({ fitnessTest: { ...S.fitnessTest, off: true } }, '2026-11-11'), null);
});
