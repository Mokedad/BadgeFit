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
export const AREAS = ['pct', 'apply', 'academy', 'grads'];
export const STAGES = ['applicant', 'passed', 'academy', 'graduate'];
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

/** Today's session as shared: a name, minutes, done or still to do. Nothing else of the plan. */
export function cleanSession(x) {
  const title = clean(x?.title, 60);
  return title ? { title, minutes: int(x.minutes, 0, 600), done: x.done === true } : null;
}

/**
 * A shared plan: up to 7 sessions of up to 20 exercises, by catalogue id and numbers only (no
 * free text beyond the names), so it can be followed as it is and nothing in it needs checking.
 */
export function cleanPlan(x) {
  const name = clean(x?.name, 60);
  const routines = (Array.isArray(x?.routines) ? x.routines : []).slice(0, 7).map(r => ({
    name: clean(r?.name, 60) || 'Session',
    ex: (Array.isArray(r?.ex) ? r.ex : []).slice(0, 20).filter(e => /^[\w-]{1,16}$/.test(String(e?.id || ''))).map(e => ({
      id: String(e.id), sets: int(e.sets, 1, 12),
      ...(e.mode === 'time' ? { mode: 'time', sec: int(e.sec, 5, 3600) } : e.mode === 'cardio' ? { mode: 'cardio', min: int(e.min, 1, 300) } : { reps: int(e.reps, 1, 100), repsMin: int(e.repsMin || e.reps, 1, 100) }),
    })),
  })).filter(r => r.ex.length);
  if (!name || !routines.length) return null;
  return { name, level: x.level === 'intermediate' ? 'intermediate' : 'beginner', routines };
}

/**
 * The feed as one viewer sees it: newest first, hidden posts only for admins, ids of people never.
 * `handle(uid)` gives the opaque handle someone can be followed by (nearby.js), shown as `who` on
 * other people's posts and replies. Filters: `area` (a topic area), `q` (words to find),
 * `authors` (only these people: the Following tab, or one person's page), `blocked(uid)` (people
 * the viewer hid, or who hid them), `fresh(uid)` (a plan's author has trained under two weeks).
 */
export function view(feed, viewer, { admin = false, before = null, handle = null, area = null, q = null, authors = null, blocked = null, fresh = null, colour = null } = {}) {
  let posts = (feed.posts || []).filter(p => admin || !p.hidden || p.uid === viewer?.id);
  if (blocked) posts = posts.filter(p => !blocked(p.uid));
  if (area) posts = posts.filter(p => p.area === area);
  if (authors) posts = posts.filter(p => authors.has(p.uid));
  const words = clean(q, 60).toLowerCase();
  if (words) posts = posts.filter(p => [p.text, p.name, p.plan?.name, p.session?.title, ...(p.replies || []).map(r => r.text)].some(t => String(t || '').toLowerCase().includes(words)));
  posts = posts.slice().sort((a, b) => b.at - a.at);
  if (before) posts = posts.filter(p => p.at < before);
  const who = uid => ({ ...(handle && uid !== viewer?.id ? { who: handle(uid) } : {}), ...(colour && colour(uid) ? { colour: colour(uid) } : {}) });
  return posts.slice(0, PAGE).map(p => ({
    id: p.id, name: p.name, topic: p.topic, text: p.text, at: p.at,
    ...(p.area && { area: p.area }), ...(p.stage && { stage: p.stage }), ...(p.session && { session: p.session }), ...(p.week && { week: p.week }),
    ...(p.plan && { plan: p.plan, planFollowers: (p.planFollowers || []).length, planFollowed: (p.planFollowers || []).includes(viewer?.id), ...(fresh && fresh(p.uid) && { planNew: true }) }),
    cheers: (p.cheers || []).length, cheered: (p.cheers || []).includes(viewer?.id),
    mine: p.uid === viewer?.id, hidden: !!p.hidden, ...who(p.uid),
    ...(admin && { reports: (p.reports || []).length }),
    replies: (p.replies || []).filter(r => !blocked || !blocked(r.uid)).map(r => ({ id: r.id, name: r.name, text: r.text, at: r.at, mine: r.uid === viewer?.id, ...(r.edited && { edited: true }), ...(p.best === r.id && { best: true }), ...who(r.uid) })),
  }));
}

/** The asker marks the answer that helped (or unmarks it). Only on their own post. */
export function markBest(feed, user, { id, replyId }) {
  const post = (feed.posts || []).find(p => p.id === id);
  if (!post) return { error: 'post not found' };
  if (post.uid !== user.id) return { error: 'only the person who asked can pick', status: 403 };
  const r = (post.replies || []).find(x => x.id === replyId);
  if (!r) return { error: 'reply not found' };
  post.best = post.best === replyId ? null : replyId;
  return { best: post.best, owner: post.best ? r.uid : null, post };
}

/** Follow a shared plan (or stop): counted, so plans that work rise. */
export function followPlan(feed, user, id) {
  const post = (feed.posts || []).find(p => p.id === id);
  if (!post || !post.plan) return { error: 'plan not found' };
  const set = new Set(post.planFollowers || []);
  set.has(user.id) ? set.delete(user.id) : set.add(user.id);
  post.planFollowers = [...set];
  return { planFollowers: set.size, planFollowed: set.has(user.id), plan: post.plan, owner: post.uid, post };
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

/**
 * A week as shared from Plan ("Share my week"): the label and seven days, each gym, run or rest,
 * with a short name. Shown as a coloured strip; the plan itself (to try) rides along as `plan`.
 */
const KINDS = ['gym', 'run', 'rest'];
export function cleanWeek(x) {
  const days = (Array.isArray(x?.days) ? x.days : []).slice(0, 7).map(d => ({ k: KINDS.includes(d?.k) ? d.k : 'rest', name: clean(d?.name, 40) }));
  if (days.length !== 7) return null;
  return { label: clean(x?.label, 60) || 'My week', days };
}

/** Adds a post; returns { post } or { error }. */
export function addPost(feed, user, { text, topic, crew, area, stage, session, plan, week }, now = Date.now()) {
  const t = clean(text, MAX_POST);
  const ses = cleanSession(session), pl = cleanPlan(plan), wk = cleanWeek(week);
  // Today's session, a plan or a week can stand without words.
  if (!t && !ses && !pl && !wk) return { error: 'write something first' };
  const post = { id: newId(), uid: user.id, name: nameOf(user), topic: TOPICS.includes(topic) ? topic : 'journey', text: t, at: now, cheers: [], reports: [], replies: [] };
  if (AREAS.includes(area)) post.area = area;
  if (STAGES.includes(stage)) post.stage = stage;
  if (ses) post.session = ses;
  if (pl) post.plan = pl;
  if (wk) post.week = wk;
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

/** Changes the words of your own reply (Instagram's Edit). */
export function editReply(feed, user, { id, replyId, text }) {
  const post = find(feed, id);
  if (!post) return { error: 'post not found' };
  const r = (post.replies || []).find(x => x.id === replyId);
  if (!r) return { error: 'reply not found' };
  if (r.uid !== user.id) return { error: 'only your own comments can be edited', status: 403 };
  const t = clean(text, MAX_REPLY);
  if (!t) return { error: 'write something first' };
  r.text = t;
  r.edited = true;
  return { reply: { id: r.id, text: r.text, edited: true } };
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
    planFollowers: (p.planFollowers || []).filter(x => x !== uid),
    reports: (p.reports || []).filter(x => x !== uid),
  }));
}
