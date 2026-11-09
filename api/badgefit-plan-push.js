/* BadgeFit's planned reminders, the server half: the morning nudge and the test-eve and
 * test-morning reminders, built on the phone (frontend/src/lib/police/push-plan.js) into
 * S.police.pushPlan, each at a local date and time. Here: the list made safe, and what is due on
 * a tick. Each is sent once (by its `at` and `tag`), up to WINDOW_MIN minutes late. */

export const PLAN_MAX = 30;
export const WINDOW_MIN = 15;
const AT = /^(\d{4}-\d{2}-\d{2}) ([01]\d|2[0-3]):([0-5]\d)$/;
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

/** { tz, items: [{ at, title, body, tag, url }] }, or null when off or empty. */
export function cleanPushPlan(raw) {
  if (!raw || typeof raw !== 'object' || !raw.on || !Array.isArray(raw.items)) return null;
  const tz = typeof raw.tz === 'string' && /^[A-Za-z_+\-/0-9]{1,64}$/.test(raw.tz) ? raw.tz : 'UTC';
  const items = raw.items.slice(0, PLAN_MAX)
    .filter(i => i && AT.test(i.at || '') && typeof i.title === 'string' && typeof i.body === 'string')
    .map(i => ({ at: i.at, title: str(i.title, 80), body: str(i.body, 240), tag: /^[a-z0-9-]{1,32}$/.test(i.tag || '') ? i.tag : 'bf-plan', url: typeof i.url === 'string' && /^#\/[\w/?=&-]{0,60}$/.test(i.url) ? i.url : '#/police' }));
  return items.length ? { tz, items } : null;
}

const key = i => `${i.at} ${i.tag}`;

/** The items due at local `now` ({ date, hhmm }), minus the keys already sent. */
export function duePlanned(plan, now, sent = []) {
  if (!plan || !now) return [];
  const [h, m] = now.hhmm.split(':').map(Number);
  const nowMin = h * 60 + m;
  return plan.items.filter(i => {
    const [, date, hh, mm] = AT.exec(i.at);
    if (date !== now.date || sent.includes(key(i))) return false;
    const late = nowMin - (Number(hh) * 60 + Number(mm));
    return late >= 0 && late <= WINDOW_MIN;
  });
}

export const plannedKey = key;
export const plannedPush = i => ({ title: i.title, body: i.body, tag: i.tag, url: i.url });
