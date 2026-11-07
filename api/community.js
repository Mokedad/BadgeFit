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
export function view(feed, viewer, { admin = false, before = null } = {}) {
  let posts = (feed.posts || []).filter(p => admin || !p.hidden || p.uid === viewer?.id);
  posts = posts.slice().sort((a, b) => b.at - a.at);
  if (before) posts = posts.filter(p => p.at < before);
  return posts.slice(0, PAGE).map(p => ({
    id: p.id, name: p.name, topic: p.topic, text: p.text, at: p.at,
    cheers: (p.cheers || []).length, cheered: (p.cheers || []).includes(viewer?.id),
    mine: p.uid === viewer?.id, hidden: !!p.hidden,
    ...(admin && { reports: (p.reports || []).length }),
    replies: (p.replies || []).map(r => ({ id: r.id, name: r.name, text: r.text, at: r.at, mine: r.uid === viewer?.id })),
  }));
}

/** Adds a post; returns { post } or { error }. */
export function addPost(feed, user, { text, topic }, now = Date.now()) {
  const t = clean(text, MAX_POST);
  if (!t) return { error: 'write something first' };
  const post = { id: newId(), uid: user.id, name: nameOf(user), topic: TOPICS.includes(topic) ? topic : 'journey', text: t, at: now, cheers: [], reports: [], replies: [] };
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
  return { reply };
}

/** Cheer on, or off again. */
export function toggleCheer(feed, user, id) {
  const post = find(feed, id);
  if (!post) return { error: 'post not found' };
  const set = new Set(post.cheers || []);
  set.has(user.id) ? set.delete(user.id) : set.add(user.id);
  post.cheers = [...set];
  return { cheers: post.cheers.length, cheered: set.has(user.id) };
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
