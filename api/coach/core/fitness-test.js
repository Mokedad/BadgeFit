/* The police fitness test (PCT): the standard someone trains for, the results they log, what is
 * short of the standard and when to test again. Shared by the app (frontend/src/lib/pct.js, the
 * screen and the Home card) and the Coach payload, so both read the same gaps.
 *
 * S.fitnessTest = {
 *   standard: 'nsw' | 'custom',
 *   name?:    the custom standard's name,
 *   targets?: { beep, plank, vjump, pushups, illinois } overriding the standard's,
 *   skip?:    tests left out (grip strength is never tracked: it needs a dynamometer),
 *   every:    7 | 14, days between tests,
 *   goalWeight?: kg, optional,
 *   results:  [{ d: 'YYYY-MM-DD', beep?: '7.1', plank?, vjump?, pushups?, illinois?, bw? }]
 * }
 *
 * The beep test is a level and a shuttle ("7.1" is level 7, shuttle 1), compared as a pair, not
 * as a decimal: 7.10 comes after 7.9. Everything else is a plain number: plank seconds, vertical
 * jump cm, push-up reps (more is better) and the Illinois agility run in seconds (less is better).
 * No clock is read: `today` is handed in.
 */

export const TESTS = ['beep', 'plank', 'vjump', 'pushups', 'illinois'];

// What each test trains when it falls short, for the Coach and the screen.
export const FOCUS = {
  beep: 'endurance',     // aerobic base and VO2 max: intervals, tempo runs, shuttle practice
  plank: 'core',         // trunk endurance: planks, dead bugs, carries
  vjump: 'power',        // lower-body power: squats, jumps, plyometrics
  pushups: 'upper',      // pressing endurance: push-up volume, bench, dips
  illinois: 'agility',   // speed and change of direction: sprints, cone drills
};
const LOWER_IS_BETTER = new Set(['illinois']);

// NSW Police Force Physical Competency Test. Grip strength (30 kg each hand) is part of it but
// not tracked here. The beep test level is the one published for NSW recruits (7.1).
export const STANDARDS = {
  nsw: { name: 'NSW Police PCT', targets: { beep: '7.1', plank: 90, vjump: 30, pushups: 25, illinois: 20 } },
};

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);
const list = v => (Array.isArray(v) ? v : []);
const DAY = 86400000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "7.1" → [7, 1]; null when it is not a level and shuttle. */
export function parseBeep(v) {
  const m = /^\s*(\d{1,2})(?:[.,/:](\d{1,2}))?\s*$/.exec(String(v ?? ''));
  if (!m) return null;
  const l = Number(m[1]), s = Number(m[2] ?? 0);
  return l >= 1 && l <= 25 && s <= 20 ? [l, s] : null;
}
const beepNum = v => { const b = parseBeep(v); return b ? b[0] * 100 + b[1] : null; };
const beepStr = v => { const b = parseBeep(v); return b ? `${b[0]}.${b[1]}` : null; };

/** A test's value as a comparable number, or null. */
function score(test, v) {
  if (test === 'beep') return beepNum(v);
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 && n < 10000 ? n : null;
}
const clean = (test, v) => (test === 'beep' ? beepStr(v) : score(test, v));

/** Whether `have` meets `need` for this test. */
export function meets(test, have, need) {
  const a = score(test, have), b = score(test, need);
  if (a == null || b == null) return null;
  return LOWER_IS_BETTER.has(test) ? a <= b : a >= b;
}

/** The standard in force: its name and per-test targets, with the person's own overrides. */
export function standardOf(ft) {
  if (!isMap(ft)) return null;
  const base = STANDARDS[ft.standard] || { name: '', targets: {} };
  const own = isMap(ft.targets) ? ft.targets : {};
  const skip = new Set(list(ft.skip));
  const targets = {};
  for (const k of TESTS) {
    if (skip.has(k)) continue;
    const v = clean(k, own[k] ?? base.targets[k]);
    if (v != null) targets[k] = v;
  }
  const name = typeof ft.name === 'string' && ft.name.trim() ? ft.name.trim().slice(0, 60) : base.name;
  return { id: STANDARDS[ft.standard] ? ft.standard : 'custom', name, targets };
}

