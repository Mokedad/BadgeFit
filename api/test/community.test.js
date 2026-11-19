/* The BadgeFit community feed (community.js): posting, replies, cheers, reports, deletes and
 * what a viewer is shown. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../community.js';

const ann = { id: 'u1', name: 'Ann' }, bob = { id: 'u2', name: 'Bob' }, cat = { id: 'u3', name: 'Cat' }, dan = { id: 'u4', name: 'Dan' };

test('posts are cleaned, bounded and shown newest first without account ids', () => {
  const f = c.emptyFeed();
  assert.equal(c.addPost(f, ann, { text: '   ' }).error, 'write something first');
  c.addPost(f, ann, { text: 'Week 1 done!‮\n\n\n\nBeep 6.8', topic: 'win' }, 1);
  c.addPost(f, bob, { text: 'x'.repeat(5000), topic: 'nonsense' }, 2);
  const v = c.view(f, ann);
  assert.equal(v[0].name, 'Bob');
  assert.equal(v[0].text.length, c.MAX_POST);
  assert.equal(v[0].topic, 'journey');
  assert.equal(v[1].text, 'Week 1 done!\n\nBeep 6.8');
  assert.equal(v[1].mine, true);
  assert.ok(!JSON.stringify(v).includes('u1'));
});

test('replies and cheers', () => {
  const f = c.emptyFeed();
  const { post } = c.addPost(f, ann, { text: 'Grip at 29 kg, so close' });
  c.addReply(f, bob, { id: post.id, text: 'Farmers walks! You got this' });
  const on = c.toggleCheer(f, bob, post.id)
  assert.deepEqual([on.cheers, on.cheered, on.owner], [1, true, post.uid]);
  const off = c.toggleCheer(f, bob, post.id)
  assert.deepEqual([off.cheers, off.cheered], [0, false]);
  assert.equal(c.view(f, ann)[0].replies[0].name, 'Bob');
});

test('three reports hide a post from everyone but its author and admins', () => {
  const f = c.emptyFeed();
  const { post } = c.addPost(f, ann, { text: 'spam' });
  assert.equal(c.report(f, ann, post.id).error, 'that is your own post');
  c.report(f, bob, post.id); c.report(f, bob, post.id); c.report(f, cat, post.id);
  assert.equal(c.view(f, dan).length, 1, 'two different people are not enough');
  assert.equal(c.report(f, dan, post.id).hidden, true);
  assert.equal(c.view(f, bob).length, 0);
  assert.equal(c.view(f, ann).length, 1);
  assert.equal(c.view(f, bob, { admin: true })[0].reports, 3);
  c.restore(f, post.id);
  assert.equal(c.view(f, bob).length, 1);
});

test('delete: your own post or comment; a comment only by its writer; any post as admin', () => {
  const f = c.emptyFeed();
  const { post } = c.addPost(f, ann, { text: 'hello' });
  const { reply } = c.addReply(f, bob, { id: post.id, text: 'hi' });
  assert.equal(c.remove(f, cat, { id: post.id }).status, 403);
  // Not the post's author, not an admin: only Bob deletes Bob's comment.
  assert.equal(c.remove(f, ann, { id: post.id, replyId: reply.id }).status, 403);
  assert.equal(c.remove(f, cat, { id: post.id, replyId: reply.id }, true).status, 403);
  assert.equal(c.remove(f, bob, { id: post.id, replyId: reply.id }).deleted, true);
  assert.equal(c.remove(f, cat, { id: post.id }, true).deleted, true);
  assert.equal(f.posts.length, 0);
});

test('a deleted account takes its posts, replies, cheers and reports with it', () => {
  const f = c.emptyFeed();
  const a = c.addPost(f, ann, { text: 'mine' }).post;
  const b = c.addPost(f, bob, { text: 'his' }).post;
  c.addReply(f, ann, { id: b.id, text: 'nice' });
  c.toggleCheer(f, ann, b.id); c.report(f, ann, b.id);
  c.forgetUser(f, 'u1');
  assert.deepEqual(f.posts.map(p => p.id), [b.id]);
  assert.equal(f.posts[0].replies.length + f.posts[0].cheers.length + f.posts[0].reports.length, 0);
  assert.ok(a);
});

test('handles and the guest teaser', () => {
  const f = c.emptyFeed();
  const a = c.addPost(f, { id: 'u1', name: 'Ann' }, { text: 'Level 7.4!', topic: 'win', crew: '2026-12-06' }, 1000).post;
  c.addPost(f, { id: 'u2', name: 'Bob' }, { text: 'Hello', topic: 'journey', crew: 'nope' }, 2000);
  c.toggleCheer(f, { id: 'u2' }, a.id);
  const handle = uid => 'h-' + uid;
  const mine = c.view(f, { id: 'u1' }, { handle });
  assert.equal(mine.find(p => p.name === 'Ann').who, undefined);
  assert.equal(mine.find(p => p.name === 'Bob').who, 'h-u2');
  assert.equal(JSON.stringify(mine).includes('"u2"'), false);
  assert.deepEqual(c.uidByHandle(f, handle, 'h-u1'), { uid: 'u1', name: 'Ann' });
  assert.deepEqual(c.teaser(f, 3000), { posts: 2, wins: 1, cheers: 1, people: 2 });
  assert.deepEqual(c.teaser(f, 3000 + 8 * 86400000).posts, 0);
});

test('areas, search, following, blocks, best answers and shared plans', () => {
  const f = c.emptyFeed();
  const ann = { id: 'u1', name: 'Ann' }, bob = { id: 'u2', name: 'Bob' };
  const q = c.addPost(f, ann, { text: 'Grip test: how is it set up?', topic: 'question', area: 'apply', stage: 'applicant' }, 1000).post;
  const ses = c.addPost(f, bob, { text: '', topic: 'journey', stage: 'academy', session: { title: 'Shuttle sprints', minutes: 25, done: true, secret: 'x' } }, 2000).post;
  assert.deepEqual(ses.session, { title: 'Shuttle sprints', minutes: 25, done: true });
  assert.equal(c.addPost(f, bob, { text: '' }).error, 'write something first');
  const plan = c.addPost(f, bob, { topic: 'journey', plan: { name: 'Base', level: 'pro', routines: [{ name: 'A', ex: [{ id: '0025', sets: 99, reps: 10 }, { id: '<script>', sets: 3 }, { id: '0463', mode: 'time', sec: 60, sets: 3 }] }, { name: 'empty', ex: [] }] } }, 3000).post;
  assert.deepEqual(plan.plan, { name: 'Base', level: 'beginner', routines: [{ name: 'A', ex: [{ id: '0025', sets: 12, reps: 10, repsMin: 10 }, { id: '0463', sets: 3, mode: 'time', sec: 60 }] }] });
  assert.deepEqual(c.view(f, ann, { area: 'apply' }).map(p => p.id), [q.id]);
  assert.deepEqual(c.view(f, ann, { q: 'shuttle' }).map(p => p.id), [ses.id]);
  assert.deepEqual(c.view(f, ann, { authors: new Set(['u2']) }).map(p => p.id), [plan.id, ses.id]);
  assert.deepEqual(c.view(f, ann, { blocked: uid => uid === 'u2' }).map(p => p.id), [q.id]);
  const shown = c.view(f, ann, { fresh: () => true }).find(p => p.id === plan.id);
  assert.deepEqual([shown.planNew, shown.planFollowers, shown.planFollowed, shown.stage], [true, 0, false, undefined]);
  const fp = c.followPlan(f, ann, plan.id);
  assert.deepEqual([fp.planFollowers, fp.planFollowed, fp.owner], [1, true, 'u2']);
  assert.equal(c.followPlan(f, ann, q.id).error, 'plan not found');
  const { reply } = c.addReply(f, bob, { id: q.id, text: 'Arm by your side, best of two' });
  assert.equal(c.markBest(f, bob, { id: q.id, replyId: reply.id }).status, 403);
  assert.equal(c.markBest(f, ann, { id: q.id, replyId: reply.id }).owner, 'u2');
  assert.equal(c.view(f, bob).find(p => p.id === q.id).replies[0].best, true);
  assert.equal(c.markBest(f, ann, { id: q.id, replyId: reply.id }).best, null);
});

test('your own comment can be edited, nobody else\'s', () => {
  const f = c.emptyFeed();
  const { post } = c.addPost(f, ann, { text: 'Beep 7 today' }, 1);
  const { reply } = c.addReply(f, bob, { id: post.id, text: 'nice' }, 2);
  assert.equal(c.editReply(f, ann, { id: post.id, replyId: reply.id, text: 'hacked' }).status, 403);
  assert.equal(c.editReply(f, bob, { id: post.id, replyId: reply.id, text: '  ' }).error, 'write something first');
  assert.deepEqual(c.editReply(f, bob, { id: post.id, replyId: reply.id, text: 'Nice work!' }).reply, { id: reply.id, text: 'Nice work!', edited: true });
  const seen = c.view(f, ann)[0].replies[0];
  assert.equal(seen.text, 'Nice work!');
  assert.equal(seen.edited, true);
});

test('a shared week: seven days of gym, run or rest, shown with the post; a bad one is dropped', () => {
  const f = c.emptyFeed();
  const days = ['gym', 'run', 'gym', 'run', 'gym', 'run', 'rest'].map((k, i) => ({ k, name: 'Day ' + i }))
  const { post } = c.addPost(f, ann, { week: { label: 'Week 3 of 12', days } }, 1);
  assert.equal(post.week.days.length, 7);
  assert.equal(c.view(f, bob)[0].week.label, 'Week 3 of 12');
  assert.equal(c.cleanWeek({ days: days.slice(0, 3) }), null);
  assert.equal(c.cleanWeek({ days: days.map(d => ({ ...d, k: 'swim' })) }).days[0].k, 'rest');
  // The author's colour, when known, rides along for their Hayden.
  assert.equal(c.view(f, bob, { colour: uid => (uid === 'u1' ? '#3fb6ff' : null) })[0].colour, '#3fb6ff');
});

test('reactions: one each, a new kind replaces it, the same kind takes it off; old cheers read as love', () => {
  const f = c.emptyFeed();
  const { post } = c.addPost(f, ann, { text: 'Beep 7.5!' }, 1);
  post.cheers = ['u3'];   // a cheer from before reactions
  assert.equal(c.react(f, bob, post.id, 'nope').error, 'unknown reaction');
  let r = c.react(f, bob, post.id, 'fire');
  assert.deepEqual([r.reacts, r.cheers, r.myReact, r.added], [{ love: 1, fire: 1 }, 2, 'fire', true]);
  r = c.react(f, bob, post.id, 'strong');
  assert.deepEqual(r.reacts, { love: 1, strong: 1 });
  r = c.react(f, bob, post.id, 'strong');
  assert.deepEqual([r.reacts, r.myReact, r.added], [{ love: 1 }, null, false]);
  assert.deepEqual(c.toggleCheer(f, bob, post.id).cheered, true);
  const seen = c.view(f, bob)[0];
  assert.deepEqual([seen.reacts, seen.myReact, seen.cheers], [{ love: 2 }, 'love', 2]);
});

test('a heart on a comment, and off again', () => {
  const f = c.emptyFeed();
  const { post } = c.addPost(f, ann, { text: 'hi' }, 1);
  const { reply } = c.addReply(f, bob, { id: post.id, text: 'nice' }, 2);
  assert.deepEqual([c.likeReply(f, ann, { id: post.id, replyId: reply.id }).likes, c.likeReply(f, cat, { id: post.id, replyId: reply.id }).liked], [1, true]);
  assert.deepEqual([c.view(f, ann)[0].replies[0].likes, c.view(f, ann)[0].replies[0].liked, c.view(f, bob)[0].replies[0].liked], [2, true, false]);
  assert.equal(c.likeReply(f, ann, { id: post.id, replyId: reply.id }).liked, false);
});

test('a comment takes any of the five; a tap is a heart', () => {
  const f = c.emptyFeed();
  const { post } = c.addPost(f, ann, { text: 'hi' }, 1);
  const { reply } = c.addReply(f, bob, { id: post.id, text: 'nice' }, 2);
  assert.equal(c.likeReply(f, ann, { id: post.id, replyId: reply.id, kind: 'fire' }).myReact, 'fire');
  c.likeReply(f, cat, { id: post.id, replyId: reply.id });
  const seen = c.view(f, ann)[0].replies[0];
  assert.deepEqual([seen.likes, seen.myReact, seen.reacts], [2, 'fire', { fire: 1, love: 1 }]);
  assert.equal(c.likeReply(f, ann, { id: post.id, replyId: reply.id, kind: 'party' }).error, 'unknown reaction');
});
