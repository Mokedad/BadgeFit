/* Sign in with Apple and with Google (BadgeFit): the OpenID Connect authorization-code flow.
 *
 * The server redirects to the provider, the provider sends the person back with a one-time
 * code, and the server trades that code for an ID token straight with the provider over TLS,
 * with its own client secret. The token is therefore the provider's word without a signature
 * check of our own (OIDC Core 3.1.3.7: TLS server validation stands in for it in the code flow),
 * and its claims are still checked: issuer, audience, expiry and our nonce.
 *
 * A short-lived state cookie, HMAC-signed, carries the state and nonce across the round trip, so
 * a code that did not start here is refused (no login CSRF). Apple returns with a cross-site POST
 * (form_post), which only a SameSite=None cookie survives; that cookie holds no session.
 *
 * Configuration, all optional (a provider is offered only when complete):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   APPLE_SERVICES_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 key, PEM; \n allowed)
 * Redirect URIs to register: ORIGIN + /api/auth/google/callback and /api/auth/apple/callback.
 */
import crypto from 'node:crypto';

export const PROVIDERS = {
  google: {
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    scope: 'openid email profile',
  },
  apple: {
    authorize: 'https://appleid.apple.com/auth/authorize',
    token: 'https://appleid.apple.com/auth/token',
    issuers: ['https://appleid.apple.com'],
    scope: 'name email',
  },
};

/** Which providers this server can offer, from its environment. */
export function configured(env = process.env) {
  const out = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) out.push('google');
  if (env.APPLE_SERVICES_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY) out.push('apple');
  return out;
}

export const clientIdOf = (p, env = process.env) => (p === 'google' ? env.GOOGLE_CLIENT_ID : env.APPLE_SERVICES_ID);
export const redirectUri = (p, origin) => `${origin.replace(/\/$/, '')}/api/auth/${p}/callback`;

const b64u = buf => Buffer.from(buf).toString('base64url');

/** The state cookie: provider, state, nonce and expiry, signed with the server secret. */
export function makeState(p, secret, now = Date.now()) {
  const st = { p, s: crypto.randomBytes(16).toString('base64url'), n: crypto.randomBytes(16).toString('base64url'), e: now + 10 * 60000 };
  const body = b64u(JSON.stringify(st));
  return { st, cookie: body + '.' + crypto.createHmac('sha256', secret).update(body).digest('base64url') };
}

export function readState(cookie, secret, now = Date.now()) {
  if (typeof cookie !== 'string' || !cookie.includes('.')) return null;
  const [body, mac] = cookie.split('.');
  const want = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  try {
    const st = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return st && st.e > now ? st : null;
  } catch { return null; }
}

export function authorizeUrl(p, { clientId, redirect, state, nonce }) {
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirect, scope: PROVIDERS[p].scope, state, nonce });
  if (p === 'apple') q.set('response_mode', 'form_post');
  if (p === 'google') q.set('prompt', 'select_account');
  return PROVIDERS[p].authorize + '?' + q;
}

/** Apple's client secret: an ES256 JWT signed with the team's key, valid for 5 minutes. */
export function appleClientSecret(env = process.env, now = Date.now()) {
  const header = { alg: 'ES256', kid: env.APPLE_KEY_ID, typ: 'JWT' };
  const iat = Math.floor(now / 1000);
  const claims = { iss: env.APPLE_TEAM_ID, iat, exp: iat + 300, aud: 'https://appleid.apple.com', sub: env.APPLE_SERVICES_ID };
  const data = b64u(JSON.stringify(header)) + '.' + b64u(JSON.stringify(claims));
  const key = crypto.createPrivateKey(String(env.APPLE_PRIVATE_KEY).replace(/\\n/g, '\n'));
  const sig = crypto.sign('sha256', Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' });
  return data + '.' + b64u(sig);
}

/** The ID token's claims, checked against what this login expects. Throws on any mismatch. */
export function checkIdToken(p, idToken, { clientId, nonce, now = Date.now() }) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('no id token');
  let c;
  try { c = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { throw new Error('bad id token'); }
  if (!PROVIDERS[p].issuers.includes(c.iss)) throw new Error('wrong issuer');
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(clientId)) throw new Error('wrong audience');
  if (!(c.exp * 1000 > now)) throw new Error('expired');
  if (c.nonce !== nonce) throw new Error('wrong nonce');
  if (typeof c.sub !== 'string' || !c.sub) throw new Error('no subject');
  const emailOk = c.email && (c.email_verified === true || c.email_verified === 'true');
  return { sub: c.sub, email: emailOk ? String(c.email).toLowerCase() : null, name: typeof c.given_name === 'string' ? c.given_name : (typeof c.name === 'string' ? c.name : null) };
}

