/* Sign in with Apple and Google (social-login.js): configuration, the signed state, the
   authorize URL, Apple's client secret and the ID token checks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as sl from '../social-login.js';

const SECRET = 'test-secret';
const tok = claims => ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.');

test('a provider is offered only when fully configured', () => {
  assert.deepEqual(sl.configured({}), []);
  assert.deepEqual(sl.configured({ GOOGLE_CLIENT_ID: 'g' }), []);
  assert.deepEqual(sl.configured({ GOOGLE_CLIENT_ID: 'g', GOOGLE_CLIENT_SECRET: 's', APPLE_SERVICES_ID: 'a', APPLE_TEAM_ID: 't', APPLE_KEY_ID: 'k', APPLE_PRIVATE_KEY: 'p' }), ['google', 'apple']);
});

test('state: signed, expiring, tamper-proof', () => {
  const { st, cookie } = sl.makeState('google', SECRET, 1000);
  assert.deepEqual(sl.readState(cookie, SECRET, 2000), st);
  assert.equal(sl.readState(cookie, SECRET, 1000 + 11 * 60000), null);
  assert.equal(sl.readState(cookie, 'other', 2000), null);
  const [body] = cookie.split('.');
  assert.equal(sl.readState(body + '.AAAA', SECRET, 2000), null);
  assert.equal(sl.readState('junk', SECRET), null);
});

test('authorize URLs', () => {
  const g = new URL(sl.authorizeUrl('google', { clientId: 'cid', redirect: 'https://app.x/api/auth/google/callback', state: 's', nonce: 'n' }));
  assert.equal(g.searchParams.get('scope'), 'openid email profile');
  assert.equal(g.searchParams.get('nonce'), 'n');
  const a = new URL(sl.authorizeUrl('apple', { clientId: 'svc', redirect: 'https://app.x/api/auth/apple/callback', state: 's', nonce: 'n' }));
  assert.equal(a.searchParams.get('response_mode'), 'form_post');
  assert.equal(sl.redirectUri('apple', 'https://app.x/'), 'https://app.x/api/auth/apple/callback');
});

test("Apple's client secret is an ES256 JWT the team's public key verifies", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const env = { APPLE_TEAM_ID: 'TEAM', APPLE_KEY_ID: 'KEY', APPLE_SERVICES_ID: 'svc', APPLE_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n') };
  const jwt = sl.appleClientSecret(env, 1_700_000_000_000);
  const [h, c, s] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'ES256', kid: 'KEY', typ: 'JWT' });
  assert.equal(JSON.parse(Buffer.from(c, 'base64url')).sub, 'svc');
  assert.ok(crypto.verify('sha256', Buffer.from(h + '.' + c), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
});

test('ID token checks: issuer, audience, expiry, nonce; e-mail only when verified', () => {
  const now = 1_700_000_000_000, exp = now / 1000 + 600;
  const ok = sl.checkIdToken('google', tok({ iss: 'https://accounts.google.com', aud: 'cid', exp, nonce: 'n', sub: '123', email: 'Mo@Gmail.com', email_verified: true, given_name: 'Mo' }), { clientId: 'cid', nonce: 'n', now });
  assert.deepEqual(ok, { sub: '123', email: 'mo@gmail.com', name: 'Mo' });
  const base = { iss: 'https://appleid.apple.com', aud: 'svc', exp, nonce: 'n', sub: 'a1' };
  assert.equal(sl.checkIdToken('apple', tok({ ...base, email: 'x@y.z', email_verified: 'false' }), { clientId: 'svc', nonce: 'n', now }).email, null);
  for (const [bad, msg] of [[{ iss: 'https://evil' }, /issuer/], [{ aud: 'other' }, /audience/], [{ exp: now / 1000 - 1 }, /expired/], [{ nonce: 'x' }, /nonce/], [{ sub: '' }, /subject/]]) {
    assert.throws(() => sl.checkIdToken('apple', tok({ ...base, ...bad }), { clientId: 'svc', nonce: 'n', now }), msg);
  }
  assert.throws(() => sl.checkIdToken('apple', 'nope', { clientId: 'svc', nonce: 'n', now }), /no id token/);
});

test('names for new profiles', () => {
  assert.equal(sl.nameFor({ name: 'Mo' }, null, 'google'), 'Mo');
  assert.equal(sl.nameFor({}, { name: { firstName: 'Sam' } }, 'apple'), 'Sam');
  assert.equal(sl.nameFor({ email: 'jess@x.com' }, null, 'apple'), 'jess');
  assert.equal(sl.nameFor({}, null, 'apple'), 'Apple user');
});

test('code exchange posts the secret and returns the id token', async () => {
  let seen;
  const fetchImpl = async (url, init) => { seen = { url, body: String(init.body) }; return { ok: true, status: 200, json: async () => ({ id_token: 'T' }) }; };
  const t = await sl.exchangeCode('google', 'CODE', { clientId: 'cid', redirect: 'https://app.x/cb', env: { GOOGLE_CLIENT_SECRET: 'sec' }, fetchImpl });
  assert.equal(t, 'T');
  assert.equal(seen.url, 'https://oauth2.googleapis.com/token');
  assert.match(seen.body, /client_secret=sec/);
  await assert.rejects(sl.exchangeCode('google', 'C', { clientId: 'c', redirect: 'r', env: {}, fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({}) }) }), /failed/);
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';

test('server: config, the redirect out, and a forged return refused', async t => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-social-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost', PASSKEYS: '0', PASSWORD_LOGIN: '1', GOOGLE_CLIENT_ID: 'cid.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'sec' },
  });
  let log = '';
  child.stdout.on('data', d => log += d); child.stderr.on('data', d => log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const port = await boundPort(child, () => log);
  const api = `http://127.0.0.1:${port}`;

  const cfg = await (await fetch(api + '/api/config')).json();
  assert.equal(cfg.passkeys, false);
  assert.deepEqual(cfg.social, ['google']);
  assert.equal(cfg.password_login, true);

  const start = await fetch(api + '/api/auth/google', { redirect: 'manual' });
  assert.equal(start.status, 302);
  const to = new URL(start.headers.get('location'));
  assert.equal(to.origin + to.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(to.searchParams.get('redirect_uri'), 'http://localhost:8080/api/auth/google/callback');
  assert.match(start.headers.get('set-cookie'), /^bf_oauth=.+HttpOnly/);

  // A code with no matching state cookie (someone else's login) goes nowhere.
  const forged = await fetch(api + '/api/auth/google/callback?code=x&state=y', { redirect: 'manual' });
  assert.equal(forged.status, 302);
  assert.equal(forged.headers.get('location'), 'http://localhost:8080/?login=expired');
  assert.doesNotMatch(forged.headers.get('set-cookie') || '', /gymsid=[^;]/);

  // Apple is not configured here: its start answers 404.
  assert.equal((await fetch(api + '/api/auth/apple', { redirect: 'manual' })).status, 404);

  // The iPhone app's own Apple sheet needs no keys: a nonce, then a token that must verify.
  assert.equal(cfg.appleNative, true);
  const { nonce } = await (await fetch(api + '/api/auth/apple/nonce')).json();
  assert.ok(nonce && nonce.includes('.'));
  const native = body => fetch(api + '/api/auth/apple/native', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'capacitor://localhost' }, body: JSON.stringify(body) });
  const bad = await native({ nonce, idToken: 'not.a.token' });
  assert.equal(bad.status, 401);
  assert.equal((await bad.json()).code, 'failed');
  // A nonce works once, and a made-up one never.
  assert.equal((await native({ nonce, idToken: 'not.a.token' })).status, 400);
  assert.equal((await native({ nonce: 'forged.nonce', idToken: 'x' })).status, 400);
});

// Sign in with Apple inside the iPhone app: the identity token comes through the phone, so its
// signature is checked against Apple's keys.
import { verifyAppleIdentityToken, nonceHash, appleJwks, _resetAppleKeys, appleBundleId } from '../social-login.js';
{
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'K1', alg: 'RS256', use: 'sig' };
  const make = (claims, { kid = 'K1', key = privateKey, alg = 'RS256' } = {}) => {
    const h = Buffer.from(JSON.stringify({ alg, kid })).toString('base64url');
    const c = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const sig = crypto.sign('RSA-SHA256', Buffer.from(h + '.' + c), key).toString('base64url');
    return h + '.' + c + '.' + sig;
  };
  const now = Date.now();
  const good = { iss: 'https://appleid.apple.com', aud: 'au.com.badgefit.app', exp: Math.floor(now / 1000) + 600, sub: '001.abc', nonce: nonceHash('N1'), email: 'A@privaterelay.appleid.com', email_verified: 'true' };
  const opts = { keys: [jwk], audience: 'au.com.badgefit.app', nonce: 'N1', now };

  test('native Apple: a token signed by Apple\'s key, for this app and nonce, signs in', () => {
    assert.deepEqual(verifyAppleIdentityToken(make(good), opts), { sub: '001.abc', email: 'a@privaterelay.appleid.com', name: null });
    assert.equal(appleBundleId({}), 'au.com.badgefit.app');
  });
  test('native Apple: anything else is refused', () => {
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    assert.throws(() => verifyAppleIdentityToken(make(good, { key: other }), opts), /bad signature/);
    assert.throws(() => verifyAppleIdentityToken(make(good, { kid: 'K2' }), opts), /unknown key/);
    assert.throws(() => verifyAppleIdentityToken(make(good, { alg: 'none' }), opts), /wrong algorithm/);
    assert.throws(() => verifyAppleIdentityToken(make({ ...good, aud: 'other.app' }), opts), /wrong audience/);
    assert.throws(() => verifyAppleIdentityToken(make({ ...good, iss: 'https://evil' }), opts), /wrong issuer/);
    assert.throws(() => verifyAppleIdentityToken(make({ ...good, exp: Math.floor(now / 1000) - 1 }), opts), /expired/);
    assert.throws(() => verifyAppleIdentityToken(make(good), { ...opts, nonce: 'N2' }), /wrong nonce/);
    const t = make(good).split('.'); t[1] = Buffer.from(JSON.stringify({ ...good, sub: 'someone-else' })).toString('base64url');
    assert.throws(() => verifyAppleIdentityToken(t.join('.'), opts), /bad signature/);
  });
  test('native Apple: Apple\'s keys are fetched once and again for a new key', async () => {
    _resetAppleKeys();
    let calls = 0;
    const fetchImpl = async () => { calls++; return { ok: true, json: async () => ({ keys: [jwk] }) }; };
    await appleJwks({ kid: 'K1', fetchImpl, now });
    await appleJwks({ kid: 'K1', fetchImpl, now: now + 1000 });
    assert.equal(calls, 1);
    await appleJwks({ kid: 'K9', fetchImpl, now: now + 2000 });
    assert.equal(calls, 2);
    _resetAppleKeys();
  });
}
