/* BadgeFit guests: someone without an account may ask Hayden a few questions a day. No profile is
 * read or written for them; only today's count is kept. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { tempData } from './helpers.mjs';

tempData();
const jobs = await import('../coach/jobs.js');
const payloadLib = await import('../coach/core/payload.js');

test('a guest id is told from a profile id', () => {
  assert.equal(jobs.isGuestUid('guest-abcdefghijklmnop'), true);
  assert.equal(jobs.isGuestUid('kIbwI2nIcHB3SH4l'), false);
  assert.equal(jobs.isGuestUid(null), false);
});

test('a guest has 15 questions a day by default, a member 100', () => {
  assert.equal(jobs.askCapState('guest-abcdefghijklmnop').limit, 15);
  assert.equal(jobs.askCapState('someone').limit, 100);
});

test('a guest question builds a payload with no profile behind it', () => {
  const S = { unit: 'kg', routines: [], workouts: [], bodyweight: [], week: {}, dayPlan: {}, coach: { consent: { agreedAt: 1 } } };
  const p = payloadLib.build(S, { handle: 'h'.repeat(16), kind: 'ask', note: 'How many push-ups for the PCT?', police: { week: 1, testName: 'PCT' } });
  assert.equal(p.task, 'ask');
  assert.equal(p.question, 'How many push-ups for the PCT?');
});

test('a guest cannot ask for a plan or a review', () => {
  assert.throws(() => jobs.enqueue('guest-abcdefghijklmnop', { kind: 'create', intake: {} }), e => e instanceof jobs.CoachError);
});

/* The routes, driven as the app drives them: no session, only the X-Guest-Id header. */
const cfg = await import('../coach/config.js');
const { coachRoutes } = await import('../coach/routes.js');
const { forcePrivilegeVerdict } = await import('../coach/adapters/spawn.js');
forcePrivilegeVerdict({ ok: true, dropped: false, why: 'pinned by the test suite' });

function guestHarness() {
  const routes = coachRoutes({
    json: (res, status, body) => { res.status = status; res.body = body; },
    readBody: async req => req.body || {},
    readSession: () => null,
    requireAdmin: () => false
  });
  return async (key, body, headers = {}) => {
    const res = {};
    await routes[key]({ body, headers, socket: { remoteAddress: '203.0.113.9' } }, res);
    return res;
  };
}

test('a guest asks over the routes with only an id, and is stopped at the day\'s allowance', async () => {
  cfg.reset(); cfg.save({ enabled: true, provider: 'fixture', caps: { guestAskDaily: 2 } });
  const call = guestHarness();
  const id = { 'x-guest-id': 'abcdefghijklmnopqrstuv' };

  // No id and no session: refused, as before guests existed.
  assert.equal((await call('POST /api/coach/ask', { text: 'hello' })).status, 401);
  // A plan is a member's: the route takes no guest.
  assert.equal((await call('POST /api/coach/plan', { intake: {} }, id)).status, 401);

  const st = await call('GET /api/coach/status', null, id);
  assert.equal(st.status, 200, JSON.stringify(st.body));

  const seen = [];
  for (let i = 0; i < 3; i++) {
    const r = await call('POST /api/coach/ask', { text: 'How many push-ups for the PCT?', police: { week: 1 } }, id);
    seen.push(r.status);
    if (r.status === 202) {
      // Wait for the job to end, then clear the answer as the app does.
      for (let n = 0; n < 100; n++) {
        const s = await call('GET /api/coach/status', null, id);
        if (!s.body.job) break;
        await new Promise(r2 => setTimeout(r2, 50));
      }
      await call('POST /api/coach/pending/resolve', { accepted: ['ask'] }, id);
    }
  }
  assert.deepEqual(seen.slice(0, 2), [202, 202]);
  assert.equal(seen[2], 429, 'the third question of a two-a-day guest is refused');
});
