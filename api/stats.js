/* The owner's numbers (BadgeFit admin, GET /api/admin/stats): are testers coming back?
 *
 * Pure: given the profiles, each one's saved state, the community feed and the check-in answers,
 * it counts. server.js reads the files. A "session" is a logged workout (state.workouts, by its
 * day `d`) or a guided run (state.police.runLog, by its day `at`).
 */
const DAY = 86400000;
const iso = ms => new Date(ms).toISOString().slice(0, 10);

/** The days someone trained on, as ISO days. */
export function sessionDays(state) {
  const days = [];
  for (const w of Array.isArray(state?.workouts) ? state.workouts : []) if (typeof w?.d === 'string') days.push(w.d.slice(0, 10));
  for (const r of Array.isArray(state?.police?.runLog) ? state.police.runLog : []) if (typeof r?.at === 'string') days.push(r.at.slice(0, 10));
  return days;
}

export function computeStats({ users = [], stateOf = () => null, feed = { posts: [] }, feedback = [], now = Date.now() } = {}) {
  const weekAgo = iso(now - 7 * DAY), today = iso(now);
  const people = users.filter(u => u && !u.disabled);
  let trained = 0, twoPlus = 0, sessions = 0, firstWeekDone = 0, cameBack = 0;
  for (const u of people) {
    const days = sessionDays(stateOf(u.id));
    const week = days.filter(d => d > weekAgo && d <= today);
    sessions += week.length;
    if (week.length) trained++;
    if (week.length >= 2) twoPlus++;
    // Back in week 2: of those who joined 1-3 weeks ago, who trained 7-14 days after joining.
    const joined = Date.parse(u.created || '');
    if (Number.isFinite(joined) && now - joined >= 7 * DAY && now - joined < 21 * DAY) {
      firstWeekDone++;
      const from = iso(joined + 7 * DAY), to = iso(joined + 14 * DAY);
      if (days.some(d => d >= from && d < to)) cameBack++;
    }
  }
  const since = now - 7 * DAY;
  const posts = (feed.posts || []).filter(p => p.at >= since);
  const comments = (feed.posts || []).reduce((n, p) => n + (p.replies || []).filter(r => r.at >= since).length, 0);
  return {
    testers: people.length,
    newThisWeek: people.filter(u => Date.parse(u.created || '') >= since).length,
    trainedThisWeek: trained,
    trainedTwice: twoPlus,
    sessionsThisWeek: sessions,
    weekTwo: { joined: firstWeekDone, cameBack },
    community: { posts: posts.length, comments, sharedWeeks: posts.filter(p => p.week).length, reacted: posts.reduce((n, p) => n + (p.cheers || []).length, 0) },
    answers: (feedback || []).slice(-30).reverse(),
  };
}

/** A check-in answer, cleaned: a few hundred characters of plain text. */
export const cleanAnswer = t => String(t ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 500);
