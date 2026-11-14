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
export const CHEER_GAP_MS = 5000;
export const INBOX_MAX = 20;
const GEAR = new Set(['headband', 'whistle', 'bolt', 'badge', 'stripes', 'cap', 'medal']);

export const emptyState = () => ({ here: new Map(), inbox: new Map(), gaps: new Map(), salt: crypto.randomBytes(8).toString('hex') });
export const emptySocial = () => ({ follows: {}, hidden: {}, names: {} });

/** The opaque handle a member is shown as: stable while the server runs, not their account id. */
export const handleOf = (state, uid) => crypto.createHash('sha256').update(state.salt + ':' + uid).digest('hex').slice(0, 16);
function uidOf(state, social, hid) {
  for (const uid of state.here.keys()) if (handleOf(state, uid) === hid) return uid;
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
  return { name: first, colour, gear, stats: { week: int(s.week, 0, 21), ready: int(s.ready, 0, 100), streak: int(s.streak, 0, 520) } };
}

/** Metres between two points (haversine). */
export function metres(a, b) {
  const R = 6371000, r = x => x * Math.PI / 180
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const listOf = (o, uid) => (o[uid] ||= []);
const hiddenEither = (social, a, b) => (social.hidden[a] || []).includes(b) || (social.hidden[b] || []).includes(a);
const view = (state, social, viewer, uid, p) => ({ id: handleOf(state, uid), ...p.card, followed: (social.follows[viewer] || []).includes(uid) });

/** "I'm here": stores where the member is (in memory) and answers who is near and what came in. */
export function ping(state, social, user, { lat, lon, card } = {}, now = Date.now()) {
  lat = Number(lat); lon = Number(lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { error: 'no location', status: 400 };
  for (const [uid, p] of state.here) if (now - p.at > TTL_MS) state.here.delete(uid);
  const me = { lat, lon, at: now, card: cleanCard(card, user) };
  state.here.set(user.id, me);
  if (social.names[user.id]) social.names[user.id] = { name: me.card.name, colour: me.card.colour };
  const near = [...state.here]
    .filter(([uid, p]) => uid !== user.id && !hiddenEither(social, user.id, uid) && metres(me, p) <= RADIUS_M)
    .map(([uid, p]) => ({ uid, p, d: metres(me, p) }))
    .sort((a, b) => a.d - b.d).slice(0, MAX_NEAR)
    .map(({ uid, p }) => view(state, social, user.id, uid, p));
  const inbox = state.inbox.get(user.id) || [];
  state.inbox.delete(user.id);
  return { near, inbox };
}

/** Switched off, or the app closed: gone from everyone's screen at once. */
export const leave = (state, user) => { state.here.delete(user.id); return { ok: true } };

/** A like or a love, to someone nearby or followed. At most one per pair every few seconds. */
export function cheer(state, social, user, { id, kind } = {}, now = Date.now()) {
  if (kind !== 'like' && kind !== 'love') return { error: 'like or love', status: 400 };
  const to = uidOf(state, social, String(id || ''));
  if (!to || to === user.id || hiddenEither(social, user.id, to)) return { error: 'not here', status: 404 };
  const key = user.id + '>' + to;
  if (state.gaps.has(key) && now - state.gaps.get(key) < CHEER_GAP_MS) return { error: 'easy, one at a time', status: 429 };
  state.gaps.set(key, now);
  const me = state.here.get(user.id)?.card || cleanCard({}, user);
  const box = state.inbox.get(to) || [];
  box.push({ from: me.name, colour: me.colour, kind, at: now });
  state.inbox.set(to, box.slice(-INBOX_MAX));
  return { ok: true };
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

/** The bell: everyone the member follows, active ones first (BadgeFit open in the last 3 minutes). */
export function bell(state, social, user, now = Date.now()) {
  const people = (social.follows[user.id] || []).filter(uid => !hiddenEither(social, user.id, uid)).map(uid => {
    const p = state.here.get(uid)
    const live = p && now - p.at <= TTL_MS
    const card = live ? p.card : { ...cleanCard(social.names[uid] || {}, null), stats: null }
    return { id: handleOf(state, uid), ...card, followed: true, active: !!live }
  })
  return { people: people.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)) }
}

/** An account deleted: out of every list. */
export function forgetUser(state, social, uid) {
  state.here.delete(uid); state.inbox.delete(uid)
  delete social.follows[uid]; delete social.hidden[uid]; delete social.names[uid]
  for (const k of Object.keys(social.follows)) social.follows[k] = social.follows[k].filter(x => x !== uid)
  for (const k of Object.keys(social.hidden)) social.hidden[k] = social.hidden[k].filter(x => x !== uid)
}
