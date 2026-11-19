/* The owner's numbers (stats.js). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, sessionDays, cleanAnswer } from '../stats.js';

const NOW = Date.parse('2026-11-19T12:00:00Z');
const D = n => new Date(NOW - n * 86400000).toISOString();

test('counts testers, who trained this week and twice, and who came back in week 2', () => {
  const users = [
    { id: 'a', created: D(30) }, { id: 'b', created: D(10) }, { id: 'c', created: D(2) }, { id: 'd', created: D(12), disabled: true },
    { id: 'e', created: D(9) },
  ];
  const states = {
    a: { workouts: [{ d: D(1).slice(0, 10) }, { d: D(3).slice(0, 10) }] },
    b: { workouts: [{ d: D(2).slice(0, 10) }], police: { runLog: [{ at: D(9).slice(0, 10) }] } },
    c: { workouts: [] },
    e: { workouts: [{ d: D(8).slice(0, 10) }] },
  };
  const s = computeStats({ users, stateOf: id => states[id], feed: { posts: [{ at: NOW - 1000, week: {}, cheers: ['a', 'b'], replies: [{ at: NOW - 500 }] }] }, feedback: [{ text: 'too many screens' }], now: NOW });
  assert.equal(s.testers, 4);
  assert.equal(s.newThisWeek, 1);
  assert.equal(s.trainedThisWeek, 2);
  assert.equal(s.trainedTwice, 1);
  assert.equal(s.sessionsThisWeek, 3);
  // b joined 10 days ago and trained on day 8 after joining; e joined 9 days ago and has not since day 1.
  assert.deepEqual(s.weekTwo, { joined: 2, cameBack: 1 });
  assert.deepEqual(s.community, { posts: 1, comments: 1, sharedWeeks: 1, reacted: 2 });
  assert.equal(s.answers[0].text, 'too many screens');
});

test('sessions come from workouts and guided runs; answers are cleaned', () => {
  assert.deepEqual(sessionDays({ workouts: [{ d: '2026-11-18' }], police: { runLog: [{ at: '2026-11-17' }] } }), ['2026-11-18', '2026-11-17']);
  assert.deepEqual(sessionDays(null), []);
  assert.equal(cleanAnswer('  hi\u0000 ' + 'x'.repeat(600)).length, 500);
});
