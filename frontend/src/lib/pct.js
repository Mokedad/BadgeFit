// The police fitness test (PCT) on the app side. The rules (standards, gaps, next test date) live
// in api/coach/core/fitness-test.js so the Coach reads exactly the same thing; this adds the
// words and the edits the screen makes to S.fitnessTest.
import { t } from './i18n-core.js'
export { TESTS, FOCUS, STANDARDS, parseBeep, meets, standardOf, resultsOf, fitnessStatus, everyOf } from '../../../api/coach/core/fitness-test.js'
import { TESTS, parseBeep, fitnessStatus } from '../../../api/coach/core/fitness-test.js'

export const DEFAULT_FT = { standard: 'nsw', every: 14, results: [] }

/** A test's name, the unit its number is in, and whether lower is better. */
export function testInfo(k) {
  if (k === 'beep') return { name: t('Beep test'), unit: t('level'), hint: t('Level and shuttle, like 7.1') }
  if (k === 'plank') return { name: t('Plank'), unit: t('s'), hint: t('Seconds held') }
  if (k === 'vjump') return { name: t('Vertical jump'), unit: t('cm'), hint: t('Centimetres') }
  if (k === 'pushups') return { name: t('Push-ups'), unit: t('reps'), hint: t('Strict reps') }
  return { name: t('Illinois agility'), unit: t('s'), hint: t('Seconds, lower is better') }
}

/** What a focus means, in one line. */
export function focusText(f) {
  if (f === 'endurance') return t('Endurance and VO2 max: intervals and shuttle runs')
  if (f === 'core') return t('Core: planks and trunk work')
  if (f === 'power') return t('Power: squats and jumps')
  if (f === 'upper') return t('Upper body: push-up volume and pressing')
  return t('Agility: sprints and cone drills')
}

/** A value as the screen shows it: "7.1", "90 s", "30 cm". */
export function fmtTest(k, v) {
  if (v == null || v === '') return '–'
  if (k === 'beep') { const b = parseBeep(v); return b ? `${b[0]}.${b[1]}` : String(v) }
  return `${Math.round(Number(v) * 10) / 10} ${testInfo(k).unit}`
}

/**
 * Save one day's results into the draft state `s` (a store update): one entry per date, the
 * newer typing of a day replacing its older one. Empty fields are left out. Body weight `bw`
 * is in kg.
 */
export function saveResult(s, d, values) {
  const ft = s.fitnessTest = { ...DEFAULT_FT, ...(s.fitnessTest || {}) }
  const row = { d }
  for (const k of TESTS) {
    const v = values?.[k]
    if (v == null || v === '') continue
    if (k === 'beep') { const b = parseBeep(v); if (b) row.beep = `${b[0]}.${b[1]}` } else if (Number(v) > 0) row[k] = Number(v)
  }
  if (Number(values?.bw) > 0) row.bw = Math.round(Number(values.bw) * 10) / 10
  if (Object.keys(row).length === 1) return false
  ft.results = [...(ft.results || []).filter(r => r?.d !== d), row].sort((a, b) => (a.d < b.d ? -1 : 1))
  return true
}

export function removeResult(s, d) {
  if (!s.fitnessTest) return
  s.fitnessTest = { ...s.fitnessTest, results: (s.fitnessTest.results || []).filter(r => r?.d !== d) }
}

// ---- Test day on the phones -----------------------------------------------------------------

export const TEST_DAY_ID = 4100

/**
 * One notification on the next test date, at `time` (the breakfast tip's or the reminder's), or
 * nothing: no test set up, switched off, or the date is not in the future. Before a first test
 * there is no date to remind of; Home asks for the baseline instead.
 */
export function buildTestDayNotification(S, now = new Date(), time = '08:00') {
  const ft = S?.fitnessTest
  if (!ft || ft.off === true) return []
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const st = fitnessStatus(ft, iso(now))
  if (!st?.lastTest) return []
  const [h, m] = String(time).split(':').map(Number)
  const at = new Date(st.nextTest + 'T00:00:00')
  at.setHours(Number.isInteger(h) ? h : 8, Number.isInteger(m) ? m : 0, 0, 0)
  if (!(at > now)) return []
  return [{ id: TEST_DAY_ID, title: t('Fitness test day'), body: t('Redo your test and log the results, so the Coach can update your plan.'), schedule: { at, allowWhileIdle: true } }]
}
