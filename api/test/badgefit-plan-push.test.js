import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPushPlan, duePlanned, plannedKey } from '../badgefit-plan-push.js';

const raw = { on: true, tz: 'Australia/Sydney', items: [
  { at: '2026-11-09 06:45', title: '⭐ Today', body: 'Chest day. 27 days to your PCT.', tag: 'bf-nudge', url: '#/police' },
  { at: '2026-12-05 19:00', title: '🎯 PCT tomorrow', body: 'Gear out.', tag: 'bf-test-eve', url: 'https://evil.example' },
  { at: 'tomorrow', title: 'x', body: 'y' },
] };

test('cleanPushPlan keeps only well-formed items and safe links', () => {
  const p = cleanPushPlan(raw);
  assert.equal(p.tz, 'Australia/Sydney');
  assert.equal(p.items.length, 2);
  assert.equal(p.items[1].url, '#/police');
  assert.equal(cleanPushPlan({ on: false, items: raw.items }), null);
  assert.equal(cleanPushPlan(null), null);
});

test('duePlanned: on its date, inside the window, once', () => {
  const p = cleanPushPlan(raw);
  assert.deepEqual(duePlanned(p, { date: '2026-11-09', hhmm: '06:44' }), []);
  const due = duePlanned(p, { date: '2026-11-09', hhmm: '06:50' });
  assert.equal(due.length, 1);
  assert.deepEqual(duePlanned(p, { date: '2026-11-09', hhmm: '06:50' }, [plannedKey(due[0])]), []);
  assert.deepEqual(duePlanned(p, { date: '2026-11-09', hhmm: '07:10' }), []);
  assert.deepEqual(duePlanned(p, { date: '2026-11-10', hhmm: '06:50' }), []);
});
