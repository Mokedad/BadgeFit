/* BadgeFit cheers that arrive (cheers.js): kept until picked up, once, short and first names only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as ch from '../cheers.js';

test('a cheer waits in the inbox until it is taken, once', () => {
  const s = ch.empty();
  ch.add(s, 'u2', { from: 'Ann Smith', colour: '#ff5fa2', kind: 'cheer', what: 'your win: Level 7.4', ref: 'p1' }, 1000);
  assert.equal(ch.count(s, 'u2'), 1);
  const got = ch.take(s, 'u2', 2000);
  assert.deepEqual(got.map(x => [x.from, x.kind, x.what, x.colour]), [['Ann', 'cheer', 'your win: Level 7.4', '#ff5fa2']]);
  assert.equal(ch.take(s, 'u2', 3000).length, 0);
});

test('cheering the same post again replaces the first; strangers and old ones are dropped', () => {
  const s = ch.empty();
  ch.add(s, 'u2', { from: 'Ann', kind: 'cheer', ref: 'p1' }, 1000);
  ch.add(s, 'u2', { from: 'Ann', kind: 'cheer', ref: 'p1' }, 2000);
  ch.add(s, 'u2', { from: 'Ann', kind: 'hug' }, 2000);
  assert.equal(ch.count(s, 'u2'), 1);
  assert.equal(ch.take(s, 'u2', 2000 + ch.KEEP_MS).length, 0);
  for (let i = 0; i < ch.MAX + 5; i++) ch.add(s, 'u3', { from: 'B' + i, kind: 'love' }, i);
  assert.equal(ch.count(s, 'u3'), ch.MAX);
});

test('labels and the notification', () => {
  assert.equal(ch.postLabel({ topic: 'win', text: 'Hit 7.4 on the beep test' }), 'your win: Hit 7.4 on the beep test');
  assert.match(ch.postLabel({ topic: 'question', text: 'x'.repeat(100) }), /^your question: x+…$/);
  const p = ch.cheerPush({ from: 'Ann', kind: 'cheer', what: 'your win: Level 7.4' });
  assert.deepEqual([p.body, p.url], ['Ann cheered your win: Level 7.4', '#/community']);
  assert.equal(ch.cheerPush({ from: 'Bob', kind: 'love' }).body, 'Bob sent you a love');
});

test('the bell keeps what was sent, newest first, with who sent it kept server-side', () => {
  const s = ch.empty();
  ch.add(s, 'u2', { from: 'Ann', kind: 'cheer', ref: 'p1', uid: 'u1' }, 1000);
  ch.add(s, 'u2', { from: 'Cat', kind: 'follow', ref: 'follow', uid: 'u3' }, 2000);
  ch.take(s, 'u2', 3000);
  assert.deepEqual(ch.history(s, 'u2').map(x => [x.from, x.kind, x.uid]), [['Cat', 'follow', 'u3'], ['Ann', 'cheer', 'u1']]);
  assert.equal(ch.cheerPush({ from: 'Cat', kind: 'follow' }).body, 'Cat followed you');
  ch.forgetUser(s, 'u1');
  assert.deepEqual(ch.history(s, 'u2').map(x => x.from), ['Cat']);
});
