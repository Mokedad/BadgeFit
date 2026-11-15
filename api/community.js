/* The BadgeFit community: one shared feed for everyone signed in to this server. "You become
 * who you hang out with": people post wins, questions and their journey, others cheer and reply.
 *
 * Pure store logic over a plain object { posts: [...] }, saved by server.js (DATA_DIR/community.json,
 * written temp-then-rename like every other file). The routes live in server.js.
 *
 * Safety: text only (no links rendered, no media), length limits, a per-user budget, and reports.
 * Three reports from different people hide a post until an admin looks; an admin can delete
 * anything, a person their own posts and replies. Only first names leave the server: the name
 * someone chose, never their account id.
 */
import crypto from 'node:crypto';

export const TOPICS = ['win', 'question', 'journey', 'motivation'];
export const MAX_POST = 1000;
export const MAX_REPLY = 500;
export const MAX_POSTS = 2000;          // the oldest beyond this are dropped
export const MAX_REPLIES = 100;
export const PAGE = 50;
export const HIDE_AFTER_REPORTS = 3;

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const newId = () => crypto.randomBytes(8).toString('hex');
const nameOf = user => clean(user?.name || 'Recruit', 40) || 'Recruit';

export const emptyFeed = () => ({ posts: [] });

/** The feed as one viewer sees it: newest first, hidden posts only for admins, ids of people never. */
/**
 * The feed as one viewer sees it: newest first, hidden posts only for admins, ids of people never.
 * `handle(uid)` gives the opaque handle someone can be followed by (nearby.js), shown as `who` on
 * other people's posts and replies. `crew` (a test date) keeps to the people training for it.
 */
export function view(feed, viewer, { admin = false, before = null, handle = null, crew = null } = {}) {
  let posts = (feed.posts || []).filter(p => admin || !p.hidden || p.uid === viewer?.id);
  if (crew) posts = posts.filter(p => p.crew === crew);
  posts = posts.slice().sort((a, b) => b.at - a.at);
  if (before) posts = posts.filter(p => p.at < before);
  const who = uid => (handle && uid !== viewer?.id ? { who: handle(uid) } : {});
  return posts.slice(0, PAGE).map(p => ({
    id: p.id, name: p.name, topic: p.topic, text: p.text, at: p.at, ...(p.crew && { crew: p.crew }),
    cheers: (p.cheers || []).length, cheered: (p.cheers || []).includes(viewer?.id),
    mine: p.uid === viewer?.id, hidden: !!p.hidden, ...who(p.uid),
    ...(admin && { reports: (p.reports || []).length }),
    replies: (p.replies || []).map(r => ({ id: r.id, name: r.name, text: r.text, at: r.at, mine: r.uid === viewer?.id, ...who(r.uid) })),
  }));
}

/** The uid behind a handle, among the people in the feed (to follow someone met here). */
export function uidByHandle(feed, handle, hid) {
  for (const p of feed.posts || []) {
    if (handle(p.uid) === hid) return { uid: p.uid, name: p.name };
    for (const r of p.replies || []) if (handle(r.uid) === hid) return { uid: r.uid, name: r.name };
  }
  return null;
}

/** What a guest may see without an account: how busy the crew is this week, no names, no words. */
export function teaser(feed, now = Date.now()) {
  const week = (feed.posts || []).filter(p => !p.hidden && now - p.at < 7 * 86400000);
  return { posts: week.length, wins: week.filter(p => p.topic === 'win').length, cheers: week.reduce((a, p) => a + (p.cheers || []).length, 0), people: new Set(week.map(p => p.uid)).size };
}

/** Adds a post; returns { post } or { error }. */
export function addPost(feed, user, { text, topic, crew }, now = Date.now()) {
  const t = clean(text, MAX_POST);
  if (!t) return { error: 'write something first' };
  const post = { id: newId(), uid: user.id, name: nameOf(user), topic: TOPICS.includes(topic) ? topic : 'journey', text: t, at: now, cheers: [], reports: [], replies: [] };
  // The crew: people training for the same test date (YYYY-MM-DD), so they can find each other.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(crew || ''))) post.crew = String(crew);
  feed.posts = [...(feed.posts || []), post].slice(-MAX_POSTS);
  return { post };
}

const find = (feed, id) => (feed.posts || []).find(p => p.id === id) || null;

export function addReply(feed, user, { id, text }, now = Date.now()) {
  const post = find(feed, id);
  if (!post || post.hidden) return { error: 'post not found' };
  const t = clean(text, MAX_REPLY);
  if (!t) return { error: 'write something first' };
  if ((post.replies || []).length >= MAX_REPLIES) return { error: 'this post has all the replies it can take' };
  const reply = { id: newId(), uid: user.id, name: nameOf(user), text: t, at: now };
  post.replies = [...(post.replies || []), reply];
  // owner: who to tell (server.js, cheers.js); never sent to the client.
  return { reply, owner: post.uid, post };
}

/** Cheer on, or off again. */
export function toggleCheer(feed, user, id) {
  const post = find(feed, id);
  if (!post) return { error: 'post not found' };
  const set = new Set(post.cheers || []);
  set.has(user.id) ? set.delete(user.id) : set.add(user.id);
  post.cheers = [...set];
  return { cheers: post.cheers.length, cheered: set.has(user.id), owner: post.uid, post };
}

export function report(feed, user, id) {
  const post = find(feed, id);
  if (!post) return { error: 'post not found' };
  if (post.uid === user.id) return { error: 'that is your own post' };
  const set = new Set(post.reports || []);
  set.add(user.id);
  post.reports = [...set];
  if (set.size >= HIDE_AFTER_REPORTS) post.hidden = true;
  return { reported: true, hidden: !!post.hidden };
}

/** Deletes a post (or one reply, with replyId). Own content, or anything for an admin. */
export function remove(feed, user, { id, replyId }, admin = false) {
  const post = find(feed, id);
  if (!post) return { error: 'post not found' };
  if (replyId) {
    const r = (post.replies || []).find(x => x.id === replyId);
    if (!r) return { error: 'reply not found' };
    if (!admin && r.uid !== user.id && post.uid !== user.id) return { error: 'not yours to delete', status: 403 };
    post.replies = post.replies.filter(x => x.id !== replyId);
    return { deleted: true };
  }
  if (!admin && post.uid !== user.id) return { error: 'not yours to delete', status: 403 };
  feed.posts = feed.posts.filter(p => p.id !== id);
  return { deleted: true };
}

/** An admin clears the reports and shows a post again. */
export function restore(feed, id) {
  const post = find(feed, id);
  if (!post) return { error: 'post not found' };
  post.hidden = false;
  post.reports = [];
  return { restored: true };
}

/** A user leaving: their posts, replies, cheers and reports go with them. */
export function forgetUser(feed, uid) {
  feed.posts = (feed.posts || []).filter(p => p.uid !== uid).map(p => ({
    ...p,
    replies: (p.replies || []).filter(r => r.uid !== uid),
    cheers: (p.cheers || []).filter(x => x !== uid),
    reports: (p.reports || []).filter(x => x !== uid),
  }));
}
