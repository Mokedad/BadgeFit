/* Your crew (BadgeFit): the people testing on your date, a day either side. Each member's app
 * sends a small card (test date, first name, colour, how ready, the last day trained and what),
 * kept in DATA_DIR/crew.json. Home shows the crew in one line; the sheet shows their rings and
 * today; a finished session pings the crew once a day each, never late in their evening.
 * Nothing here is a place, a photo or a number beyond the ring. */

export const WINDOW_DAYS = 1;
export const MAX_CREW = 12;
export const QUIET_FROM = 21;  // no ping at or after 9 pm, their time
export const QUIET_TO = 7;     // nor before 7 am
export const KEEP_MS = 120 * 86400000; // a card not refreshed in four months is let go

export const empty = () => ({ cards: {}, pinged: {}, off: {} });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dayNum = iso => Math.round(Date.parse(iso + 'T00:00:00Z') / 86400000);
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/** What a member shares with the crew, cleaned. null when there is no test date to crew by. */
export function cleanCrewCard(c, user) {
  const test = ISO.test(c?.test || '') ? c.test : null;
  if (!test) return null;
  const name = clean(c?.name || user?.name || 'Recruit', 40).replace(/[^\p{L}\p{N} '-]/gu, '').trim().split(/\s+/)[0].slice(0, 20) || 'Recruit';
  const colour = /^#[0-9a-f]{6}$/i.test(c?.colour || '') ? c.colour : '#9aa3b2';
  const last = ISO.test(c?.last || '') ? c.last : null;
  return { test, kind: kindOf(c?.kind), name, colour, ready: int(c?.ready, 0, 100), last, title: clean(c?.title, 60), tz: int(c?.tz, -840, 840) };
}

/** The member's local date and hour from a UTC instant and their offset (minutes east of UTC). */
export function localOf(ms, tz = 0) {
  const d = new Date(ms + tz * 60000);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

/** Whether two test dates are within a day of each other. */
// A PCT crew and an Academy intake crew never mix: a card without a kind is a PCT one (older builds).
export const kindOf = k => (k === 'academy' ? 'academy' : 'pct');
export const sameCrew = (a, b, ka = 'pct', kb = 'pct') => !!a && !!b && kindOf(ka) === kindOf(kb) && Math.abs(dayNum(a) - dayNum(b)) <= WINDOW_DAYS;

/** Stores the member's card. Returns the card kept, or null when there was no date. */
export function join(store, user, card, now = Date.now()) {
  const c = cleanCrewCard(card, user);
  if (!c) { delete store.cards[user.id]; return null; }
  for (const [uid, k] of Object.entries(store.cards)) if (now - (k.at || 0) > KEEP_MS) delete store.cards[uid];
  store.cards[user.id] = { ...c, at: now };
  return c;
}

/** In or out of the crew: out means unseen by it and not seeing it. */
export function leave(store, user, on = true) {
  if (on) store.off[user.id] = true; else delete store.off[user.id];
  return { off: !!store.off[user.id] };
}

/**
 * Who tests with the member, nearest ring first, at most MAX_CREW: `hidden(a, b)` is the bots'
 * block either way. Each entry: the handle (`id`, for cheers and their page), name, colour, ready,
 * last, title and whether that last day is their today.
 */
export function list(store, user, { handle = uid => uid, hidden = () => false, now = Date.now() } = {}) {
  const me = store.cards[user.id];
  if (!me || store.off[user.id]) return { test: me?.test || null, kind: kindOf(me?.kind), off: !!store.off[user.id], crew: [] };
  const crew = Object.entries(store.cards)
    .filter(([uid, c]) => uid !== user.id && !store.off[uid] && sameCrew(me.test, c.test, me.kind, c.kind) && !hidden(user.id, uid))
    .map(([uid, c]) => ({ id: handle(uid), name: c.name, colour: c.colour, ready: c.ready, last: c.last, title: c.title, test: c.test, kind: kindOf(c.kind), today: !!c.last && c.last === localOf(now, c.tz).day }))
    .sort((a, b) => Number(b.today) - Number(a.today) || b.ready - a.ready || a.name.localeCompare(b.name))
    .slice(0, MAX_CREW);
  return { test: me.test, kind: kindOf(me.kind), off: false, crew };
}

/** The account ids of the member's crew (the Crew feed on Community): the same people as list(). */
export function memberIds(store, user, { hidden = () => false } = {}) {
  const me = store.cards[user.id];
  if (!me || store.off[user.id]) return [];
  return Object.entries(store.cards)
    .filter(([uid, c]) => uid !== user.id && !store.off[uid] && sameCrew(me.test, c.test, me.kind, c.kind) && !hidden(user.id, uid))
    .map(([uid]) => uid);
}

/**
 * Who to tell that the member just trained: crewmates not yet pinged today (their day), and not
 * in their quiet hours. Marks them pinged. The caller sends the cheer.
 */
export function pingTargets(store, user, { hidden = () => false, now = Date.now() } = {}) {
  const me = store.cards[user.id];
  if (!me || store.off[user.id]) return [];
  const out = [];
  for (const [uid, c] of Object.entries(store.cards)) {
    if (uid === user.id || store.off[uid] || !sameCrew(me.test, c.test, me.kind, c.kind) || hidden(user.id, uid)) continue;
    const { day, hour } = localOf(now, c.tz);
    if (hour >= QUIET_FROM || hour < QUIET_TO) continue;
    if (store.pinged[uid] === day) continue;
    store.pinged[uid] = day;
    out.push(uid);
  }
  return out;
}

/** An account deleted: out of the crew. */
export function forgetUser(store, uid) {
  delete store.cards[uid]; delete store.pinged[uid]; delete store.off[uid];
}
