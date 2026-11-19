/* BadgeFit bots nearby: members who switched "Meet bots nearby" on see each other's Hayden when
 * they are within about 300 m, with the first name, the bot's colour and gear, and the few stats
 * the app shares (sessions this week, PCT ready %, weeks in a row). A double tap sends a like or a
 * love, a hold follows (the bell), a swipe away hides that person for good, both ways.
 *
 * Privacy: where someone is never leaves the server and is never written down: positions live in
 * memory for three minutes (TTL) and only "nearby" goes out, never a distance or a direction. Who
 * is who goes out as an opaque handle, never an account id. Follows and hides are the only thing
 * kept (`social`, saved by server.js as DATA_DIR/bots.json). Pure over plain objects.
 */
import crypto from 'node:crypto';

export const RADIUS_M = 300;
export const TTL_MS = 3 * 60 * 1000;
export const MAX_NEAR = 5;
// Reactions can be sent again and again, like hearts on a live video: the gap only stops a stuck
// finger from flooding someone (owner, 19 November 2026; it was 5 s).
export const CHEER_GAP_MS = 700;
export const STAGES = ['applicant', 'passed', 'academy', 'graduate'];
const GEAR = new Set(['headband', 'whistle', 'bolt', 'badge', 'stripes', 'cap', 'medal']);

export const emptyState = () => ({ here: new Map(), live: new Map(), gaps: new Map(), salt: crypto.randomBytes(8).toString('hex') });
export const emptySocial = () => ({ follows: {}, hidden: {}, names: {}, autoFollowed: {} });

/** The opaque handle a member is shown as: stable while the server runs, not their account id. */
export const handleOf = (state, uid) => crypto.createHash('sha256').update(state.salt + ':' + uid).digest('hex').slice(0, 16);
export function uidOf(state, social, hid) {
  for (const uid of state.here.keys()) if (handleOf(state, uid) === hid) return uid;
  for (const uid of state.live.keys()) if (handleOf(state, uid) === hid) return uid;
  for (const uid of Object.keys(social.names)) if (handleOf(state, uid) === hid) return uid;
  return null;
}

