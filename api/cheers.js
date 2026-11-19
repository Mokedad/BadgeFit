/* BadgeFit cheers that arrive: everything someone sends you (a cheer on your post, a reply, a
 * love or a like through their Hayden) waits in your inbox here until your app picks it up, which
 * Hayden then shows as a bubble. Saved by server.js in DATA_DIR/cheers.json (temp-then-rename),
 * so a restart loses nothing. Only first names and a few words leave the server, never an id.
 *
 * Pure store logic over a plain object { inbox: { [uid]: [item] } }.
 */
import crypto from 'node:crypto';

export const MAX = 30;              // per person: the oldest beyond this are dropped
export const KEEP_MS = 14 * 86400000; // a cheer nobody picked up in two weeks is let go
export const KINDS = ['love', 'like', 'cheer', 'reply', 'best', 'plan', 'follow', 'post', 'fire', 'strong', 'win', 'wow'];
export const HISTORY = 40;        // what the bell keeps, per person

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const firstName = s => clean(s, 40).split(' ')[0].replace(/[^\p{L}\p{N}'-]/gu, '').slice(0, 20) || 'Recruit';

export const empty = () => ({ inbox: {}, history: {} });

/**
 * One cheer for `to`. `what` says what it was for ("your win: Hit 7.4 on…"), short. A second cheer
 * of the same kind from the same person for the same thing replaces the first, so tapping Cheer
 * on and off and on again sends one, not three.
 */
export function add(store, to, { from, colour, kind, what = '', ref = '', uid = null }, now = Date.now()) {
  if (!to || !KINDS.includes(kind)) return null;
  const item = {
    // Who sent it (kept on the server only, so the bell can offer Follow back).
    ...(uid && { uid: String(uid) }),
    id: crypto.randomBytes(6).toString('hex'),
    from: firstName(from), colour: /^#[0-9a-f]{6}$/i.test(colour || '') ? colour : '#9aa3b2',
    kind, what: clean(what, 80), ref: clean(ref, 32), at: now,
  };
  const box = (store.inbox[to] || []).filter(x => now - x.at < KEEP_MS && !(x.kind === item.kind && x.from === item.from && x.ref && x.ref === item.ref));
  store.inbox[to] = [...box, item].slice(-MAX);
  // The bell: everything sent, newest last, kept after the bubble has shown it.
  store.history ||= {};
  const same = x => x.kind === item.kind && x.from === item.from && x.ref && x.ref === item.ref;
  store.history[to] = [...(store.history[to] || []).filter(x => now - x.at < 60 * 86400000 && !same(x)), item].slice(-HISTORY);
  return item;
}

/** Everything waiting for `uid`, oldest first, and the inbox emptied. */
export function take(store, uid, now = Date.now()) {
  const box = (store.inbox[uid] || []).filter(x => now - x.at < KEEP_MS);
  delete store.inbox[uid];
  return box;
}

/** The bell's list for `uid`, newest first. */
export const history = (store, uid) => (store.history?.[uid] || []).slice().reverse();

/** How many are waiting, without taking them. */
export const count = (store, uid) => (store.inbox[uid] || []).length;

/** An account deleted: its inbox goes. (What it sent stays, by first name only.) */
export function forgetUser(store, uid) {
  delete store.inbox[uid];
  if (store.history) {
    delete store.history[uid];
    for (const k of Object.keys(store.history)) store.history[k] = store.history[k].filter(x => x.uid !== uid);
  }
  for (const k of Object.keys(store.inbox)) store.inbox[k] = store.inbox[k].filter(x => x.uid !== uid);
}

/** "your win: Hit 7.4 on the beep test" for a post. */
export function postLabel(post) {
  const kind = { win: 'your win', question: 'your question', journey: 'your post', motivation: 'your post' }[post?.topic] || 'your post';
  const words = clean(post?.text, 60);
  return words ? `${kind}: ${words.length >= 60 ? words.slice(0, 57).trim() + '…' : words}` : kind;
}

/** The notification a cheer sends, when the person has push on (web and the installed app). */
export function cheerPush(item) {
  const say = {
    love: `${item.from} sent you a love`,
    like: `${item.from} sent you a like`,
    fire: `${item.from} sent you fire${item.what ? ' on ' + item.what : ''}`,
    strong: `${item.from} says you're strong${item.what ? ': ' + item.what : ''}`,
    win: `${item.from} called it a win${item.what ? ': ' + item.what : ''}`,
    wow: `${item.from} sent you a wow${item.what ? ' on ' + item.what : ''}`,
    cheer: `${item.from} cheered ${item.what || 'you'}`,
    reply: `${item.from} replied to ${item.what || 'your post'}`,
    best: `${item.from} picked your answer as the best`,
    plan: `${item.from} is following your plan${item.what ? ': ' + item.what : ''}`,
    follow: `${item.from} followed you`,
    post: `${item.from} posted${item.what ? ': ' + item.what : ''}`,
  }[item.kind];
  return { title: 'BadgeFit', body: say, tag: 'cheer-' + item.kind, url: '#/community' };
}
