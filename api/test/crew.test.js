/* Your crew (crew.js): who tests with you, the one ping a day, quiet hours, leaving. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as crew from '../crew.js';

const ann = { id: 'u1', name: 'Ann Smith' }, bob = { id: 'u2', name: 'Bob' }, cat = { id: 'u3', name: 'Cat' }, dan = { id: 'u4', name: 'Dan' };
const NOON = Date.parse('2026-11-23T02:00:00Z'); // 1 pm in Sydney (UTC+11)
const SYD = 660;

test('a card is cleaned and needs a test date', () => {
  const s = crew.empty();
  assert.equal(crew.join(s, ann, { name: 'x', ready: 50 }), null);
  const c = crew.join(s, ann, { test: '2026-12-06', name: ' Ann <b>Smith', colour: '#ffc629', ready: 162, last: '2026-11-23', title: 'Intervals\u0007', tz: SYD }, NOON);
  assert.deepEqual(c, { test: '2026-12-06', kind: 'pct', name: 'Ann', colour: '#ffc629', ready: 100, last: '2026-11-23', title: 'Intervals', tz: SYD });
});

test('the crew is the people within a day of your date, today first, blocked ones out', () => {
  const s = crew.empty();
  crew.join(s, ann, { test: '2026-12-06', ready: 60, tz: SYD }, NOON);
  crew.join(s, bob, { test: '2026-12-07', ready: 80, last: '2026-11-23', title: 'Easy run', tz: SYD }, NOON);
  crew.join(s, cat, { test: '2026-12-05', ready: 90, last: '2026-11-21', tz: SYD }, NOON);
  crew.join(s, dan, { test: '2026-12-20', ready: 99, tz: SYD }, NOON);
  const r = crew.list(s, ann, { handle: uid => 'h' + uid, now: NOON });
  assert.equal(r.test, '2026-12-06');
  assert.deepEqual(r.crew.map(c => [c.id, c.name, c.today]), [['hu2', 'Bob', true], ['hu3', 'Cat', false]]);
  assert.ok(r.crew.every(c => !('uid' in c) && !('tz' in c)));
  const blocked = crew.list(s, ann, { hidden: (a, b) => b === 'u2', now: NOON });
  assert.deepEqual(blocked.crew.map(c => c.name), ['Cat']);
  assert.deepEqual(crew.list(s, dan, { now: NOON }).crew, []);
});

test('leaving hides you from the crew and the crew from you', () => {
  const s = crew.empty();
  crew.join(s, ann, { test: '2026-12-06', tz: SYD }, NOON);
  crew.join(s, bob, { test: '2026-12-06', tz: SYD }, NOON);
  crew.leave(s, bob, true);
  assert.deepEqual(crew.list(s, ann, { now: NOON }).crew, []);
  assert.deepEqual(crew.list(s, bob, { now: NOON }), { test: '2026-12-06', kind: 'pct', off: true, crew: [] });
  crew.leave(s, bob, false);
  assert.equal(crew.list(s, ann, { now: NOON }).crew.length, 1);
});

test('a finished session pings each crewmate once a day, never in their quiet hours', () => {
  const s = crew.empty();
  crew.join(s, ann, { test: '2026-12-06', tz: SYD }, NOON);
  crew.join(s, bob, { test: '2026-12-06', tz: SYD }, NOON);
  crew.join(s, cat, { test: '2026-12-06', tz: 0 }, NOON); // 2 am in London: asleep
  assert.deepEqual(crew.pingTargets(s, ann, { now: NOON }), ['u2']);
  assert.deepEqual(crew.pingTargets(s, ann, { now: NOON + 3600000 }), [], 'Bob was told today already');
  assert.deepEqual(crew.pingTargets(s, bob, { now: NOON }), ['u1'], 'Bob trains: Ann is told, Cat is asleep');
});

test('Ann is told when Bob trains, and the next day again', () => {
  const s = crew.empty();
  crew.join(s, ann, { test: '2026-12-06', tz: SYD }, NOON);
  crew.join(s, bob, { test: '2026-12-06', tz: SYD }, NOON);
  assert.deepEqual(crew.pingTargets(s, bob, { now: NOON }), ['u1']);
  assert.deepEqual(crew.pingTargets(s, bob, { now: NOON + 86400000 }), ['u1']);
  const late = Date.parse('2026-11-23T11:30:00Z'); // 10:30 pm in Sydney
  assert.deepEqual(crew.pingTargets(s, bob, { now: late + 2 * 86400000 }), []);
  crew.forgetUser(s, 'u1');
  assert.deepEqual(crew.pingTargets(s, bob, { now: NOON + 5 * 86400000 }), []);
});

test('memberIds: the crew as account ids, for the Crew feed, without the hidden or the out', () => {
  const s = crew.empty();
  const card = (test, name) => ({ test, name, colour: '#123456', ready: 50, tz: 600 });
  crew.join(s, { id: 'me', name: 'Me' }, card('2026-12-06', 'Me'));
  crew.join(s, { id: 'a', name: 'Ann' }, card('2026-12-07', 'Ann'));
  crew.join(s, { id: 'b', name: 'Bob' }, card('2026-12-06', 'Bob'));
  crew.join(s, { id: 'c', name: 'Cat' }, card('2027-01-20', 'Cat'));
  crew.join(s, { id: 'd', name: 'Dee' }, card('2026-12-06', 'Dee'));
  crew.leave(s, { id: 'd' });
  assert.deepEqual(crew.memberIds(s, { id: 'me' }, { hidden: (x, y) => y === 'b' }).sort(), ['a']);
  assert.deepEqual(crew.memberIds(s, { id: 'nobody' }), []);
});

test('an Academy intake is its own crew: never matched with PCT candidates on the same day', () => {
  const s = crew.empty();
  const card = (test, name, kind) => ({ test, kind, name, colour: '#123456', ready: 50, tz: 600 });
  crew.join(s, { id: 'me', name: 'Me' }, card('2027-02-15', 'Me', 'academy'));
  crew.join(s, { id: 'a', name: 'Ann' }, card('2027-02-15', 'Ann', 'academy'));
  crew.join(s, { id: 'p', name: 'Pat' }, card('2027-02-15', 'Pat', 'pct'));
  crew.join(s, { id: 'old', name: 'Old' }, { test: '2027-02-15', name: 'Old', colour: '#123456', ready: 1, tz: 0 });
  assert.deepEqual(crew.memberIds(s, { id: 'me' }).sort(), ['a']);
  assert.deepEqual(crew.memberIds(s, { id: 'p' }).sort(), ['old']);
  assert.equal(crew.list(s, { id: 'me' }).kind, 'academy');
});
