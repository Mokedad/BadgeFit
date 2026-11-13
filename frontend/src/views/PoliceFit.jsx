// Police Prep: the police applicant hub. Hayden's daily briefing, the six physical standards
// with pass/fail tracking, the 12-week beginner/intermediate programme (installed as ordinary
// routines and a programme, so it runs in the normal workout screen), the rep-range rule, and
// the nutrition guides. All logic lives in lib/police/*, each with its test beside it.
//
// Copy here is English only: the programme is written for Australian police applicants. It is
// kept out of t() on purpose so the locale checks do not ask nineteen packs to translate it.
import { exerciseNameFor } from '../lib/i18n-core.js'
import { EXIDX } from '../lib/exercises.js'
import { seenPatch, comfort } from '../lib/police/first-steps.js'
import { Thumb } from '../components/Media.jsx'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { DEMO } from '../lib/demo.js'
import { todayISO, localTZ } from '../lib/format.js'
import { lastBW, effectiveRoutineIds } from '../lib/history.js'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, Segmented, Switch, TextField } from '../components/ui.jsx'
import { saveProgramme, startProgramme } from '../lib/programmes.js'
import { isOn } from '../lib/modules.js'
import { MOBILE, syncReminder } from '../lib/mobile.js'
import { pushSupported, enablePush } from '../lib/push.js'
import { MEALS, mealSettings } from '../lib/police/meal-reminders.js'
import { BRAND } from '../lib/police/brand.js'
import { DEFAULT_BEEP_TARGET, DEFAULT_BEEP_GOAL, BEEP_LEVELS, evaluate, readiness, fmtResult, bestResult, parseBeep } from '../lib/police/standards.js'
import { REP_RANGES, rangeById, nextSetAdvice } from '../lib/police/set-advice.js'
import { LEVELS, PHASES, WEEKS, WARMUP, zone2, startForTest, daysUntil, planOptsOf, planWeekOf, planStart, PHASE_WORDS, weekPlan, phaseOf, templateWeek, buildPoliceProgramme, applyPhaseRange } from '../lib/police/programme.js'
import { DIETS, PRINCIPLES, RECOVERY, DISCLAIMER, SUPPLEMENTS, macroTargets, proteinFor, proteinTable, creatineFor } from '../lib/police/nutrition.js'
import { RUN_CARE, RUN_CARE_INTRO, findCare } from '../lib/police/run-care.js'
import { addMeal, removeMeal, dayTotals, lastDays, quickMeals, bodyProgress } from '../lib/police/meals.js'
import { bwSheet, startFlow, confirmSheet } from '../sheets.jsx'
import { deleteRoutine } from '../lib/routines.js'
import { briefing, setLine, resultLine } from '../lib/police/jarvis.js'
import MusicBar from '../components/MusicBar.jsx'
import { useRun } from '../store/useRun.js'
import { runForRoutine } from '../lib/police/run-routines.js'
import BeepTrainer from '../components/BeepTrainer.jsx'
import { buildPushPlan, nudgeSettings } from '../lib/police/push-plan.js'
import { voiceCheck } from '../lib/police/voice.js'
import TestDay from '../components/TestDay.jsx'
import { testDayResults } from '../lib/police/test-day.js'
import { RUNS, CATEGORIES, runById, runForDay, runMinutes, runsThisWeek } from '../lib/police/runs.js'
import PlanDays from '../components/PlanDays.jsx'
import { isBadgeFit, toSignIn } from '../lib/police/guest.js'
import '../police.css'

// The lean hub: the workout of the day, the plan to the test, the test itself. The rest is kept
// under More, one tap away, so a new recruit sees three things.
const TABS = [
  { value: 'today', label: 'Today', sym: '⭐' },
  { value: 'plan', label: 'Plan', sym: '📅' },
  { value: 'tests', label: 'PCT', sym: '🎯' },
  { value: 'more', label: 'More', sym: '➕' },
]
const MORE = [
  { value: 'run', label: 'Runs', sym: '🏃', sub: 'Hayden tells you when to run and when to walk' },
  { value: 'strength', label: 'Strength', sym: '🏋️', sub: 'How heavy to lift, and a warm-up' },
  { value: 'food', label: 'Food', sym: '🍽️', sub: 'What to eat to train well' },
  { value: 'care', label: 'Care', sym: '🩹', sub: 'Something sore? Start here' },
]
const ALL_TABS = [...TABS, ...MORE]
// The calm header's title for each page (the one bar is components/CalmNav.jsx).
const CALM_TITLE = { today: 'Hayden', plan: 'Plan', more: 'More', run: 'Runs', strength: 'Strength', food: 'Food', care: 'Care' }

// Symbols for the kinds of day and the recovery chips, so a week reads at a glance.
const DAY_ICON = { gym: 'dumbbell', run: 'figureRun', walk: 'figureRun', rest: 'moon', test: 'target' }
const DAY_SYM = { gym: '🏋️', run: '🏃', walk: '🚶', rest: '😴', test: '🎯' } // spoken and plain-text lists still use these
const recSym = x => (/sauna/i.test(x) ? '🧖 ' : /boots/i.test(x) ? '🦵 ' : /sleep/i.test(x) ? '🛌 ' : '')

/** The hub's tabs: a symbol with a short word, six across. */
function PfTabs({ value, onChange }) {
  return <nav className="pf-tabbar" role="tablist" aria-label="BadgeFit">
    {TABS.map(x => { const on = x.value === value || (x.value === 'more' && MORE.some(m => m.value === value)); return <button key={x.value} role="tab" aria-selected={on} className={on ? 'on' : ''} onClick={() => onChange(x.value)}>
      <span aria-hidden="true">{x.sym}</span><small>{x.label}</small>
    </button> })}
  </nav>
}

const policeOf = S => S.police || {}
const usePolice = () => {
  const update = useStore(s => s.update)
  return patch => update(s => { s.police = { ...(s.police || {}), ...(typeof patch === 'function' ? patch(s.police || {}) : patch) } })
}

/** Reads text aloud with the browser's own voice, where there is one. */

