/* BadgeFit bots nearby (nearby.js): who is near, likes and loves, follows, hides, the bell. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as n from '../nearby.js';

const ann = { id: 'u1', name: 'Ann Smith' }, bob = { id: 'u2', name: 'Bob' }, cat = { id: 'u3', name: 'Cat' };
const GYM = { lat: -33.7500, lon: 150.7700 };
const NEXT_DOOR = { lat: -33.7510, lon: 150.7700 };   // ~110 m away
const TOWN = { lat: -33.7700, lon: 150.7700 };        // ~2.2 km away

test('people within about 300 m see each other; no ids, no distance', () => {
  const st = n.emptyState(), so = n.emptySocial();
  n.ping(st, so, bob, { ...NEXT_DOOR, card: { name: 'Bob', colour: '#3fb6ff', gear: ['headband', 'jetpack'], stats: { week: 3, ready: 140 } } }, 1000);
  n.ping(st, so, cat, { ...TOWN, card: { name: 'Cat' } }, 1000);
  const r = n.ping(st, so, ann, { ...GYM, card: { name: 'Ann Smith' } }, 2000);
  assert.equal(r.near.length, 1);
  const b = r.near[0];
  assert.deepEqual({ name: b.name, colour: b.colour, gear: b.gear, stats: b.stats }, { name: 'Bob', colour: '#3fb6ff', gear: ['headband'], stats: { week: 3, ready: 100, streak: 0 } });
  assert.equal(JSON.stringify(r).includes('u2'), false);
  assert.equal('lat' in b || 'd' in b, false);
});

test('gone after three minutes, or when they leave', () => {
  const st = n.emptyState(), so = n.emptySocial();
  n.ping(st, so, bob, { ...NEXT_DOOR }, 0);
  assert.equal(n.ping(st, so, ann, { ...GYM }, n.TTL_MS + 1).near.length, 0);
  n.ping(st, so, bob, { ...NEXT_DOOR }, 10);
  n.leave(st, bob);
  assert.equal(n.ping(st, so, ann, { ...GYM }, 20).near.length, 0);
});

test('a like or love arrives once, not twice in a few seconds', () => {
  const st = n.emptyState(), so = n.emptySocial();
  n.ping(st, so, bob, { ...NEXT_DOOR, card: { name: 'Bob' } }, 0);
  const id = n.ping(st, so, ann, { ...GYM, card: { name: 'Ann', colour: '#ff5fa2' } }, 0).near[0].id;
  assert.equal(n.cheer(st, so, ann, { id, kind: 'love' }, 100).ok, true);
  assert.equal(n.cheer(st, so, ann, { id, kind: 'love' }, 200).status, 429);
  assert.equal(n.cheer(st, so, ann, { id, kind: 'hug' }, 9000).status, 400);
  // It says who it is for and from; server.js puts it in their saved inbox (cheers.js).
  const sent = n.cheer(st, so, ann, { id, kind: 'like' }, 6000);
  assert.deepEqual([sent.to, sent.from, sent.kind, sent.colour], ['u2', 'Ann', 'like', '#ff5fa2']);
  assert.equal('inbox' in n.ping(st, so, bob, { ...NEXT_DOOR }, 300), false);
});

test('follow fills the bell, active first; a hide undoes it both ways and for good', () => {
  const st = n.emptyState(), so = n.emptySocial();
  n.ping(st, so, bob, { ...NEXT_DOOR, card: { name: 'Bob' } }, 0);
  const id = n.ping(st, so, ann, { ...GYM }, 0).near[0].id;
  n.follow(st, so, ann, { id });
  assert.equal(n.ping(st, so, ann, { ...GYM }, 10).near[0].followed, true);
  let b = n.bell(st, so, ann, 20).people;
  assert.deepEqual(b.map(p => [p.name, p.active]), [['Bob', true]]);
  b = n.bell(st, so, ann, n.TTL_MS + 100).people;
  assert.deepEqual(b.map(p => [p.name, p.active, p.stats]), [['Bob', false, null]]);
  n.ping(st, so, bob, { ...NEXT_DOOR }, 30)
  n.hide(st, so, ann, { id });
  assert.equal(n.ping(st, so, ann, { ...GYM }, 40).near.length, 0);
  assert.equal(n.ping(st, so, bob, { ...NEXT_DOOR }, 50).near.length, 0);
  assert.equal(n.bell(st, so, ann, 60).people.length, 0);
  assert.equal(n.cheer(st, so, ann, { id, kind: 'like' }, 70).status, 404);
});

test('a deleted account is forgotten', () => {
  const st = n.emptyState(), so = n.emptySocial();
  n.ping(st, so, bob, { ...NEXT_DOOR }, 0);
  n.follow(st, so, ann, { id: n.ping(st, so, ann, { ...GYM }, 0).near[0].id });
  n.forgetUser(st, so, 'u2');
  assert.deepEqual(so.follows.u1, []);
  assert.equal(n.ping(st, so, ann, { ...GYM }, 10).near.length, 0);
});

test('someone from the feed can be remembered, then followed and cheered', () => {
  const st = n.emptyState(), so = n.emptySocial();
  const id = n.remember(st, so, 'u2', 'Bob Jones');
  assert.equal(id, n.handleOf(st, 'u2'));
  assert.equal(n.follow(st, so, ann, { id }).followed, true);
  assert.deepEqual(n.bell(st, so, ann, 10).people.map(p => [p.name, p.active]), [['Bob', false]]);
  assert.equal(n.cheer(st, so, ann, { id, kind: 'love' }, 20).to, 'u2');
});

test('presence without a place: followers see you about, and training first', () => {
  const st = n.emptyState(), so = n.emptySocial();
  const id = n.remember(st, so, 'u2', 'Bob');
  n.follow(st, so, ann, { id });
  assert.deepEqual(n.presence(st, so, ann, {}, 0).live, []);
  n.presence(st, so, bob, { card: { name: 'Bob', training: true } }, 10);
  const live = n.presence(st, so, ann, {}, 20).live;
  assert.deepEqual(live.map(p => [p.name, p.training]), [['Bob', true]]);
  assert.deepEqual(n.bell(st, so, ann, 30).people.map(p => [p.name, p.active, p.training]), [['Bob', true, true]]);
  assert.equal(n.presence(st, so, ann, {}, n.TTL_MS + 100).live.length, 0);
  n.presence(st, so, bob, { card: { name: 'Bob', training: 'yes' } }, n.TTL_MS + 200);
  assert.equal(n.bell(st, so, ann, n.TTL_MS + 300).people[0].training, false);
});

test("a member's page: stage, today, counts, and nothing for someone hidden", () => {
  const st = n.emptyState(), so = n.emptySocial();
  n.presence(st, so, bob, { card: { name: 'Bob', stage: 'academy', today: { title: 'Shuttle sprints', done: true, plan: 'x' }, training: true } }, 0);
  const id = n.handleOf(st, 'u2');
  n.follow(st, so, ann, { id });
  let p = n.person(st, so, ann, id, 10);
  assert.deepEqual([p.name, p.stage, p.today, p.followers, p.following, p.followed, p.followsYou, p.active], ['Bob', 'academy', { title: 'Shuttle sprints', done: true }, 1, 0, true, false, true]);
  p = n.person(st, so, ann, id, n.TTL_MS + 100);
  assert.deepEqual([p.name, p.stage, p.today, p.stats, p.active], ['Bob', 'academy', undefined, null, false]);
  n.hide(st, so, ann, { id });
  assert.equal(n.person(st, so, ann, id, 20), null);
  assert.equal(n.person(st, so, ann, 'nobody', 20), null);
});

test('unblock: see each other again, follow again by choice; followers listed', () => {
  const st = n.emptyState(), so = n.emptySocial();
  const id = n.remember(st, so, 'u2', 'Bob');
  n.follow(st, so, ann, { id });
  n.hide(st, so, ann, { id });
  assert.deepEqual(n.hiddenList(st, so, ann).people.map(p => [p.id, p.name]), [[id, 'Bob']]);
  assert.equal(n.person(st, so, ann, id), null);
  assert.equal(n.unhide(st, so, ann, { id }).ok, true);
  assert.equal(n.unhide(st, so, ann, { id }).status, 404);
  assert.equal(n.person(st, so, ann, id).followed, false);
  n.follow(st, so, ann, { id });
  assert.deepEqual(n.followersOf(so, 'u2'), ['u1']);
});

test("everyone follows the owner's account once; an unfollow or a block is kept", () => {
  const social = n.emptySocial();
  assert.equal(n.autoFollow(social, 'u1', 'owner'), true);
  assert.deepEqual(social.follows.u1, ['owner']);
  assert.ok(n.followersOf(social, 'owner').includes('u1'));
  // Not twice, and not again after an unfollow.
  assert.equal(n.autoFollow(social, 'u1', 'owner'), false);
  social.follows.u1 = [];
  assert.equal(n.autoFollow(social, 'u1', 'owner'), false);
  assert.deepEqual(social.follows.u1, []);
  // The owner does not follow themselves; no owner, nothing.
  assert.equal(n.autoFollow(social, 'owner', 'owner'), false);
  assert.equal(n.autoFollow(social, 'u2', null), false);
  // Someone who blocked the owner first is not made to follow.
  social.hidden.u3 = ['owner'];
  assert.equal(n.autoFollow(social, 'u3', 'owner'), false);
  assert.equal((social.follows.u3 || []).length, 0);
  // A deleted account is forgotten here too.
  n.forgetUser(n.emptyState(), social, 'u1');
  assert.equal(social.autoFollowed.u1, undefined);
});

test('the owner follows every new member back once, unless switched off', () => {
  const s = n.emptySocial();
  assert.equal(n.ownerFollowsBack(s, 'u2', 'u1'), true);
  assert.deepEqual(s.follows.u1, ['u2']);
  assert.equal(n.ownerFollowsBack(s, 'u2', 'u1'), false);
  // Unfollowed afterwards: never followed back in again.
  s.follows.u1 = [];
  assert.equal(n.ownerFollowsBack(s, 'u2', 'u1'), false);
  assert.equal(n.ownerFollowsBack(s, 'u1', 'u1'), false);
  s.ownerAuto = false;
  assert.equal(n.ownerFollowsBack(s, 'u3', 'u1'), false);
  assert.deepEqual(s.follows.u1, []);
});