const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
/** What a member shares, cleaned: a first name, a colour, earned gear, three numbers. */
export function cleanCard(c, user) {
  const first = String(c?.name || user?.name || 'Recruit').replace(/[^\p{L}\p{N} '-]/gu, '').trim().split(/\s+/)[0].slice(0, 20) || 'Recruit';
  const colour = /^#[0-9a-f]{6}$/i.test(c?.colour || '') ? c.colour : '#9aa3b2';
  const gear = (Array.isArray(c?.gear) ? c.gear : []).filter(g => GEAR.has(g)).slice(0, 7);
  const s = c?.stats || {};
  const stage = STAGES.includes(c?.stage) ? c.stage : null;
  const title = String(c?.today?.title || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 60);
  return { name: first, colour, gear, stats: { week: int(s.week, 0, 21), ready: int(s.ready, 0, 100), streak: int(s.streak, 0, 520) }, training: c?.training === true,
    ...(stage && { stage }), ...(title && { today: { title, done: c.today.done === true } }) };
}

/** Metres between two points (haversine). */
export function metres(a, b) {
  const R = 6371000, r = x => x * Math.PI / 180
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const listOf = (o, uid) => (o[uid] ||= []);
export const hiddenEither = (social, a, b) => (social.hidden[a] || []).includes(b) || (social.hidden[b] || []).includes(a);
const view = (state, social, viewer, uid, p) => ({ id: handleOf(state, uid), ...p.card, followed: (social.follows[viewer] || []).includes(uid) });

/** "I'm here": stores where the member is (in memory) and answers who is near and what came in. */
export function ping(state, social, user, { lat, lon, card } = {}, now = Date.now()) {
  lat = Number(lat); lon = Number(lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { error: 'no location', status: 400 };
  for (const [uid, p] of state.here) if (now - p.at > TTL_MS) state.here.delete(uid);
  const me = { lat, lon, at: now, card: cleanCard(card, user) };
  state.here.set(user.id, me);
  social.names[user.id] = { name: me.card.name, colour: me.card.colour, gear: me.card.gear, ...(me.card.stage && { stage: me.card.stage }) };
  const near = [...state.here]
    .filter(([uid, p]) => uid !== user.id && !hiddenEither(social, user.id, uid) && metres(me, p) <= RADIUS_M)
    .map(([uid, p]) => ({ uid, p, d: metres(me, p) }))
    .sort((a, b) => a.d - b.d).slice(0, MAX_NEAR)
    .map(({ uid, p }) => view(state, social, user.id, uid, p));
  return { near };
}

/**
 * "I'm in the app" (no place needed): what followers see on their bell, and whether you are
 * training right now. Answers the people you follow who are about, training first.
 */
export function presence(state, social, user, { card } = {}, now = Date.now()) {
  for (const [uid, p] of state.live) if (now - p.at > TTL_MS) state.live.delete(uid);
  const me = { at: now, card: cleanCard(card, user) };
  state.live.set(user.id, me);
  social.names[user.id] = { name: me.card.name, colour: me.card.colour, gear: me.card.gear, ...(me.card.stage && { stage: me.card.stage }) };
  const live = (social.follows[user.id] || []).filter(uid => !hiddenEither(social, user.id, uid))
    .map(uid => [uid, seenOf(state, uid, now)]).filter(([, p]) => p)
    .map(([uid, p]) => ({ id: handleOf(state, uid), ...p.card, followed: true, active: true }))
    .sort((a, b) => Number(b.training) - Number(a.training) || a.name.localeCompare(b.name));
  return { live };
}

/** The freshest sign of someone, nearby or just in the app, within the last three minutes. */
function seenOf(state, uid, now) {
  const a = state.here.get(uid), b = state.live.get(uid);
  const p = [a, b].filter(x => x && now - x.at <= TTL_MS).sort((x, y) => y.at - x.at)[0];
  return p || null;
}

/** Switched off, or the app closed: gone from everyone's screen at once. */
export const leave = (state, user) => { state.here.delete(user.id); state.live.delete(user.id); return { ok: true } };

/** A like or a love, to someone nearby or followed. At most one per pair every few seconds. */
export function cheer(state, social, user, { id, kind } = {}, now = Date.now()) {
  // A like, or one of the five reactions (api/community.js REACTS), sent through their Hayden.
  if (!['like', 'love', 'fire', 'strong', 'win', 'wow'].includes(kind)) return { error: 'like or a reaction', status: 400 };
  const to = uidOf(state, social, String(id || ''));
  if (!to || to === user.id || hiddenEither(social, user.id, to)) return { error: 'not here', status: 404 };
  const key = user.id + '>' + to;
  if (state.gaps.has(key) && now - state.gaps.get(key) < CHEER_GAP_MS) return { error: 'easy, one at a time', status: 429 };
  state.gaps.set(key, now);
  // Where it goes is server.js's job (cheers.js keeps it until their app picks it up).
  const me = state.here.get(user.id)?.card || cleanCard({}, user);
  return { ok: true, to, from: me.name, colour: me.colour, kind };
}

/** Follow (the bell), or stop. Their name and colour are kept so the bell can show them later. */
export function follow(state, social, user, { id, on = true } = {}) {
  const to = uidOf(state, social, String(id || ''));
  if (!to || to === user.id || hiddenEither(social, user.id, to)) return { error: 'not here', status: 404 };
  const list = listOf(social.follows, user.id);
  if (on && !list.includes(to)) list.push(to);
  if (!on) social.follows[user.id] = list.filter(x => x !== to);
  const card = state.here.get(to)?.card;
  if (card) social.names[to] = { name: card.name, colour: card.colour };
  return { ok: true, followed: !!on };
}

/**
 * Every member follows the owner's account, the way a new account on a social app starts out
 * following the app's own (owner's rule, 18 November 2026). Once per member: someone who unfollows
 * or blocks the owner afterwards is never followed back in. True when it added the follow.
 */
export function autoFollow(social, uid, ownerUid) {
  if (!uid || !ownerUid || uid === ownerUid) return false;
  if (!social.autoFollowed) social.autoFollowed = {};
  if (social.autoFollowed[uid]) return false;
  social.autoFollowed[uid] = true;
  if (hiddenEither(social, uid, ownerUid)) return false;
  const list = listOf(social.follows, uid);
  if (list.includes(ownerUid)) return false;
  list.push(ownerUid);
  return true;
}

/**
 * The owner follows every new member back, once (owner's rule, 19 November 2026), unless they
 * switched that off (`social.ownerAuto === false`). Blocks win, and an unfollow afterwards stays.
 */
export function ownerFollowsBack(social, uid, ownerUid) {
  if (!uid || !ownerUid || uid === ownerUid || social.ownerAuto === false) return false;
  if (!social.ownerFollowed) social.ownerFollowed = {};
  if (social.ownerFollowed[uid]) return false;
  social.ownerFollowed[uid] = true;
  if (hiddenEither(social, uid, ownerUid)) return false;
  const list = listOf(social.follows, ownerUid);
  if (list.includes(uid)) return false;
  list.push(uid);
  return true;
}

/** Swiped away: hidden from each other for good, and any follow between them dropped. */
export function hide(state, social, user, { id } = {}) {
  const to = uidOf(state, social, String(id || ''));
  if (!to || to === user.id) return { error: 'not here', status: 404 };
  const list = listOf(social.hidden, user.id);
  if (!list.includes(to)) list.push(to);
  social.follows[user.id] = (social.follows[user.id] || []).filter(x => x !== to);
  social.follows[to] = (social.follows[to] || []).filter(x => x !== user.id);
  return { ok: true };
}

/** Unblock: hidden from each other no more (a follow is not brought back; follow again if you like). */
export function unhide(state, social, user, { id } = {}) {
  const hid = String(id || '');
  const mine = social.hidden[user.id] || [];
  const to = mine.find(uid => handleOf(state, uid) === hid);
  if (!to) return { error: 'not blocked', status: 404 };
  social.hidden[user.id] = mine.filter(x => x !== to);
  return { ok: true };
}

/** The people this member has blocked, by first name, to unblock. */
export function hiddenList(state, social, user) {
  return { people: (social.hidden[user.id] || []).map(uid => ({ id: handleOf(state, uid), ...cleanCard(social.names[uid] || {}, null), stats: null })) };
}

/** Everyone who follows `uid` (to tell them about a new post). */
export const followersOf = (social, uid) => Object.keys(social.follows).filter(k => (social.follows[k] || []).includes(uid) && !hiddenEither(social, k, uid));

/** The bell: everyone the member follows, active ones first (BadgeFit open in the last 3 minutes). */
export function bell(state, social, user, now = Date.now()) {
  const people = (social.follows[user.id] || []).filter(uid => !hiddenEither(social, user.id, uid)).map(uid => {
    const p = seenOf(state, uid, now)
    const live = !!p
    const card = live ? p.card : { ...cleanCard(social.names[uid] || {}, null), stats: null, training: false }
    return { id: handleOf(state, uid), ...card, followed: true, active: !!live }
  })
  return { people: people.sort((a, b) => Number(!!b.training) - Number(!!a.training) || Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)) }
}

/**
 * Someone met in the community feed rather than nearby: kept by first name so they can be
 * followed, cheered and shown on the bell like anyone met nearby. Returns their handle.
 */
export function remember(state, social, uid, name) {
  if (!uid) return null;
  if (!social.names[uid]) social.names[uid] = { name: cleanCard({ name }, null).name, colour: '#9aa3b2' };
  return handleOf(state, uid);
}

/**
 * One member's page: their card (what they share while about, else name, colour, gear and stage),
 * who follows whom in numbers, and whether the viewer follows them. null for nobody, or someone
 * hidden either way.
 */
export function person(state, social, viewer, hid, now = Date.now()) {
  const uid = uidOf(state, social, String(hid || ''));
  if (!uid || hiddenEither(social, viewer.id, uid)) return null;
  const p = seenOf(state, uid, now);
  const kept = social.names[uid] || {};
  const card = p ? p.card : { ...cleanCard(kept, null), stats: null, training: false };
  return {
    uid, id: handleOf(state, uid), ...card, active: !!p,
    followed: (social.follows[viewer.id] || []).includes(uid), followsYou: (social.follows[uid] || []).includes(viewer.id),
    followers: Object.values(social.follows).filter(l => l.includes(uid)).length, following: (social.follows[uid] || []).length,
  };
}

/** An account deleted: out of every list. */
export function forgetUser(state, social, uid) {
  state.here.delete(uid); state.live.delete(uid)
  delete social.follows[uid]; delete social.hidden[uid]; delete social.names[uid]; if (social.autoFollowed) delete social.autoFollowed[uid]; if (social.ownerFollowed) delete social.ownerFollowed[uid]
  for (const k of Object.keys(social.follows)) social.follows[k] = social.follows[k].filter(x => x !== uid)
  for (const k of Object.keys(social.hidden)) social.hidden[k] = social.hidden[k].filter(x => x !== uid)
}