// --- Today -------------------------------------------------------------------------------
function Today({ S, user, P, setTab, startRun, openTest }) {
  const nav = useNavigate()
  const ready = readiness(P.results, P.beepTarget)
  const pw = planWeekOf(P, todayISO())
  const testName = (P.testName || '').trim() || 'PCT'
  const week = pw.week
  const dow = new Date().getDay()
  const plan = P.level && week ? weekPlan(P.level, week, P.age, planOptsOf(P)) : null
  const day = plan?.days.find(d => d.day === dow)
  const lines = useMemo(() => briefing({ name: P.name || user?.name, hour: new Date().getHours(), week, total: pw.last, final: pw.final, testName, day, ready, after: pw.after, seed: Number(todayISO().replace(/-/g, '')) }),
    [P.name, user?.name, week, pw.last, pw.final, day, pw.after, ready.passed, ready.weakest?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fresh = !P.level || !P.start
  return <>
    {fresh && <Setup S={S} P={P} />}
    {fresh ? null : <div className="card pf-todaycard">
      <div className="row between"><h3>{pw.after ? `After your ${testName}` : pw.final ? `Final week · week ${week} of ${pw.last}` : `Week ${week} of ${pw.last}`}</h3><span className="pf-chip">Phase {plan.phase.n} of 3</span></div>
      <p className="pf-sub pf-explain">{pw.after
        ? `Your plan is done. It keeps going (later plan weeks, then peak weeks 9 to 11 in turn) so you stay fit. Got another test? Set the new date in Tests.`
        : pw.before
          ? pw.last < WEEKS || pw.startsIn <= 3
            ? `Your plan starts on Monday${pw.last < WEEKS ? ` and runs ${pw.last} weeks to your ${testName}` : ''}. Until then, try week 1's sessions or rest up.`
            : `Your 12-week plan starts in ${pw.startsIn} days, so it ends on your test day. Until then, repeat week 1 to build your base.`
          : pw.final
            ? `Your ${testName} is this week. Light training and good recovery: half the sets, same intensity, nothing to failure, sleep 8 hours, eat well. Arrive fresh.`
            : P.testDate
              ? `Your plan is ${pw.last} weeks, up to your ${testName}${pw.last > WEEKS ? ' (the 12-week cycle repeats, ending on test day)' : ''}. Week ${pw.last} is your final week: light training. Phase ${plan.phase.n}: ${PHASE_WORDS[plan.phase.n]}.`
              : `No test date yet, so a 12-week plan in 3 phases. Phase ${plan.phase.n}: ${PHASE_WORDS[plan.phase.n]}. Lifts in the ${plan.phase.range} rep range.`}</p>
      {day && <DayCard d={day} today />}
      {(() => {
        // What is on today: a run, a gym session, or both (a run picked for a gym day adds to it).
        const iso = todayISO()
        const ids = effectiveRoutineIds(S, iso)
        const picked = ids.map(id => runForRoutine(P, id, iso)).find(Boolean)
        const run = picked || runForDay(day)
        const gymIds = ids.filter(id => !runForRoutine(P, id, iso))
        const hasGym = gymIds.length > 0 || (day?.kind === 'gym' && !picked)
        // Done today: complete, not offered again (each part on its own).
        const ran = (P.runLog || []).filter(r => r.at === iso).at(-1)
        const doneW = !S.active && S.workouts.filter(w => w.d === iso && !w.runLogId).at(-1)
        const runPart = run && (ran
          ? <div className="pf-ran" key="r"><b>✅ Run done</b><span>{ranName(ran)} · {ran.min} min</span></div>
          : <button key="r" className="pf-go" onClick={() => startRun(run)}>🏃 Start run · {run.name}</button>)
        const gymPart = hasGym && (doneW
          ? <div className="pf-ran" key="g"><b>✅ Workout done</b><span>{doneW.name || 'Workout'}</span></div>
          : <button key="g" className="pf-go" onClick={() => {
            // Straight into today's gym session: one tap, no second Start on Home.
            if (S.active) { nav('/workout'); return }
            if (gymIds.length) startFlow(gymIds); else nav('/home')
          }}>{S.active ? '🏋️ Back to your workout' : '🏋️ Start workout'}</button>)
        if ((!run || ran) && (!hasGym || doneW) && (ran || doneW)) return <div className="pf-ran"><b>✅ Today complete</b><span>{[ran && `${ranName(ran)} · ${ran.min} min`, doneW && (doneW.name || 'Workout')].filter(Boolean).join(' · ')}</span></div>
        if (runPart || gymPart) return <div className="pf-today-acts">{gymPart}{runPart}</div>
        if (day?.kind === 'test') return <button className="pf-go" onClick={openTest}>🧪 Start test day</button>
        return null
      })()}
      <PhaseSync S={S} P={P} week={pw.tw || 1} />
    </div>}

    <StatusStrip S={S} P={P} ready={ready} setTab={setTab} />
    <div className="card pf-jarvis">
      <div className="pf-jarvis-h"><span className="pf-orb" aria-hidden="true" /><b>{BRAND.coach}</b><span className="pf-sub">Your trainer</span></div>
      {lines.slice(1, 3).map((l, i) => <p key={i}>{l}</p>)}
      {!fresh && <JarvisSwitches S={S} P={P} />}
    </div>
  </>
}

/** Notifications allowed for BadgeFit: on the phone app its local ones, on the web the push from the server. */
async function allowNotifications(user, S, nextPolice) {
  if (MOBILE) {
    const ok = await syncReminder({ ...S, police: nextPolice }, true)
    if (!ok) throw new Error('Allow notifications for BadgeFit in your phone settings, then try again')
    return
  }
  if (!user) throw new Error('Sign in first: reminders come from your BadgeFit server')
  if (!pushSupported()) throw new Error('On iPhone: Share → Add to Home Screen, open BadgeFit from there, then turn this on')
  await enablePush()
}

/** Hayden's two switches: the morning nudge (with the test reminders) and music mode. */
function JarvisSwitches({ S, P }) {
  const setP = usePolice()
  const user = useStore(s => s.user)
  const [busy, setBusy] = useState(false)
  const nudge = nudgeSettings(P.nudge)
  const turnNudge = async on => {
    if (!on) { setP({ nudge: { ...nudge, on: false }, pushPlan: { on: false } }); return }
    setBusy(true)
    try {
      const next = { ...P, nudge: { ...nudge, on: true } }
      const plan = buildPushPlan(next, todayISO(), localTZ())
      await allowNotifications(user, S, { ...next, pushPlan: plan })
      setP({ nudge: next.nudge, pushPlan: plan })
      useUI.getState().toast(`🔔 Every morning at ${nudge.time}: today's session and the days left`)
    } catch (e) { useUI.getState().toast(e?.message || 'Notifications were not allowed') } finally { setBusy(false) }
  }
  return <div className="pf-jsw">
    <label className="pf-jsw-row"><span><b>🔔 Morning nudge</b><small>Today's session and the days left, every morning at {nudge.time}</small></span>
      {nudge.on && <input type="time" value={nudge.time} aria-label="Nudge time" onChange={e => { if (!e.target.value) return; const n = { ...nudge, time: e.target.value }; setP(p => ({ nudge: n, pushPlan: buildPushPlan({ ...p, nudge: n }, todayISO(), localTZ()) })) }} />}
      <Switch checked={nudge.on} disabled={busy} onChange={() => turnNudge(!nudge.on)} aria-label="Morning nudge" /></label>
    <button type="button" className="pf-hear" disabled={busy} onClick={async () => {
      setBusy(true)
      try {
        const r = await voiceCheck('Hi, it\'s Hayden. This is how I sound in your workouts and on your runs. Let\'s get to work.')
        useUI.getState().toast(r.via === 'phone' ? `That was the phone's voice, because ${r.why}` : '✅ That was Hayden\'s Gemini voice.')
      } finally { setBusy(false) }
    }}>🔊 Hear Hayden</button>
    <label className="pf-jsw-row"><span><b>🎵 Music mode</b><small>Training to Spotify or YouTube: Hayden keeps it short and uses the phone's voice, which talks over your music</small></span>
      <Switch checked={!!P.musicMode} onChange={() => setP({ musicMode: !P.musicMode })} aria-label="Music mode" /></label>
  </div>
}

/** Everything beyond today, the plan and the test, filed in one list: one tap away. */
const MORE_ICON = { run: 'figureRun', strength: 'dumbbell', food: 'flame', care: 'heart' }
function More({ setTab, calm }) {
  const nav = useNavigate()
  // With the calm look: a grid of tiles, a picture and a name each, nothing to read.
  if (calm) {
    const guestHere = !useStore.getState().user && !DEMO
    const tile = (icon, label, go) => <button key={label} className="pf-mtile" onClick={go}><span aria-hidden="true"><Icon name={icon} /></span><b>{label}</b></button>
    return <div className="pf-mgrid">
      {MORE.map(m => tile(MORE_ICON[m.value] || 'list', m.label, () => setTab(m.value)))}
      {tile('personCircle', 'Community', () => (guestHere ? membersOnly() : nav('/community')))}
      {tile('chart', 'Progress', () => nav('/stats'))}
      {tile('list', 'Exercises', () => nav('/library'))}
      {tile('sparkles', 'Hayden', () => setTab('today'))}
      {tile('gear', 'Settings', () => nav('/settings'))}
    </div>
  }
  const row = (icon, label, sub, go) => <button key={label} className="pf-more-row" onClick={go}><span className="pf-more-i" aria-hidden="true"><Icon name={icon} /></span><span><b>{label}</b><small>{sub}</small></span><Icon name="chevronRight" /></button>
  return <div className="card pf-more-list">
    {MORE.map(m => row(MORE_ICON[m.value] || 'list', m.label, m.sub, () => setTab(m.value)))}
    {row('personCircle', 'Community', 'Train alongside other recruits', () => nav('/community'))}
  </div>
}

/** Three numbers at a glance: days to the test, readiness, weight change. Each opens its tab. */
function StatusStrip({ S, P, ready, setTab }) {
  const left = P.testDate ? daysUntil(P.testDate, todayISO()) : null
  const bw = (S.bodyweight || []).filter(b => b && Number(b.w) > 0).sort((a, b) => (a.d < b.d ? -1 : 1))
  const nowKg = bw.length ? Number(bw.at(-1).w) : Number(P.weightKg) || null
  const startKg = Number(P.weightKg) || (bw[0] ? Number(bw[0].w) : null)
  const change = nowKg && startKg ? Math.round((nowKg - startKg) * 10) / 10 : null
  return <div className="pf-strip pf-strip3">
    <button onClick={() => setTab('tests')}><b>{left != null && left >= 0 ? left : '–'}</b><span>⏳ days to {(P.testName || '').trim() || 'PCT'}</span></button>
    <button onClick={() => setTab('tests')}><b>{ready.pct}%</b><span>🎯 ready</span></button>
    <button onClick={() => setTab('tests')}><b>{nowKg ? `${nowKg}` : '–'}</b><span>{change ? `⚖️ ${change > 0 ? '+' : ''}${change} kg since start` : '⚖️ kg'}</span></button>
  </div>
}

/** Days to the test, and setting its date: the programme then counts down so week 12 is test week. */
function TestCountdown({ S, P }) {
  const update = useStore(s => s.update)
  const left = P.testDate ? daysUntil(P.testDate, todayISO()) : null
  const name = (P.testName || '').trim() || 'PCT'
  const pw = planWeekOf(P, todayISO())
  const setDate = d => update(s => {
    const prev = s.police || {}
    const next = { ...prev, testDate: d || undefined, planV: 3 }
    // The lifts move to the rep range of the week the new plan puts the member in.
    if (d && startForTest(d) && prev.level) {
      // The plan keeps its start and stretches or shrinks to the new date.
      next.start = prev.start || planStart(d, todayISO())
      const w = planWeekOf(next, todayISO()).tw || 1
      next.phase = phaseOf(prev.level, w).n
      if (prev.keys) s.routines = applyPhaseRange(s.routines, prev.level, w, prev.keys)
    }
    s.police = next
  })
  return <div className="card pf-count">
    {left != null && left >= 0
      ? <div className="pf-count-n"><b>{left}</b><span>{left === 1 ? 'day' : 'days'} to your {name}</span></div>
      : <div className="pf-count-n"><b>{name}</b><span>set the date</span></div>}
    <div className="pf-count-m">
      <div className="pf-2">
        <label>Event<TextField value={P.testName ?? ''} placeholder="PCT" maxLength={24} onChange={e => update(s => { s.police = { ...(s.police || {}), testName: e.target.value } })} /></label>
        <label>Date<TextField type="date" value={P.testDate || ''} onChange={e => setDate(e.target.value)} /></label>
      </div>
    </div>
  </div>
}

/** Weight from the start of the programme to now, toward the goal weight (Settings → goal). */
function BodyCard({ S, P }) {
  const nav = useNavigate()
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const b = bodyProgress(S.bodyweight, { startISO: P.start, startWeight: P.startWeight, goal: S.targetW })
  const spark = b && b.series.length > 1 ? (() => {
    const lo = Math.min(...b.series), hi = Math.max(...b.series), r = hi - lo || 1
    return b.series.map((w, i) => `${(i / (b.series.length - 1)) * 100},${30 - ((w - lo) / r) * 28 - 1}`).join(' ')
  })() : null
  return <div className="card pf-body">
    <div className="row between"><h3>Body</h3><Button size="sm" variant="primary" onClick={() => bwSheet()}>+ Weight</Button></div>
    {b ? <>
      <div className="pf-macros pf-bodyn">
        <div><b>{b.start}</b><span>start {unit}</span></div>
        <div><b>{b.now}</b><span>now {unit}</span></div>
        <div><b className={b.change <= 0 ? 'up' : 'down'}>{b.change > 0 ? '+' : ''}{b.change}</b><span>change</span></div>
        {b.toGoal != null && <div><b>{b.toGoal > 0 ? b.toGoal : '✓'}</b><span>{b.toGoal > 0 ? 'to goal' : 'goal hit'}</span></div>}
      </div>
      {b.pct != null && <div className="pf-bar"><span style={{ width: b.pct + '%' }} /></div>}
      {spark && <svg className="pf-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points={spark} /></svg>}
    </> : <p className="pf-sub">Log your weight a few mornings a week, same time, before breakfast. The weekly average is what counts.</p>}
    <div className="pf-actions">
      <Button size="sm" onClick={() => nav('/measurements')}>📏 Measure</Button>
      <Button size="sm" onClick={() => nav('/progress-photos')}>📸 Photos</Button>
    </div>
  </div>
}

/**
 * The welcome: three questions a beginner can answer in ten seconds, then one button. With a
 * test date the plan opens on the week that leads to it, already on that week's rep range.
 */
/**
 * Puts a BadgeFit plan on Home: its routines (gym days and runs), its weekly schedule as the
 * running programme, the lifts in the current phase's rep range. `choice`: 'badgefit' (gym and
 * runs) or 'run' (running focus). A plan already running keeps its start, so switching does not
 * restart the weeks; the routines of the plan it replaces are removed, your own are kept.
 */
function installPlan(update, P, { level, choice = 'badgefit', date = P.testDate, kg = null }) {
  const built = buildPoliceProgramme(level, Date.now(), { beepFocus: !!P.beepFocus || choice === 'run', runFocus: choice === 'run' })
  const start = P.start && P.planV === 3 ? P.start : planStart(date || null, todayISO())
  const weekAt = planWeekOf({ start, testDate: date || undefined }, todayISO()).tw || 1
  update(s => {
    const old = Object.values(s.police?.keys || {})
    const routines = applyPhaseRange(built.routines, level, weekAt, built.keys).map(({ police, ...r }) => r)
    s.routines = [...(s.routines || []), ...routines]
    saveProgramme(s, built.programme)
    startProgramme(s, built.programme.id)
    for (const id of old) if (!routines.some(r => r.id === id)) deleteRoutine(s, id)
    s.police = { ...(s.police || {}), level, start, planV: 3, planChoice: choice, programmeId: built.programme.id, keys: built.keys, phase: phaseOf(level, weekAt).n,
      ...(date ? { testDate: date } : {}), ...(kg > 30 ? { weightKg: kg } : {}) }
  })
}

const PLAN_CHOICES = [
  { id: 'badgefit', title: 'BadgeFit plan', sub: 'Gym days and runs on your level, ending on your test' },
  { id: 'run', title: 'Running focus', sub: 'Same base, more running: a second interval day and, for intermediate, an easy Sunday run' },
  { id: 'own', title: 'My own plan', sub: 'Hayden builds one around what you like, on your BadgeFit level and test date' },
]

/** Which plan Home follows: BadgeFit, running focus, or one Hayden builds (the Coach). */
function PlanChoice({ S, P }) {
  const update = useStore(s => s.update)
  const guest = !useStore(s => s.user) && !DEMO
  const nav = useNavigate()
  const onHome = !!S.programme?.id && S.programme.id === P.programmeId
  const current = onHome ? (P.planChoice || 'badgefit') : null
  const level = P.level || 'beginner'
  const pick = id => {
    if (id === 'own') {
      if (!isOn(S, 'coach')) { useUI.getState().toast('Hayden builds plans once the AI coach is switched on in Settings'); return }
      update(s => { s.police = { ...(s.police || {}), planChoice: 'own' } })
      nav('/coach/intake')
      return
    }
    if (id === current) return
    confirmSheet({
      title: id === 'run' ? 'Switch to running focus?' : 'Use the BadgeFit plan?',
      message: `Home then follows this plan, from the week you are in. Your own routines stay under Plan, nothing is deleted.`,
      confirmText: 'Use this plan',
      onConfirm: () => { installPlan(update, P, { level, choice: id }); useUI.getState().toast('✅ Done. Home shows this plan now.') },
    })
  }
  return <div className="card pf-planpick">
    <h3>Your plan</h3>
    {!onHome && P.planChoice !== 'own' && <p className="pf-warn">Home is following other routines right now, not your BadgeFit plan. Pick one below to put it on Home.</p>}
    {P.planChoice === 'own' && !onHome && <p className="pf-sub">Home follows the plan Hayden built you. Pick another below any time.</p>}
    <div className="pf-choice">{PLAN_CHOICES.map(c => { const locked = guest && c.id !== 'badgefit'; return <button key={c.id} className={(current === c.id || (c.id === 'own' && P.planChoice === 'own' && !onHome)) ? 'on' : locked ? 'locked' : ''} onClick={() => (locked ? membersOnly() : pick(c.id))}><b>{c.title}</b><small>{locked ? 'Members' : c.sub}</small></button> })}</div>
  </div>
}

/** The Intermediate plan is for members: a guest gets the simple plan. */
const membersOnly = () => useUI.getState().toast('Sign up free to unlock this')

function Setup({ S, P }) {
  const update = useStore(s => s.update)
  const setP = usePolice()
  const guest = !useStore(s => s.user) && !DEMO
  const [level, setLevel] = useState(guest ? 'beginner' : P.level || 'beginner')
  const [date, setDate] = useState(P.testDate || '')
  const [kg, setKg] = useState(P.weightKg ?? null)
  const build = () => {
    installPlan(update, P, { level, choice: 'badgefit', date, kg })
    useUI.getState().toast(date ? 'Week 1 starts now. Your plan ends on your test week.' : 'Your 12 weeks start today. Let us get to work.')
  }
  return <div className="card pf-welcome">
    <p className="pf-q">1. Where are you now?</p>
    <div className="pf-choice">
      <button className={level === 'beginner' ? 'on' : ''} onClick={() => setLevel('beginner')}><b>New to training</b><small>Or it has been a while</small></button>
      <button className={level === 'intermediate' ? 'on' : ''} onClick={() => guest ? membersOnly() : setLevel('intermediate')}><b>{guest ? 'Members' : 'I train regularly'}</b><small>{guest ? 'Sign up to unlock' : '6 months or more'}</small></button>
    </div>
    <p className="pf-q">2. Test date <small>(if booked)</small></p>
    <TextField type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="PCT date" />
    <p className="pf-q">3. Weight in kg</p>
    <NumberField value={kg} nullable onChange={setKg} aria-label="Weight in kg" />
    <button className="pf-go" onClick={build}>Start my plan</button>
    {S.programme && <p className="pf-sub">This replaces the programme running now.</p>}
    <button className="pf-link" onClick={() => setP({ level, start: P.start || planStart(date || null, todayISO()), planV: 3, ...(date ? { testDate: date } : {}) })}>Just show me the plan, I will track it myself</button>
  </div>
}

/** When the calendar has moved into a new phase, offers to move the lifts to its rep range. */
function PhaseSync({ S, P, week }) {
  const update = useStore(s => s.update)
  const phase = phaseOf(P.level, week)
  if (!P.keys || (P.phase || 1) >= phase.n) return null
  return <div className="pf-note">
    <b>Phase {phase.n} starts this week.</b> Move your lifts to {phase.range} reps?
    <Button size="sm" variant="primary" onClick={() => {
      update(s => {
        s.routines = applyPhaseRange(s.routines, P.level, week, P.keys)
        s.police = { ...(s.police || {}), phase: phase.n }
      })
      useUI.getState().toast(`Phase ${phase.n}: ${phase.range} reps. Heavier now.`)
    }}>Update my lifts</Button>
  </div>
}

// A day of the plan as a picture-led tile: the day, a short name, the minutes, and pictures of
// what is in it (the first exercises of a gym day; a symbol for a run, a walk or a rest). The
// words (what to focus on, recovery) open on a tap, so the week reads at a glance.
function DayCard({ d, today, S = null, P = null }) {
  const [open, setOpen] = useState(false)
  const rid = d.key && P?.keys?.[d.key]
  const routine = rid && d.kind === 'gym' ? (S?.routines || []).find(r => r.id === rid) : null
  const all = (routine?.ex || []).map(e => EXIDX[e.id]).filter(Boolean)
  const pics = all.slice(0, 3)
  return <div className={'pf-day pf-tile pfk-' + d.kind + (today ? ' on' : '')} onClick={() => setOpen(o => !o)} role="button" aria-expanded={open}>
    <div className="pf-tile-h">
      <span className="pf-tile-d">{today ? 'Today' : String(d.dayName).slice(0, 3)}</span>
      <span className="pf-tile-m"><b>{d.title}</b>{d.minutes ? <small>{d.minutes} min</small> : null}</span>
      <span className="pf-tile-p" aria-hidden="true">
        {pics.length ? pics.map(ex => <Thumb key={ex.id} ex={ex} />) : <span className="pf-tile-i"><Icon name={DAY_ICON[d.kind] || 'calendar'} /></span>}
      </span>
    </div>
    {open && (all.length
      ? <div className="pf-pics">{all.map(ex => <figure key={ex.id}><Thumb ex={ex} /><figcaption>{exerciseNameFor(ex)}</figcaption></figure>)}</div>
      : <ul>{d.details.slice(0, 2).map((x, i) => <li key={i}>{x}</li>)}</ul>)}
  </div>
}

// --- Run ---------------------------------------------------------------------------------
function RunTab({ S, P, startRun }) {
  // Opens on one kind of run (today's, or the first), not the whole list: a short page.
  const [cat, setCat] = useState(null)
  const pw = planWeekOf(P, todayISO())
  const week = pw.week
  const plan = P.level && week ? weekPlan(P.level, week, P.age, planOptsOf(P)) : null
  const todayRun = runForDay(plan?.days.find(d => d.day === new Date().getDay()))
  const done = runsThisWeek(P.runLog, todayISO())
  const ranToday = (P.runLog || []).filter(r => r.at === todayISO()).at(-1)
  const shown = cat || todayRun?.cat || CATEGORIES[0].id
  const list = shown === 'all' ? RUNS : RUNS.filter(r => r.cat === shown)
  const catOf = id => CATEGORIES.find(c => c.id === id)
  return <>
    {todayRun && <div className="card pf-todayrun">
      <span className="pf-sub">Today's run</span>
      <h3>{todayRun.name}</h3>
      <p className="pf-sub">{runMinutes(todayRun)} min</p>
      {ranToday ? <div className="pf-ran"><b>✅ Today complete</b><span>{ranName(ranToday)} · {ranToday.min} min done</span></div>
        : <button className="pf-go" onClick={() => startRun(todayRun)}>Start</button>}
    </div>}
    <div className="pf-strip pf-strip3">
      <div><b>{done.length}</b><span>runs this week</span></div>
      <div><b>{done.reduce((a, r) => a + (r.min || 0), 0)}</b><span>minutes</span></div>
      <div><b>{Math.round(done.reduce((a, r) => a + (Number(r.km) || 0), 0) * 10) / 10}</b><span>km</span></div>
    </div>
    <div className="pf-cats" role="tablist" aria-label="Run type">
      {CATEGORIES.map(c => <button key={c.id} className={shown === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.name}</button>)}
      <button className={shown === 'all' ? 'on' : ''} onClick={() => setCat('all')}>All</button>
    </div>
    <div className="card pf-runs">{list.map(r => <button key={r.id} className="pf-run" onClick={() => startRun(r)}>
      <span className="pf-run-e pf-more-i" aria-hidden="true"><Icon name={r.cat === 'walk' ? 'heart' : 'figureRun'} /></span>
      <span className="pf-run-m"><b>{r.name}</b><small>{runMinutes(r)} min · {r.km}</small></span>
      <Icon name="chevronRight" />
    </button>)}</div>
    <MusicBar />
    {(P.runLog || []).length > 0 && <Fold id="recentruns" title="Recent runs">
      {(P.runLog || []).slice(-6).reverse().map(r => <div key={r.id} className="pf-logrow">
        <span>{runById(r.run)?.name || 'Run'}</span><small>{r.at} · {r.min} min{r.km ? ` · ${r.km} km` : ''}{r.rpe ? ` · effort ${r.rpe}/10` : ''}</small>
      </div>)}
    </Fold>}
  </>
}

// --- Tests -------------------------------------------------------------------------------
function Tests({ S, P, openBeep, openTest }) {
  const setP = usePolice()
  const ready = readiness(P.results, P.beepTarget)
  const [open, setOpen] = useState(null)
  return <>
    {/* What you came for first: where you stand and the two tools. The date and the beep marks
        are settings, folded underneath. */}
    <div className="card pf-ready">
      <b>{ready.passed} of {ready.rows.length}</b><span>standards passing{ready.rows.some(r => !r.ev) ? `, ${ready.rows.filter(r => !r.ev).length} not tested yet` : ''}</span>
    </div>
    <div className="pf-tools">
      <button className="card pf-tool" onClick={openTest}><span className="pf-more-i" aria-hidden="true"><Icon name="target" /></span><b>Test day</b></button>
      <button className="card pf-tool" onClick={openBeep}><span className="pf-more-i" aria-hidden="true"><Icon name="timer" /></span><b>Beep test trainer</b></button>
    </div>
    {ready.rows.map(({ std, latest, ev }) => <div key={std.id} className="card pf-std">
      <button className="pf-std-h" onClick={() => setOpen(open === std.id ? null : std.id)}>
        <span className={'pf-std-dot' + (ev ? (ev.pass ? ' pass' : ' fail') : '')} aria-hidden="true">{ev?.pass ? <Icon name="check" /> : null}</span>
        <span className="pf-std-m">
          <b>{std.name}</b>
          <span className="pf-sub">{std.id === 'beep' ? `Level ${P.beepTarget || DEFAULT_BEEP_TARGET}` : `${std.better === 'lower' ? 'Under ' : ''}${std.min} ${std.unit}${std.perHand ? ' each hand' : ''}`}</span>
        </span>
        {ev ? <span className={'pf-chip ' + (ev.pass ? 'pass' : 'fail')}>{ev.pass ? 'PASS' : `${ev.pct}%`}</span> : <span className="pf-chip">Not tested</span>}
      </button>
      {ev && <div className="pf-bar"><span style={{ width: ev.pct + '%' }} /></div>}
      {latest && <p className="pf-sub">Latest: {fmtResult(std.id, latest.v)} on {latest.at}{(() => { const b = bestResult(P.results, std.id); return b && b !== latest ? ` · Best: ${fmtResult(std.id, b.v)}` : '' })()}</p>}
      {open === std.id && <LogForm std={std} P={P} onDone={() => setOpen(null)} />}
    </div>)}
    <Fold id="testdate" title="Test date">
      <TestCountdown S={S} P={P} />
    </Fold>
    <Fold id="beepmarks" title="Beep test: pass mark and your goal">
      <p className="pf-sub">Pass/fail is judged on the pass mark. Train for the goal above it, so test day feels comfortable. Standards differ by state and change: check your service's current requirement.</p>
      <div className="pf-2">
        <label>Pass mark<TextField value={P.beepTarget || DEFAULT_BEEP_TARGET} inputMode="decimal" onChange={e => setP({ beepTarget: e.target.value })} /></label>
        <label>Training goal<TextField value={P.beepGoal || DEFAULT_BEEP_GOAL} inputMode="decimal" onChange={e => setP({ beepGoal: e.target.value })} /></label>
      </div>
      {(!parseBeep(P.beepTarget || DEFAULT_BEEP_TARGET) || !parseBeep(P.beepGoal || DEFAULT_BEEP_GOAL)) && <p className="pf-warn">Write it as level.shuttle, for example 7.1</p>}
      <details className="pf-more"><summary>Beep test levels</summary>
        <table className="pf-table"><thead><tr><th>Level</th><th>Shuttles</th><th>km/h</th><th>s/shuttle</th></tr></thead>
          <tbody>{BEEP_LEVELS.slice(0, 13).map(l => <tr key={l.level}><td>{l.level}</td><td>{l.shuttles}</td><td>{l.speed}</td><td>{l.secPerShuttle}</td></tr>)}</tbody></table>
      </details>
    </Fold>
  </>
}

function LogForm({ std, P, onDone }) {
  const setP = usePolice()
  const [v, setV] = useState(std.id === 'grip' ? { left: null, right: null } : std.id === 'beep' ? '' : null)
  const [date, setDate] = useState(todayISO())
  const ev = evaluate(std.id, v, P.beepTarget)
  const save = () => {
    if (!ev) return
    setP(p => ({ results: [...(p.results || []), { id: std.id, v, at: date }] }))
    useUI.getState().toast(resultLine(std, ev))
    onDone()
  }
  return <div className="pf-log">
    <p className="pf-sub">{std.how}</p>
    {std.note && <p className="pf-sub"><b>{std.note}</b></p>}
    {std.id === 'grip'
      ? <div className="pf-2">
        <label>Left (kg)<NumberField value={v.left} nullable onChange={x => setV({ ...v, left: x })} /></label>
        <label>Right (kg)<NumberField value={v.right} nullable onChange={x => setV({ ...v, right: x })} /></label>
      </div>
      : std.id === 'beep'
        ? <label>Level.shuttle reached<TextField value={v} inputMode="decimal" placeholder="7.5" onChange={e => setV(e.target.value)} /></label>
        : <label>Result ({std.unit})<NumberField value={v} nullable onChange={setV} /></label>}
    <label>Date<TextField type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
    <Button variant="primary" disabled={!ev} onClick={save}>Save result</Button>
  </div>
}

// --- Plan --------------------------------------------------------------------------------
// The plan's weeks grouped into rows by the phase each one trains (a phase is 4 weeks; a longer
// plan repeats the cycle, so a phase can come round again).
function phaseRows(level, L) {
  const rows = []
  for (let n = 1; n <= L; n++) {
    const ph = phaseOf(level, templateWeek(n, L)).n
    const row = rows[rows.length - 1]
    if (row && row.phase === ph && row.weeks.length < 4) { row.weeks.push(n); row.to = n }
    else rows.push({ phase: ph, from: n, to: n, weeks: [n] })
  }
  return rows
}

function Plan({ S, P }) {
  const setP = usePolice()
  const nav = useNavigate()
  const guest = !useStore(s => s.user) && !DEMO
  const level = guest ? 'beginner' : P.level || 'beginner'
  const pw = planWeekOf(P, todayISO())
  const current = pw.week || 1
  const [week, setWeek] = useState(Math.min(current, pw.last))
  const plan = weekPlan(level, week, P.age, planOptsOf(P))
  const z2 = zone2(P.age)
  // The simple plan first (lib/police/first-steps.js): someone new sees this week only, in plain
  // words, until five sessions are done. Then the weeks ahead and the other plans open.
  const ease = comfort(S, { guest })
  const [openOnce, setOpenOnce] = useState(false)
  if (P.start && !ease.ready) {
    const now = weekPlan(level, Math.min(current, pw.last), P.age, planOptsOf(P))
    return <>
      <PlanDays />
      <div className="pf-ease-line">
        <div className="pf-bar"><span style={{ width: (ease.sessions / ease.need) * 100 + '%' }} /></div>
        <span>{ease.sessions} of {ease.need}</span>
        {/* A guest has the simple plan only: more plans come with an account. */}
        {ease.guest ? <button className="pf-link" onClick={() => toSignIn(nav)}>Sign up for more plans</button>
          : <button className="pf-link" onClick={() => setP(p => seenPatch(p, 'full') || {})}>Show all</button>}
      </div>
    </>
  }
  // "See the plans" opens Change my plan this once; it is closed again the next time Plan opens.
  const openPlans = () => { setOpenOnce(true); setP(p => seenPatch(p, 'moreplans') || {}) }
  return <>
    {/* The habit is there: the other plans are offered once, then live under Change my plan. */}
    {P.start && level === 'beginner' && !P.seen?.moreplans && (S.workouts || []).length >= ease.need && <div className="card pf-ease">
      <b>Five sessions done. You have the habit.</b>
      <p className="pf-sub">More running, or a plan built around you.</p>
      <div className="row" style={{ gap: 8 }}>
        <Button size="sm" variant="primary" onClick={openPlans}>See the plans</Button>
        <Button size="sm" variant="ghost" onClick={() => setP(p => seenPatch(p, 'moreplans') || {})}>Not now</Button>
      </div>
    </div>}
    {/* A day at a time, read from the schedule as it is, so it matches Home (components/PlanDays.jsx). */}
    <PlanDays />
    {/* The settings sit under the week, folded: the plan comes first, changing it second. */}
    <Fold key={'ps' + (P.seen?.moreplans ? 1 : 0)} id="plansettings" title="Change my plan" remember={false} open={openOnce} small>
      <PlanChoice S={S} P={P} />
      <Segmented options={LEVELS.map(l => ({ value: l.id, label: l.name }))} value={level} onChange={l => guest && l !== 'beginner' ? membersOnly() : setP({ level: l })} />
      <div className="card">
        <div className="pf-2">
          <label>Your age<NumberField value={P.age ?? null} nullable decimal={false} onChange={a => setP({ age: a })} /></label>
          <div className="pf-z2">{z2 ? <><b>{z2.target} bpm</b><span>zone 2 ({z2.lo}-{z2.hi})</span><span>max about {z2.max}</span></> : <span>Add your age for your heart-rate zones</span>}</div>
        </div>
      </div>
      <label className="pf-toggle"><input type="checkbox" checked={!!P.beepFocus} onChange={e => setP({ beepFocus: e.target.checked })} />
        <span><b>Beep focus</b><br />The beep test is my weak point: make Saturday a second interval session.</span></label>
    </Fold>
    {/* How the lifting works (the rep range rule, the next-set helper, the phases, the warm-up)
        lives under More → Strength, so the plan is only the plan. */}
  </>
}

// --- Strength (More → Strength) ------------------------------------------------------------
// How the lifting works, in one place: where you are now, the rep range rule, the next-set
// helper, the phases and the warm-up.
function Strength({ S, P }) {
  const guest = !useStore(s => s.user) && !DEMO
  const level = guest ? 'beginner' : P.level || 'beginner'
  const pw = planWeekOf(P, todayISO())
  const now = P.start && pw.week ? phaseOf(level, pw.tw || pw.week) : null
  return <>
    {now && <div className="card">
      <div className="row between"><h3>Where you are</h3><span className="pf-chip">Phase {now.n}</span></div>
      <p className="pf-sub"><b>{now.range} reps this week</b></p>
    </div>}
    <Reps S={S} start={now && rangeById(now.range)?.id === now.range ? now.range : null} />
    <Fold id="phases" title="The three phases">
      {PHASES[level].map(p => <p key={p.n} className="pf-sub"><b>Weeks {p.weeks[0]}-{p.weeks[1]}, {p.range} reps.</b> {p.focus}</p>)}
    </Fold>
    <Fold id="warmup" title="Warm-up and cool-down">
      <p className="pf-sub">4 rounds, 30 s each, 30 s rest after each round. Same again at the end.</p>
      <ol>{WARMUP.map((x, i) => <li key={i}>{x}</li>)}</ol>
      <p className="pf-sub">Can't do an exercise yet? Make it easier, never skip it: push-ups on knees, a smaller box, a lighter dumbbell.</p>
    </Fold>
  </>
}

// --- Reps --------------------------------------------------------------------------------
function Reps({ S, start = null }) {
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  // Opens on the range the plan is in this week, when it is one of the ranges here.
  const [rangeId, setRangeId] = useState(start || '4-6')
  const [weight, setWeight] = useState(unit === 'lb' ? 135 : 60)
  const [reps, setReps] = useState(null)
  const range = rangeById(rangeId)
  const advice = nextSetAdvice({ reps, weight, range, unit })
  return <>
    <div className="card">
      <h3>The rep range rule</h3>
      <div className="pf-rule">
        <div><b>{range.min - 1}</b><span>or fewer</span><em className="down">Move down next set</em></div>
        <div><b>{range.min}-{range.max - 1}</b><span>in range</span><em className="stay">Stay</em></div>
        <div><b>{range.max}+</b><span>top or more</span><em className="up">Move up +{unit === 'lb' ? '5 lb' : '2.5 kg'}</em></div>
      </div>
    </div>
    <div className="card">
      <h3>What next set?</h3>
      <Segmented options={REP_RANGES.map(r => ({ value: r.id, label: r.id }))} value={rangeId} onChange={setRangeId} />
      <p className="pf-sub">{range.goal} · rest {range.rest}</p>
      <div className="pf-2">
        <label>Weight ({unit})<NumberField value={weight} onChange={setWeight} /></label>
        <label>Reps done<NumberField value={reps} nullable decimal={false} onChange={setReps} /></label>
      </div>
      {/* Only once the reps are typed in: an empty box is not a set that went badly. */}
      {advice && reps != null && <div className={'pf-advice ' + advice.action}>
        <b>{advice.action === 'up' ? 'Move up' : advice.action === 'down' ? 'Move down' : 'Stay'}: {advice.weight} {unit}</b>
        <p>{setLine(advice, unit, reps)}</p>
      </div>}
    </div>
    <Fold id="repexample" title="Example: bench press, 4-6 reps">
      <table className="pf-table"><thead><tr><th></th><th>Week 1</th><th>Week 2</th></tr></thead>
        <tbody>
          {(unit === 'lb' ? [[135, 140, 140], [140, 145, 145]] : [[60, 62.5, 62.5], [62.5, 65, 65]]).reduce((rows, wk, w) => {
            const said = [[8, 'up', 5, 'stay', 4, 'stay'], [6, 'up', 4, 'stay', 3, 'down']][w]
            wk.forEach((kg, i) => { (rows[i] ||= []).push(`${kg} ${unit} × ${said[i * 2]} → ${said[i * 2 + 1]}`) })
            return rows
          }, []).map((r, i) => <tr key={i}><td>Set {i + 1}</td><td>{r[0]}</td><td>{r[1]}</td></tr>)}
        </tbody></table>
    </Fold>
  </>
}

/**
 * 🔔 Meal reminders: breakfast, lunch, pre-workout and dinner, each at its own time. Turning
 * them on asks for notification permission: the phone app schedules them itself, the web and
 * home-screen app gets them as push from the server (api/meal-reminders.js).
 */
function MealReminders({ S, P }) {
  const setP = usePolice()
  const user = useStore(s => s.user)
  const cfg = mealSettings(P.mealReminders)
  const [busy, setBusy] = useState(false)
  const save = patch => setP(p => ({ mealReminders: { ...mealSettings(p.mealReminders), ...patch, tz: localTZ() } }))
  const setMeal = (key, patch) => save({ meals: { ...cfg.meals, [key]: { ...cfg.meals[key], ...patch } } })
  const webState = !MOBILE && typeof Notification !== 'undefined' ? Notification.permission : null
  const turnOn = async () => {
    setBusy(true)
    try {
      if (MOBILE) {
        const next = { ...S, police: { ...P, mealReminders: { ...cfg, on: true, tz: localTZ() } } }
        const ok = await syncReminder(next, true)
        if (!ok) { useUI.getState().toast('Allow notifications for BadgeFit in your phone settings, then try again'); return }
      } else {
        if (!user) { useUI.getState().toast('Sign in first: reminders come from your BadgeFit server'); return }
        if (!pushSupported()) { useUI.getState().toast('On iPhone: Share → Add to Home Screen, open BadgeFit from there, then turn this on'); return }
        await enablePush()
      }
      save({ on: true })
      useUI.getState().toast('Meal reminders on. Fuel the badge 🔔')
    } catch (e) {
      useUI.getState().toast(e?.message || 'Notifications were not allowed')
    } finally { setBusy(false) }
  }
  return <div className="card pf-remind">
    <div className="row between">
      <h3>Meal reminders</h3>
      <Switch checked={cfg.on} disabled={busy} onChange={() => (cfg.on ? save({ on: false }) : turnOn())} aria-label="Meal reminders" />
    </div>
    {!cfg.on && <p className="pf-sub">A nudge at each meal so you never miss your protein. Turn on to allow notifications.</p>}
    {webState === 'denied' && <p className="pf-warn">Notifications are blocked for this site. Allow them in your browser's site settings.</p>}
    {cfg.on && <div className="pf-rlist">{MEALS.map(m => <div key={m.key} className={'pf-rrow' + (cfg.meals[m.key].on ? '' : ' off')}>
      <span className="pf-rsym" aria-hidden="true">{m.emoji}</span>
      <span className="pf-rname">{m.name}</span>
      <input type="time" value={cfg.meals[m.key].time} aria-label={m.name + ' time'} disabled={!cfg.meals[m.key].on}
        onChange={e => e.target.value && setMeal(m.key, { time: e.target.value })} />
      <Switch checked={cfg.meals[m.key].on} onChange={() => setMeal(m.key, { on: !cfg.meals[m.key].on })} aria-label={m.name + ' reminder'} />
    </div>)}</div>}
  </div>
}

/** Today's food against the targets: one tap for your usual meals, a quick add for the rest. */
function MealLog({ P, targets }) {
  const setP = usePolice()
  const day = todayISO()
  const [form, setForm] = useState({ name: '', kcal: null, protein: null, keep: false })
  const tot = dayTotals(P.meals, day, targets)
  const list = (P.meals || {})[day] || []
  const add = meal => setP(p => ({ meals: addMeal(p.meals, day, meal) }))
  const week = lastDays(P.meals, day)
  const maxK = Math.max(1, ...week.map(d => d.kcal), targets?.kcal || 0)
  return <div className="card pf-meals">
    <h3>Today's food</h3>
    <div className="pf-mt">
      <div><span>🔥 Calories</span><b>{tot.kcal}{targets ? ` / ${targets.kcal}` : ''}</b><div className="pf-bar"><span style={{ width: (tot.kcalPct ?? 0) + '%', background: tot.kcalLeft < 0 ? 'var(--orange)' : undefined }} /></div>
        <small>{tot.kcalLeft == null ? '' : tot.kcalLeft >= 0 ? `${tot.kcalLeft} left` : `${-tot.kcalLeft} over`}</small></div>
      <div><span>🥩 Protein</span><b>{tot.protein} g{targets ? ` / ${targets.protein} g` : ''}</b><div className="pf-bar"><span style={{ width: (tot.proteinPct ?? 0) + '%' }} /></div>
        <small>{tot.proteinLeft == null ? '' : tot.proteinLeft > 0 ? `${tot.proteinLeft} g to go` : 'Target hit 💪'}</small></div>
    </div>
    {list.length > 0 && <ul className="pf-mlist">{list.map(x => <li key={x.id}><span>{x.name}</span><small>{x.kcal} kcal · {x.protein} g</small>
      <button className="cm-x" aria-label={'Remove ' + x.name} onClick={() => setP(p => ({ meals: removeMeal(p.meals, day, x.id) }))}>✕</button></li>)}</ul>}
    <p className="pf-sub">Tap to add:</p>
    <div className="pf-quick">{quickMeals(P.myMeals).map(q => <button key={q.id} onClick={() => add(q)}><b>{q.name}</b><small>{q.kcal} kcal · {q.protein} g</small></button>)}</div>
    <details className="pf-more"><summary>Add something else</summary>
      <div className="pf-2 pf-3">
        <label>Food<TextField value={form.name} placeholder="e.g. Chicken wrap" onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>kcal<NumberField value={form.kcal} nullable decimal={false} onChange={v => setForm({ ...form, kcal: v })} /></label>
        <label>Protein g<NumberField value={form.protein} nullable decimal={false} onChange={v => setForm({ ...form, protein: v })} /></label>
      </div>
      <label className="pf-toggle"><input type="checkbox" checked={form.keep} onChange={e => setForm({ ...form, keep: e.target.checked })} /><span>Save to my meals for one-tap next time</span></label>
      <Button size="sm" variant="primary" disabled={!form.name.trim() || form.kcal == null} onClick={() => {
        const meal = { name: form.name, kcal: form.kcal, protein: form.protein ?? 0 }
        setP(p => ({ meals: addMeal(p.meals, day, meal), ...(form.keep && { myMeals: [{ id: 'm' + Date.now().toString(36), ...meal }, ...(p.myMeals || [])].slice(0, 30) }) }))
        setForm({ name: '', kcal: null, protein: null, keep: false })
      }}>Add</Button>
    </details>
    <div className="pf-week7" aria-label="Calories, last 7 days">{week.map(d => <div key={d.day} title={`${d.day}: ${d.kcal} kcal, ${d.protein} g protein`}>
      <i style={{ height: Math.round((d.kcal / maxK) * 100) + '%' }} className={targets && d.kcal > targets.kcal ? 'over' : ''} />
      <span>{new Date(d.day + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'narrow' })}</span></div>)}</div>
    <p className="pf-sub">Portions are estimates: read the label, or edit by adding your own.</p>
  </div>
}

function ProteinCard({ weight }) {
  const p = proteinFor(weight)
  return <div className="card">
    <h3>Protein for your body weight</h3>
    <p className="pf-sub">Body weight × grams per kg, every day.</p>
    {p && <div className="pf-prot">{p.map(l => <div key={l.id} className={l.id === 'build' ? 'on' : ''}>
      <span>{l.name}</span><b>{l.grams} g</b><small>{weight} kg × {l.perKg}</small><small>{l.who}</small>
    </div>)}</div>}
    {p && <p className="pf-sub">Building muscle while you cut: about <b>{p[2].perMeal} g at each of 4 meals</b>. Your body uses about 30-45 g at a time well.</p>}
    <details className="pf-more"><summary>Every body weight</summary>
      <table className="pf-table"><thead><tr><th>Weight</th><th>Normal ×0.8</th><th>Active ×1.6</th><th>Build ×2.2</th></tr></thead>
        <tbody>{proteinTable().map(r => <tr key={r.weight}><td>{r.weight} kg</td><td>{r.normal} g</td><td>{r.active} g</td><td>{r.build} g</td></tr>)}</tbody></table>
    </details>
  </div>
}

function CreatineCard({ weight }) {
  const c = creatineFor(weight)
  if (!c) return null
  return <div className="card">
    <h3>Creatine for {weight} kg</h3>
    <div className="pf-macros pf-cre">
      <div><b>{c.loading} g</b><span>a day, loading</span></div>
      <div><b>{c.loadingDoses} × {c.loadingPerDose} g</b><span>split doses</span></div>
      <div><b>{c.loadingDays}</b><span>days of loading</span></div>
      <div><b>{c.maintenance} g</b><span>every day after</span></div>
    </div>
    <p className="pf-sub">Loading (about 0.3 g per kg) fills your muscles in a week. Then drop to the daily amount: staying on {c.loading} g a day adds no extra strength and often upsets the stomach. In a hurry? Skip loading, take {c.maintenance} g daily, and you are full in 3-4 weeks.</p>
    <p className="pf-sub">Creatine monohydrate, with water and a meal. Expect 1-2 kg more on the scale: that is water in the muscle, not fat. Check with your doctor first if you have kidney problems.</p>
  </div>
}

// --- Care --------------------------------------------------------------------------------
function CareItem({ it, open }) {
  return <details className="pf-care" open={open || undefined}>
    <summary><b>{it.name}</b><span className="pf-sub">{it.what}</span></summary>
    <p><b>Why:</b> {it.why}</p>
    <p><b>What to do:</b></p><ul>{it.do.map((x, i) => <li key={i}>{x}</li>)}</ul>
    <p className="pf-see"><b>See a physio or doctor:</b> {it.see}</p>
  </details>
}

function Care() {
  const [q, setQ] = useState('')
  const hits = findCare(q)
  return <>
    <div className="card pf-jarvis">
      <div className="pf-jarvis-h"><span className="pf-orb" aria-hidden="true" /><b>{BRAND.coach}</b><span className="pf-sub">on aches and pains</span></div>
      <p>{RUN_CARE_INTRO}</p>
      <label>What is bothering you?<TextField value={q} placeholder="e.g. my shins hurt after running" onChange={e => setQ(e.target.value)} /></label>
      {q && !hits.length && <p className="pf-sub">Nothing matched. Try one word: shin, heel, knee, ankle, chafe, stitch, tired.</p>}
    </div>
    {hits.length > 0 && <div className="card">{hits.map(it => <CareItem key={it.id} it={it} open />)}</div>}
    {!q && RUN_CARE.map(g => <div key={g.group} className="card"><h3>{g.group}</h3>{g.items.map(it => <CareItem key={it.id} it={it} />)}</div>)}
    <p className="pf-sub pf-pad">General information, not a diagnosis. Chest pain, fainting, confusion or stopping sweating in the heat: stop and call 000.</p>
  </>
}

/**
 * A collapsible section (Food tab), like the Care tab's. Open or closed is remembered on this
 * device. The card inside loses its own frame and first heading: the fold's title stands for it.
 */
function Fold({ id, title, open = false, remember = true, small = false, children }) {
  const key = 'badgefit_fold_' + id
  // `remember` false: closed every time the page opens (Change my plan), whatever it was left at.
  const [isOpen, setOpen] = useState(() => { if (!remember) return open; try { const v = localStorage.getItem(key); return v == null ? open : v === '1' } catch { return open } })
  return <details className={'card pf-fold' + (small ? ' pf-fold-sm' : '')} open={isOpen} onToggle={e => { const o = e.currentTarget.open; setOpen(o); if (remember) try { localStorage.setItem(key, o ? '1' : '0') } catch { /* private mode */ } }}>
    <summary><span>{title}</span><span className="pf-fold-c" aria-hidden="true">⌄</span></summary>
    <div className="pf-fold-b">{children}</div>
  </details>
}

// --- Food --------------------------------------------------------------------------------
function Food({ S, P }) {
  const setP = usePolice()
  const bw = lastBW(S)
  const kg = bw ? (S.unit === 'lb' ? bw.w / 2.2046 : bw.w) : null
  const [weight, setWeight] = useState(P.weightKg ?? (kg ? Math.round(kg) : 80))
  const [goal, setGoal] = useState(P.goal || 'lose')
  const m = macroTargets({ weightKg: weight, goal, activity: 'high', heightCm: P.heightCm, age: P.age, sex: P.sex })
  return <>
    <Fold id="body" title="⚖️ Body" open><BodyCard S={S} P={P} /></Fold>
    <Fold id="targets" title="🎯 Daily targets"><div className="card">
      <div className="pf-2">
        <label>Body weight (kg)<NumberField value={weight} onChange={x => { setWeight(x); setP({ weightKg: x }) }} /></label>
        <label>Height (cm)<NumberField value={P.heightCm ?? null} nullable decimal={false} onChange={x => setP({ heightCm: x })} /></label>
        <label>Age<NumberField value={P.age ?? null} nullable decimal={false} onChange={x => setP({ age: x })} /></label>
        <label>Sex<Segmented options={[{ value: 'male', label: 'M' }, { value: 'female', label: 'F' }]} value={P.sex || 'male'} onChange={x => setP({ sex: x })} /></label>
      </div>
      <Segmented options={[{ value: 'lose', label: 'Lose fat' }, { value: 'recomp', label: 'Recomp' }, { value: 'gain', label: 'Gain' }]} value={goal} onChange={g => { setGoal(g); setP({ goal: g }) }} />
      {m && <div className="pf-macros">
        <div><i aria-hidden="true">🔥</i><b>{m.kcal}</b><span>kcal</span></div>
        <div><i aria-hidden="true">🥩</i><b>{m.protein} g</b><span>protein</span></div>
        <div><i aria-hidden="true">🍚</i><b>{m.carbs} g</b><span>carbs</span></div>
        <div><i aria-hidden="true">🥑</i><b>{m.fat} g</b><span>fat</span></div>
        <div><i aria-hidden="true">💧</i><b>{m.water} L</b><span>water</span></div>
      </div>}
      <p className="pf-sub">{m?.method === 'mifflin' ? `Maintenance about ${m.maintenance} kcal for 6-7 sessions a week; fat loss is 500 under it.` : 'Add your height and age for a much better estimate.'} Check the weekly average of your weigh-ins and adjust by 100-200 kcal.</p>
    </div></Fold>
    <Fold id="remind" title="🔔 Meal reminders"><MealReminders S={S} P={P} /></Fold>
    <Fold id="protein" title="🥩 Protein for your weight"><ProteinCard weight={weight} /></Fold>
    <Fold id="creatine" title="⚡ Creatine"><CreatineCard weight={weight} /></Fold>
    <details className="card pf-diet">
      <summary><b>Supplements</b> <span className="pf-chip">What actually works</span></summary>
      <p className="pf-sub">Food first: supplements fill gaps. Police applicants are drug tested, so only buy batch-tested products (look for Informed Sport).</p>
      {SUPPLEMENTS.map(x => <div key={x.id} className="pf-supp">
        <div className="row between"><b>{x.name}</b><span className={'pf-chip ev-' + x.evidence}>{x.evidence === 'strong' ? 'Strong evidence' : x.evidence === 'good' ? 'Good evidence' : 'Some evidence'}</span></div>
        <p className="pf-sub"><b>Dose:</b> {x.dose}</p>
        <p className="pf-sub">{x.why}</p>
      </div>)}
    </details>
    {DIETS.map(d => <details key={d.id} className="card pf-diet" open={P.diet === d.id}>
      <summary><b>{d.name}</b> <span className="pf-chip">{d.tag}</span></summary>
      <p className="pf-sub">{d.who}</p>
      <h4>How it works</h4><ul>{d.how.map((x, i) => <li key={i}>{x}</li>)}</ul>
      <h4>A day of eating</h4><ul>{d.day.map((x, i) => <li key={i}>{x}</li>)}</ul>
      {d.variants && <><h4>Other options</h4><ul>{d.variants.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
      <Button size="sm" variant={P.diet === d.id ? 'primary' : 'plain'} onClick={() => setP({ diet: d.id })}>{P.diet === d.id ? 'My plan' : 'Follow this plan'}</Button>
    </details>)}
    <Fold id="rules" title="📏 The rules every plan follows"><div className="card"><ol>{PRINCIPLES.map((x, i) => <li key={i}>{x}</li>)}</ol></div></Fold>
    <Fold id="recovery" title="🧖 Recovery"><div className="card">{RECOVERY.map(r => <p key={r.id} className="pf-sub"><b>{r.name}.</b> {r.how}</p>)}</div></Fold>
    <p className="pf-sub pf-pad">{DISCLAIMER}</p>
  </>
}

const ranName = r => runById(r.run)?.name || 'Run'

export default function PoliceFit() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const P = policeOf(S)
  // The open tab lives in the URL (#/police?tab=plan), so it survives the screen remounting
  // when the store changes, and a link can open a tab directly.
  const [params, setParams] = useSearchParams()
  const tab = ALL_TABS.some(x => x.value === params.get('tab')) ? params.get('tab') : 'today'
  const setTab = v => setParams(v === 'today' ? {} : { tab: v }, { replace: true })
  const setP = usePolice()
  // With a plan set up the hub wears the calm look: one title, the one bar, no tabs of its own.
  const calm = !!P.start
  // A guest (no account) gets the simple plan at once: no questions, straight to Home.
  const isGuest = !user && !DEMO
  useEffect(() => {
    if (P.start || !isGuest) return
    installPlan(useStore.getState().update, P, { level: 'beginner', choice: 'badgefit' })
    nav('/home', { replace: true })
  }, [P.start, isGuest]) // eslint-disable-line react-hooks/exhaustive-deps
  // Opening Plan or the test for the first time ticks it off Home's first steps.
  useEffect(() => { const patch = seenPatch(P, tab); if (patch) setP(patch) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  const under = tab === 'today' || MORE.some(m => m.value === tab)
  // A run asked for in the link (Start, Home): the guided run opens (components/RunHost.jsx).
  const runParam = params.get('run')
  useEffect(() => { const r = runById(runParam); if (r) { useRun.getState().open(r); setParams(p => { p.delete('run'); return p }, { replace: true }) } }, [runParam]) // eslint-disable-line react-hooks/exhaustive-deps
  const setRunning = r => (r ? useRun.getState().open(r) : useRun.getState().close())
  const [overlay, setOverlay] = useState(null) // 'beep' | 'test'
  // Members set up under an older plan model: plans start at week 1 when you join and run as long
  // as the test is away. A start far in the future (the old "12 weeks before the test") moves to
  // this week; a recent start is kept.
  useEffect(() => {
    if (P.planV === 3 || !P.level || !P.start) return
    const fresh = planStart(null, todayISO())
    const start = P.start > fresh ? fresh : P.start
    useStore.getState().update(s => {
      const prev = s.police || {}
      const next = { ...prev, start, planV: 3 }
      delete next.firstWeek
      if (start !== prev.start) {
        const w = planWeekOf(next, todayISO()).tw || 1
        next.phase = phaseOf(prev.level, w).n
        if (prev.keys) s.routines = applyPhaseRange(s.routines, prev.level, w, prev.keys)
      }
      s.police = next
    })
  }, [P.planV, P.level, P.start])
  // No plan yet: the setup on its own, in the same calm look (no tabs, nothing else to read).
  if (!P.start && !DEMO && isBadgeFit(S, useStore.getState().config)) return <div className="narrow pf">
    <div className="calm-head"><span className="calm-back-gap" /><h1>Let's set you up</h1></div>
    <Setup S={S} P={P} />
  </div>
  return <div className="narrow pf">
    {overlay === 'beep' && <BeepTrainer target={P.beepTarget || DEFAULT_BEEP_TARGET} goal={P.beepGoal || DEFAULT_BEEP_GOAL} onClose={() => setOverlay(null)} onSave={v => {
      setP(p => ({ results: [...(p.results || []), { id: 'beep', v, at: todayISO() }] }))
      setOverlay(null); useUI.getState().toast(`📣 Beep test ${v} saved`)
    }} />}
    {overlay === 'test' && <TestDay target={P.beepTarget || DEFAULT_BEEP_TARGET} goal={P.beepGoal || DEFAULT_BEEP_GOAL} testName={(P.testName || '').trim() || 'PCT'} onClose={() => setOverlay(null)} onSave={vals => {
      const add = testDayResults(vals, todayISO(), P.beepTarget || DEFAULT_BEEP_TARGET)
      setP(p => ({ results: [...(p.results || []), ...add] }))
      setOverlay(null); setTab('tests'); useUI.getState().toast(`🧪 ${add.length} results saved`)
    }} />}
    {calm ? <div className="calm-head">
      {/* A page under More goes back to More; Plan, the test and More are the bar's own places. */}
      {under ? <button className="calm-back" onClick={() => setTab('more')} aria-label="Back to More"><Icon name="chevronLeft" /></button> : <span className="calm-back-gap" />}
      <h1>{CALM_TITLE[tab] || (tab === 'tests' ? ((P.testName || '').trim() || 'PCT') : BRAND.name)}</h1>
    </div> : <>
      <div className="hdr">
        <button className="iconbtn" data-back="/home" onClick={() => nav('/home')} aria-label="Home"><Icon name="chevronLeft" /></button>
        <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}><h1>{BRAND.name}</h1>
          <div className="sub">{BRAND.tagline}</div></div>
      </div>
      <PfTabs value={tab} onChange={setTab} />
    </>}
    {tab === 'today' && <Today S={S} user={user} P={P} setTab={setTab} startRun={setRunning} openTest={() => setOverlay('test')} />}
    {tab === 'run' && <RunTab S={S} P={P} startRun={setRunning} />}
    {tab === 'tests' && <Tests S={S} P={P} openBeep={() => setOverlay('beep')} openTest={() => setOverlay('test')} />}
    {tab === 'plan' && <Plan S={S} P={P} />}
    {tab === 'strength' && <Strength S={S} P={P} />}
    {tab === 'food' && <Food S={S} P={P} />}
    {tab === 'care' && <Care />}
    {tab === 'more' && <More setTab={setTab} calm={calm} />}
    {/* Said once, on More (and before a plan is set up), not under every page. */}
    {(!calm || tab === 'more') && <p className="pf-sub pf-pad"><a href={`${MOBILE ? 'https://' + BRAND.server + '/' : ''}privacy.html`} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy</a> · Not affiliated with any police service. Check your own service's current requirements and see a doctor before starting a new training programme.</p>}
  </div>
}