/** Trades the code for tokens at the provider. `fetchImpl` for tests. */
export async function exchangeCode(p, code, { clientId, redirect, env = process.env, fetchImpl = fetch }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code, redirect_uri: redirect, client_id: clientId,
    client_secret: p === 'google' ? env.GOOGLE_CLIENT_SECRET : appleClientSecret(env),
  });
  const res = await fetchImpl(PROVIDERS[p].token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body, signal: AbortSignal.timeout(10000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) throw new Error('token exchange failed (' + res.status + ')');
  return data.id_token;
}

/** A display name for a new profile: the given name, else the e-mail's local part, else the provider. */
export function nameFor(claims, appleUser, p) {
  const a = appleUser?.name?.firstName;
  const raw = (typeof a === 'string' && a) || claims.name || (claims.email ? claims.email.split('@')[0] : '') || (p === 'apple' ? 'Apple user' : 'Google user');
  return String(raw).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 32) || 'Recruit';
}

/* ---------- Sign in with Apple inside the iPhone app (native) ----------
 * The app shows Apple's own sheet (scripts/ios/badgefit/AppleSignInPlugin.swift) and sends us the
 * identity token Apple gave it. That token came through the phone, not straight from Apple, so
 * here its signature IS checked, against Apple's published keys, as well as issuer, audience (the
 * app's bundle id), expiry and our nonce. No Services ID or .p8 key is needed for this.
 */
export const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
export const appleBundleId = (env = process.env) => env.APPLE_BUNDLE_ID || 'au.com.badgefit.app';
let appleKeys = { at: 0, keys: [] };

/** Apple's signing keys (JWKS), kept for an hour; fetched again when a token names a new key. */
export async function appleJwks({ kid, fetchImpl = fetch, now = Date.now() } = {}) {
  const fresh = now - appleKeys.at < 3600000 && (!kid || appleKeys.keys.some(k => k.kid === kid));
  if (fresh) return appleKeys.keys;
  const res = await fetchImpl(APPLE_KEYS_URL, { signal: AbortSignal.timeout(10000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.keys)) throw new Error('apple keys unavailable');
  appleKeys = { at: now, keys: data.keys };
  return data.keys;
}
export const _resetAppleKeys = () => { appleKeys = { at: 0, keys: [] }; };

/** The SHA-256 of the raw nonce, in hex: what the app puts in Apple's request. */
export const nonceHash = raw => crypto.createHash('sha256').update(String(raw)).digest('hex');

/**
 * An identity token from the app, verified: RS256 signature by one of Apple's keys, issuer,
 * audience, expiry and nonce. Returns { sub, email, name: null }. Throws on anything else.
 */
export function verifyAppleIdentityToken(idToken, { keys, audience, nonce, now = Date.now() }) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('no id token');
  let h, c;
  try {
    h = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    c = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { throw new Error('bad id token'); }
  if (h.alg !== 'RS256') throw new Error('wrong algorithm');
  const jwk = (keys || []).find(k => k.kid === h.kid && k.kty === 'RSA');
  if (!jwk) throw new Error('unknown key');
  const pub = crypto.createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' });
  const ok = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), pub, Buffer.from(parts[2], 'base64url'));
  if (!ok) throw new Error('bad signature');
  if (!PROVIDERS.apple.issuers.includes(c.iss)) throw new Error('wrong issuer');
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(audience)) throw new Error('wrong audience');
  if (!(c.exp * 1000 > now)) throw new Error('expired');
  if (!nonce || c.nonce !== nonceHash(nonce)) throw new Error('wrong nonce');
  if (typeof c.sub !== 'string' || !c.sub) throw new Error('no subject');
  const emailOk = c.email && (c.email_verified === true || c.email_verified === 'true');
  return { sub: c.sub, email: emailOk ? String(c.email).toLowerCase() : null, name: null };
}