/** The results, cleaned and oldest first. */
export function resultsOf(ft) {
  return list(ft?.results)
    .filter(r => isMap(r) && DATE.test(r.d))
    .map(r => {
      const out = { d: r.d };
      for (const k of TESTS) { const v = clean(k, r[k]); if (v != null) out[k] = v; }
      const bw = Number(r.bw);
      if (Number.isFinite(bw) && bw > 20 && bw < 400) out.bw = Math.round(bw * 10) / 10;
      return out;
    })
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}

export const everyOf = ft => (Number(ft?.every) === 7 ? 7 : 14);

const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / DAY);

/**
 * Where someone stands: the latest result per test against the standard, what is short, and when
 * the next test is. `gaps` lists the tests not yet passed, the furthest off first (by how far off
 * the target they are, as a share of it); a test never done counts as a gap with no `have`,
 * listed after the measured ones.
 */
export function fitnessStatus(ft, today) {
  const std = standardOf(ft);
  if (!std) return null;
  const results = resultsOf(ft);
  const latest = {}, previous = {};
  for (const r of results) for (const k of TESTS) if (r[k] != null) { if (latest[k] != null) previous[k] = latest[k]; latest[k] = r[k]; }
  const tests = Object.keys(std.targets).map(k => {
    const need = std.targets[k], have = latest[k] ?? null;
    const pass = have == null ? false : meets(k, have, need);
    let short = 1;
    if (have != null) {
      const a = score(k, have), b = score(k, need);
      short = LOWER_IS_BETTER.has(k) ? (a - b) / b : (b - a) / b;
    }
    const trend = previous[k] != null && have != null
      ? (meets(k, have, previous[k]) ? (score(k, have) === score(k, previous[k]) ? 'same' : 'up') : 'down')
      : null;
    return { test: k, need, have, pass: !!pass, short: Math.round(Math.max(0, short) * 100) / 100, focus: FOCUS[k], ...(trend ? { trend } : {}) };
  });
  // Measured shortfalls first, the furthest off leading; tests never done come after them.
  const gaps = tests.filter(x => !x.pass).sort((a, b) => (a.have == null) - (b.have == null) || b.short - a.short);
  const last = results.at(-1)?.d || null;
  const every = everyOf(ft);
  const nextTest = last ? addDays(last, every) : today;
  const lastBw = [...results].reverse().find(r => r.bw != null)?.bw ?? null;
  const goalWeight = Number(ft.goalWeight);
  const weight = Number.isFinite(goalWeight) && goalWeight > 20 && lastBw != null
    ? { have: lastBw, goal: Math.round(goalWeight * 10) / 10, toLose: Math.round(Math.max(0, lastBw - goalWeight) * 10) / 10 }
    : null;
  return {
    standard: std.name, id: std.id, every, tests, gaps,
    passed: tests.length > 0 && gaps.length === 0,
    lastTest: last, nextTest, due: !last || (today && today >= nextTest),
    daysToNext: today ? daysBetween(today, nextTest) : null,
    count: results.length,
    ...(weight ? { weight } : {}),
  };
}

/** The Coach's view (payload `fitnessTest`): small and bounded, or null when nothing is set up. */
export function fitnessTestOf(S, today) {
  const ft = S?.fitnessTest;
  if (!isMap(ft) || ft.off === true) return null;
  const st = fitnessStatus(ft, today);
  if (!st || !st.tests.length) return null;
  return {
    standard: st.standard,
    nextTest: st.nextTest,
    everyDays: st.every,
    ...(st.lastTest ? { lastTest: st.lastTest } : {}),
    tests: st.tests.map(x => ({ test: x.test, need: x.need, ...(x.have != null ? { have: x.have } : {}), pass: x.pass, focus: x.focus, ...(x.trend ? { trend: x.trend } : {}) })),
    priorities: st.gaps.filter(x => x.have != null).slice(0, 3).map(x => x.focus),
    ...(st.gaps.some(x => x.have == null) ? { untested: st.gaps.filter(x => x.have == null).map(x => x.test) } : {}),
    ...(st.weight ? { weight: st.weight } : {}),
  };
}
