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
  assert.deepEqual(c.toggleCheer(f, bob, post.id), { cheers: 1, cheered: true });
  assert.deepEqual(c.toggleCheer(f, bob, post.id), { cheers: 0, cheered: false });
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

test('delete: your own, replies on your post, or anything as admin', () => {
  const f = c.emptyFeed();
  const { post } = c.addPost(f, ann, { text: 'hello' });
  const { reply } = c.addReply(f, bob, { id: post.id, text: 'hi' });
  assert.equal(c.remove(f, cat, { id: post.id }).status, 403);
  assert.equal(c.remove(f, ann, { id: post.id, replyId: reply.id }).deleted, true);
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
