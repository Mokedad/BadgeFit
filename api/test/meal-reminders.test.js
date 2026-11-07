/* BadgeFit meal reminders (meal-reminders.js): the settings cleaned, the due window, the copy,
   and the real server's tick sending each one once per local date. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';
import { cleanMealReminders, dueMeals, mealPush, lineFor, MEALS } from '../meal-reminders.js';

test('settings: off is null, bad times fall back, a bad zone is UTC', () => {
  assert.equal(cleanMealReminders(null), null);
  assert.equal(cleanMealReminders({ on: false }), null);
  const c = cleanMealReminders({ on: true, tz: 'Australia/Sydney', meals: { breakfast: { time: '06:30' }, lunch: { time: '25:00' }, dinner: { on: false } } });
  assert.equal(c.tz, 'Australia/Sydney');
  assert.deepEqual(c.meals.breakfast, { on: true, time: '06:30' });
  assert.equal(c.meals.lunch.time, '12:30');
  assert.equal(c.meals.dinner.on, false);
  assert.equal(cleanMealReminders({ on: true, tz: '"; rm -rf /' }).tz, 'UTC');
});

test('due: inside 15 minutes after the time, once, and not when switched off', () => {
  const c = cleanMealReminders({ on: true, meals: { breakfast: { time: '07:00' }, preworkout: { time: '07:10', on: false } } });
  assert.deepEqual(dueMeals(c, '06:59'), []);
  assert.deepEqual(dueMeals(c, '07:00'), ['breakfast']);
  assert.deepEqual(dueMeals(c, '07:15'), ['breakfast']);
  assert.deepEqual(dueMeals(c, '07:16'), []);
  assert.deepEqual(dueMeals(c, '07:05', ['breakfast']), []);
});

test('the push: emoji title, the same line all day, opens Food', () => {
  const p = mealPush('preworkout', '2026-11-08');
  assert.equal(p.title, '⚡ Pre-workout');
  assert.equal(p.tag, 'meal-preworkout');
  assert.equal(p.url, '#/police?tab=food');
  assert.equal(p.body, lineFor('preworkout', '2026-11-08'));
  assert.equal(MEALS.length, 4);
});

const SECRET = crypto.randomBytes(32).toString('hex');
const hhmmAgo = m => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(Date.now() - m * 60000));
  const g = type => parts.find(p => p.type === type)?.value;
  return `${g('hour')}:${g('minute')}`;
};

test('the server tick sends the due meals once and records them', async t => {
  if (new Date().getUTCHours() === 0 && new Date().getUTCMinutes() < 31) return t.skip('too close to midnight UTC for a same-day window');
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-meals-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  const users = [{ id: 'u_meal', name: 'Mo', created: new Date().toISOString() }];
  const subs = [{ userId: 'u_meal', endpoint: 'https://localhost/x', keys: { p256dh: 'p', auth: 'a' }, created: new Date().toISOString() }];
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ users, creds: [], subs, invites: [] }));
  const mealReminders = { on: true, tz: 'UTC', meals: { breakfast: { time: hhmmAgo(1) }, lunch: { time: hhmmAgo(30) }, preworkout: { time: hhmmAgo(1), on: false }, dinner: { time: hhmmAgo(2) } } };
  fs.writeFileSync(path.join(dataDir, 'state-u_meal.json'), JSON.stringify({ routines: [], workouts: [], police: { mealReminders } }));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost', REMINDER_TICK_MS: '200' },
  });
  let log = '';
  child.stdout.on('data', d => log += d); child.stderr.on('data', d => log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  await boundPort(child, () => log);
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && !/meal reminder firing/.test(log)) await new Promise(r => setTimeout(r, 200));
  await new Promise(r => setTimeout(r, 800)); // a few more ticks: nothing may go out twice
  assert.equal((log.match(/meal reminder firing/g) || []).length, 1, log);
  assert.match(log, /meal reminder firing u_meal breakfast,dinner/, log);
  const db = JSON.parse(fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8'));
  assert.deepEqual(db.users[0].lastMeals.sent, ['breakfast', 'dinner']);
});
