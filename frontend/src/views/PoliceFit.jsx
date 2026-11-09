// Police Prep: the police applicant hub. Jarvis's daily briefing, the six physical standards
// with pass/fail tracking, the 12-week beginner/intermediate programme (installed as ordinary
// routines and a programme, so it runs in the normal workout screen), the rep-range rule, and
// the nutrition guides. All logic lives in lib/police/*, each with its test beside it.
//
// Copy here is English only: the programme is written for Australian police applicants. It is
// kept out of t() on purpose so the locale checks do not ask nineteen packs to translate it.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
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
import { STANDARDS, DEFAULT_BEEP_TARGET, DEFAULT_BEEP_GOAL, BEEP_LEVELS, evaluate, readiness, fmtResult, bestResult, parseBeep } from '../lib/police/standards.js'
import { REP_RANGES, rangeById, nextSetAdvice } from '../lib/police/set-advice.js'
import { LEVELS, PHASES, WEEKS, WARMUP, zone2, startForTest, daysUntil, planOptsOf, planWeekOf, planStart, PHASE_WORDS, weekPlan, phaseOf, templateWeek, buildPoliceProgramme, applyPhaseRange } from '../lib/police/programme.js'
import { DIETS, PRINCIPLES, RECOVERY, DISCLAIMER, SUPPLEMENTS, macroTargets, proteinFor, proteinTable, creatineFor } from '../lib/police/nutrition.js'
import { RUN_CARE, RUN_CARE_INTRO, findCare } from '../lib/police/run-care.js'
import { addMeal, removeMeal, dayTotals, lastDays, quickMeals, bodyProgress } from '../lib/police/meals.js'
import { bwSheet, startFlow } from '../sheets.jsx'
import { briefing, setLine, resultLine } from '../lib/police/jarvis.js'
import MusicBar from '../components/MusicBar.jsx'
import RunPlayer from '../components/RunPlayer.jsx'
import BeepTrainer from '../components/BeepTrainer.jsx'
import { buildPushPlan, nudgeSettings } from '../lib/police/push-plan.js'
import TestDay from '../components/TestDay.jsx'
import { testDayResults } from '../lib/police/test-day.js'
import { CHECKIN_QUESTIONS, checkinCall, adjustNote, checkinLine, addCheckin, CALL_WORD } from '../lib/police/checkin.js'
import { say, primeSpeech } from '../lib/police/voice.js'
import { RUNS, CATEGORIES, runById, runForDay, runMinutes, runsThisWeek } from '../lib/police/runs.js'
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
  { value: 'run', label: 'Runs', sym: '🏃', sub: 'Guided runs: base, intervals, VO2' },
  { value: 'food', label: 'Food', sym: '🍽️', sub: 'Meals, protein, meal reminders' },
  { value: 'care', label: 'Care', sym: '🩹', sub: 'Sore shins, knees, recovery' },
]
const ALL_TABS = [...TABS, ...MORE]

// Symbols for the kinds of day and the recovery chips, so a week reads at a glance.
const DAY_SYM = { gym: '🏋️', run: '🏃', walk: '🚶', rest: '😴', test: '🎯' }
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
  const checkin = P.checkins?.[todayISO()] || null
  const call = checkinCall(checkin)
  return <>
    {fresh && <Setup S={S} P={P} />}
    {!fresh && !checkin && <CheckIn P={P} day={day} />}
    {fresh ? null : <div className="card pf-todaycard">
      <div className="row between"><h3>{pw.after ? `📅 After your ${testName}` : pw.final ? `🏁 Final week · week ${week} of ${pw.last}` : `📅 Week ${week} of ${pw.last}`}</h3><span className="pf-chip">Phase {plan.phase.n} of 3</span></div>
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
      {call && <p className={'pf-adjust ' + call}><b>{CALL_WORD[call]}</b>{adjustNote(day, call) ? ' · ' + adjustNote(day, call) : ''}</p>}
      {(() => {
        const run = runForDay(day)
        if (run) return <button className="pf-go" onClick={() => startRun(run)}>🏃 Start run · {run.name}</button>
        if (day?.kind === 'gym') return <button className="pf-go" onClick={() => {
          // Straight into today's session: one tap, no second Start on Home.
          if (S.active) { nav('/workout'); return }
          const ids = effectiveRoutineIds(S, todayISO())
          if (ids.length) startFlow(ids); else nav('/home')
        }}>{S.active ? '🏋️ Back to your workout' : '🏋️ Start workout'}</button>
        if (day?.kind === 'test') return <button className="pf-go" onClick={openTest}>🧪 Start test day</button>
        return null
      })()}
      <PhaseSync S={S} P={P} week={pw.tw || 1} />
    </div>}

    <StatusStrip S={S} P={P} ready={ready} setTab={setTab} />
    <div className="card pf-jarvis">
      <div className="pf-jarvis-h"><span className="pf-orb" aria-hidden="true" /><b>{BRAND.coach}</b><span className="pf-sub">Your trainer</span></div>
      {lines.slice(1, 3).map((l, i) => <p key={i}>{l}</p>)}
      <p className="pf-sub">🎧 I talk you through every workout: your next weight after each set, when rest is up, and how you are tracking to your {testName}.{isOn(S, 'coach') ? ' Tap 🎤 in a workout and just say "12 at 60", "done" or "swap to dumbbells".' : ''}</p>
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

/** Jarvis's two switches: the morning nudge (with the test reminders) and music mode. */
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
    <label className="pf-jsw-row"><span><b>🎵 Music mode</b><small>Training to Spotify or YouTube: Jarvis keeps it short, the weight and the bell, no pep talks</small></span>
      <Switch checked={!!P.musicMode} onChange={() => setP({ musicMode: !P.musicMode })} aria-label="Music mode" /></label>
  </div>
}

/** Three taps each morning; Jarvis eases the day off when you are wrecked (lib/police/checkin.js). */
function CheckIn({ P, day }) {
  const setP = usePolice()
  const [c, setC] = useState({})
  const pickOne = (key, v) => {
    const next = { ...c, [key]: v }
    setC(next)
    if (CHECKIN_QUESTIONS.every(q => next[q.key])) {
      primeSpeech()
      setP(p => ({ checkins: addCheckin(p.checkins, todayISO(), next) }))
      say(checkinLine(next, day))
    }
  }
  return <div className="card pf-checkin">
    <h3>☀️ Morning check-in</h3>
    {CHECKIN_QUESTIONS.map(q => <div key={q.key} className="pf-ci-row">
      <span>{q.label}</span>
      <div>{q.opts.map(([sym, word], i) => <button key={word} className={c[q.key] === i + 1 ? 'on' : ''} onClick={() => pickOne(q.key, i + 1)} aria-label={`${q.label}: ${word}`} title={word}>{sym}</button>)}</div>
    </div>)}
  </div>
}

/** Everything beyond the workout, the plan and the test: kept, one tap away. */
function More({ setTab }) {
  const nav = useNavigate()
  const row = (sym, label, sub, go) => <button key={label} className="pf-more-row" onClick={go}><span aria-hidden="true">{sym}</span><span><b>{label}</b><small>{sub}</small></span><Icon name="chevronRight" /></button>
  return <div className="card pf-more-list">
    {MORE.map(m => row(m.sym, m.label, m.sub, () => setTab(m.value)))}
    {row('👥', 'Community', 'Train alongside other recruits', () => nav('/community'))}
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
      ? <div className="pf-count-n"><b>{left}</b><span>⏳ {left === 1 ? 'day' : 'days'} to your {name}</span></div>
      : <div className="pf-count-n"><b>{name}</b><span>⏳ set the date</span></div>}
    <div className="pf-count-m">
      <div className="pf-2">
        <label>Event<TextField value={P.testName ?? ''} placeholder="PCT" maxLength={24} onChange={e => update(s => { s.police = { ...(s.police || {}), testName: e.target.value } })} /></label>
        <label>Date<TextField type="date" value={P.testDate || ''} onChange={e => setDate(e.target.value)} /></label>
      </div>
      {P.testDate && <p className="pf-sub">Plan weeks run Monday to Sunday. Your plan runs from week 1 to week {pw.last}, your final week: light training, the {name} on its own day and an easy day before it{pw.week && !pw.after && !pw.before ? `. This is week ${pw.week}` : ''}. Change the date and the plan fits itself to it.</p>}
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
    <div className="row between"><h3>⚖️ Body</h3><Button size="sm" variant="primary" onClick={() => bwSheet()}>+ Weight</Button></div>
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
function Setup({ S, P }) {
  const update = useStore(s => s.update)
  const setP = usePolice()
  const [level, setLevel] = useState(P.level || 'beginner')
  const [date, setDate] = useState(P.testDate || '')
  const [kg, setKg] = useState(P.weightKg ?? null)
  const build = () => {
    const built = buildPoliceProgramme(level, Date.now(), { beepFocus: P.beepFocus })
    const start = planStart(date || null, todayISO())
    const weekAt = planWeekOf({ start, testDate: date || undefined }, todayISO()).tw || 1
    update(s => {
      const routines = applyPhaseRange(built.routines, level, weekAt, built.keys).map(({ police, ...r }) => r)
      s.routines = [...(s.routines || []), ...routines]
      saveProgramme(s, built.programme)
      startProgramme(s, built.programme.id)
      s.police = { ...(s.police || {}), level, start, planV: 3, programmeId: built.programme.id, keys: built.keys, phase: phaseOf(level, weekAt).n,
        ...(date ? { testDate: date } : {}), ...(kg > 30 ? { weightKg: kg } : {}) }
    })
    useUI.getState().toast(date ? 'Week 1 starts now. Your plan ends on your test week.' : 'Your 12 weeks start today. Let us get to work.')
  }
  return <div className="card pf-welcome">
    <h3>👋 Let's set you up</h3>
    <p className="pf-q">1. How fit are you now?</p>
    <div className="pf-choice">
      <button className={level === 'beginner' ? 'on' : ''} onClick={() => setLevel('beginner')}><b>🌱 New to training</b><small>Gym or running is new, or it has been a while</small></button>
      <button className={level === 'intermediate' ? 'on' : ''} onClick={() => setLevel('intermediate')}><b>💪 I train regularly</b><small>Training for 6 months or more</small></button>
    </div>
    <p className="pf-q">2. When is your PCT? <small>(skip if not booked)</small></p>
    <TextField type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="PCT date" />
    <p className="pf-q">3. Your weight in kg <small>(for food targets)</small></p>
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

function DayCard({ d, today }) {
  return <div className={'pf-day pf-' + d.kind + (today ? ' on' : '')}>
    <div className="pf-day-h"><span>{d.dayName}{d.minutes ? ` · ⏱ ${d.minutes} min` : ''}</span><b><span className="pf-ds" aria-hidden="true">{DAY_SYM[d.kind] || '•'}</span>{d.title}</b></div>
    <ul>{d.details.map((x, i) => <li key={i}>{x}</li>)}</ul>
    {d.recovery?.length > 0 && <div className="pf-rec">{d.recovery.map((x, i) => <span key={i} className="pf-chip">{recSym(x)}{x}</span>)}</div>}
  </div>
}

// --- Run ---------------------------------------------------------------------------------
function RunTab({ S, P, startRun }) {
  const [cat, setCat] = useState('all')
  const pw = planWeekOf(P, todayISO())
  const week = pw.week
  const plan = P.level && week ? weekPlan(P.level, week, P.age, planOptsOf(P)) : null
  const todayRun = runForDay(plan?.days.find(d => d.day === new Date().getDay()))
  const done = runsThisWeek(P.runLog, todayISO())
  const list = cat === 'all' ? RUNS : RUNS.filter(r => r.cat === cat)
  const catOf = id => CATEGORIES.find(c => c.id === id)
  return <>
    {todayRun && <div className="card pf-todayrun">
      <span className="pf-sub">Today's run</span>
      <h3>{catOf(todayRun.cat).emoji} {todayRun.name}</h3>
      <p className="pf-sub">{todayRun.why} · ~{runMinutes(todayRun)} min</p>
      <button className="pf-go" onClick={() => startRun(todayRun)}>▶ Start guided run</button>
    </div>}
    <div className="pf-strip pf-strip3">
      <div><b>{done.length}</b><span>runs this week</span></div>
      <div><b>{done.reduce((a, r) => a + (r.min || 0), 0)}</b><span>minutes</span></div>
      <div><b>{Math.round(done.reduce((a, r) => a + (Number(r.km) || 0), 0) * 10) / 10}</b><span>km</span></div>
    </div>
    <div className="pf-cats" role="tablist" aria-label="Run type">
      <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>All</button>
      {CATEGORIES.map(c => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.emoji} {c.name}</button>)}
    </div>
    {cat !== 'all' && <p className="pf-sub pf-pad">{catOf(cat).about}</p>}
    <div className="card pf-runs">{list.map(r => <button key={r.id} className="pf-run" onClick={() => startRun(r)}>
      <span className="pf-run-e" aria-hidden="true">{catOf(r.cat).emoji}</span>
      <span className="pf-run-m"><b>{r.name}</b><small>{catOf(r.cat).name} · ~{runMinutes(r)} min · {r.km}</small></span>
      <span className="pf-run-go" aria-hidden="true">▶</span>
    </button>)}</div>
    <p className="pf-sub pf-pad">A week that works: 1 VO2 or interval session, 1 tempo or beep session, and everything else easy. About 80% of your running should feel easy.</p>
    <MusicBar />
    {(P.runLog || []).length > 0 && <div className="card">
      <h3>🗒️ Recent runs</h3>
      {(P.runLog || []).slice(-6).reverse().map(r => <div key={r.id} className="pf-logrow">
        <span>{runById(r.run)?.name || 'Run'}</span><small>{r.at} · {r.min} min{r.km ? ` · ${r.km} km` : ''}{r.rpe ? ` · effort ${r.rpe}/10` : ''}</small>
      </div>)}
    </div>}
  </>
}

// --- Tests -------------------------------------------------------------------------------
function Tests({ S, P, openBeep, openTest }) {
  const setP = usePolice()
  const ready = readiness(P.results, P.beepTarget)
  const [open, setOpen] = useState(null)
  return <>
    <TestCountdown S={S} P={P} />
    <div className="pf-tools">
      <button className="card pf-tool" onClick={openTest}><span aria-hidden="true">🧪</span><b>Test day</b><small>All 6 standards in order, with rests. Baseline now, mock PCT a week out.</small></button>
      <button className="card pf-tool" onClick={openBeep}><span aria-hidden="true">📣</span><b>Beep test trainer</b><small>Real beeps, Jarvis calls the levels. Saves your score.</small></button>
    </div>
    <p className="pf-sub pf-pad">Test yourself at the start, then at the end of every 4-week phase. Log every attempt: the latest one counts.</p>
    {ready.rows.map(({ std, latest, ev }) => <div key={std.id} className="card pf-std">
      <button className="pf-std-h" onClick={() => setOpen(open === std.id ? null : std.id)}>
        <span className="pf-std-i" aria-hidden="true">{std.icon}</span>
        <span className="pf-std-m">
          <b>{std.name}</b>
          <span className="pf-sub">{std.id === 'beep' ? `Pass ${P.beepTarget || DEFAULT_BEEP_TARGET}, goal ${P.beepGoal || DEFAULT_BEEP_GOAL}` : `${std.better === 'lower' ? 'At most' : 'At least'} ${std.min} ${std.unit}${std.perHand ? ' each hand' : ''}`} · {std.attempts} attempt{std.attempts > 1 ? 's' : ''}</span>
        </span>
        {ev ? <span className={'pf-chip ' + (ev.pass ? 'pass' : 'fail')}>{ev.pass ? 'PASS' : `${ev.pct}%`}</span> : <span className="pf-chip">Not tested</span>}
      </button>
      {ev && <div className="pf-bar"><span style={{ width: ev.pct + '%' }} /></div>}
      {std.id === 'beep' && latest && (() => { const g = evaluate('beep', latest.v, P.beepGoal || DEFAULT_BEEP_GOAL); return g && <p className="pf-sub">{g.pass ? 'Training goal reached. Comfortable pass territory.' : `Training goal: ${g.pct}% of the way.`}</p> })()}
      {latest && <p className="pf-sub">Latest: {fmtResult(std.id, latest.v)} on {latest.at}{(() => { const b = bestResult(P.results, std.id); return b && b !== latest ? ` · Best: ${fmtResult(std.id, b.v)}` : '' })()}</p>}
      {open === std.id && <LogForm std={std} P={P} onDone={() => setOpen(null)} />}
    </div>)}
    <div className="card">
      <h3>Beep test: pass mark and your goal</h3>
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
    </div>
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
  const level = P.level || 'beginner'
  const pw = planWeekOf(P, todayISO())
  const current = pw.week || 1
  const [week, setWeek] = useState(Math.min(current, pw.last))
  const plan = weekPlan(level, week, P.age, planOptsOf(P))
  const z2 = zone2(P.age)
  return <>
    <Segmented options={LEVELS.map(l => ({ value: l.id, label: l.name }))} value={level} onChange={l => setP({ level: l })} />
    <div className="card">
      <div className="pf-2">
        <label>Your age<NumberField value={P.age ?? null} nullable decimal={false} onChange={a => setP({ age: a })} /></label>
        <div className="pf-z2">{z2 ? <><b>{z2.target} bpm</b><span>zone 2 ({z2.lo}-{z2.hi})</span><span>max about {z2.max}</span></> : <span>Add your age for your heart-rate zones</span>}</div>
      </div>
    </div>
    <label className="pf-toggle"><input type="checkbox" checked={!!P.beepFocus} onChange={e => setP({ beepFocus: e.target.checked })} />
      <span><b>Beep focus</b><br />The beep test is my weak point: make Saturday a second interval session.</span></label>
    {pw.after
      ? <p className="pf-sub pf-explain">Your {(P.testName || '').trim() || 'PCT'} is done. Training carries on so you stay fit. Set a new date in Tests and the plan stretches to it.</p>
      : <p className="pf-sub pf-explain">{P.testDate
        ? pw.last > WEEKS
          ? `Your plan is ${pw.last} weeks, up to your test. The 12-week cycle repeats, and the last 12 weeks end on test day.`
          : `Your plan is ${pw.last} ${pw.last === 1 ? 'week' : 'weeks'}, up to your test. The gold week is your final week: light training and recovery.`
        : 'No test date yet: a 12-week plan. Set your date in Tests and the plan fits itself to it.'}</p>}
    <div className="pf-weekgrid" role="tablist" aria-label="Weeks of the plan">
      {phaseRows(level, pw.last).map(row => <div key={row.from} className="pf-phase-row">
        <div className="pf-phase-l"><b>Phase {row.phase}</b><span>{PHASE_WORDS[row.phase].split(':')[0]} · {row.from === row.to ? `week ${row.from}` : `weeks ${row.from}-${row.to}`}</span></div>
        <div className="pf-weeks">{row.weeks.map(n =>
          <button key={n} className={(n === week ? 'on ' : '') + (n === current && P.start && !pw.after && !pw.before ? 'now ' : '') + (n === pw.last && P.testDate ? 'final' : '')} onClick={() => setWeek(n)} aria-pressed={n === week}>
            <small>{n === pw.last && P.testDate ? 'Final' : 'Week'}</small>{n}{n === pw.last && P.testDate ? <i>🎯</i> : null}</button>)}</div>
      </div>)}
    </div>
    <div className="card">
      <div className="row between"><h3>{plan.final ? `🏁 Final week (week ${week})` : `Week ${week}`}</h3><span className="pf-chip">Phase {plan.phase.n}: {plan.phase.range} reps</span></div>
      <p className="pf-sub">{plan.final && P.testDate ? 'Light training and good recovery. Half the sets, same intensity, sleep and eat well, and arrive fresh for test day.' : plan.phase.focus + (plan.test ? ' This week ends with a re-test.' : '')}</p>
    </div>
    {plan.days.map(d => <DayCard key={d.day} d={d} today={P.start && week === current && d.day === new Date().getDay()} />)}
    <div className="card">
      <h3>🤸 Warm-up and cool-down</h3>
      <p className="pf-sub">4 rounds, 30 s each, 30 s rest after each round. Same again at the end.</p>
      <ol>{WARMUP.map((x, i) => <li key={i}>{x}</li>)}</ol>
      <p className="pf-sub">Can't do an exercise yet? Make it easier, never skip it: push-ups on knees, a smaller box, a lighter dumbbell.</p>
    </div>
    <div className="card">
      <h3>The three phases</h3>
      {PHASES[level].map(p => <p key={p.n} className="pf-sub"><b>Weeks {p.weeks[0]}-{p.weeks[1]}, {p.range} reps.</b> {p.focus}</p>)}
    </div>
    <Reps S={S} />
  </>
}

// --- Reps --------------------------------------------------------------------------------
function Reps({ S }) {
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const [rangeId, setRangeId] = useState('4-6')
  const [weight, setWeight] = useState(unit === 'lb' ? 135 : 60)
  const [reps, setReps] = useState(null)
  const range = rangeById(rangeId)
  const advice = nextSetAdvice({ reps, weight, range, unit })
  return <>
    <div className="card">
      <h3>🏋️ The rep range rule</h3>
      <div className="pf-rule">
        <div><b>{range.min - 1}</b><span>or fewer</span><em className="down">Move down next set</em></div>
        <div><b>{range.min}-{range.max - 1}</b><span>in range</span><em className="stay">Stay</em></div>
        <div><b>{range.max}+</b><span>top or more</span><em className="up">Move up +{unit === 'lb' ? '5 lb' : '2.5 kg'}</em></div>
      </div>
      <p className="pf-sub">Same rule week to week: where you finish is where you start next week. Log every set, so you always know your number.</p>
    </div>
    <div className="card">
      <h3>➡️ What next set?</h3>
      <Segmented options={REP_RANGES.map(r => ({ value: r.id, label: r.id }))} value={rangeId} onChange={setRangeId} />
      <p className="pf-sub">{range.goal} · rest {range.rest}</p>
      <div className="pf-2">
        <label>Weight ({unit})<NumberField value={weight} onChange={setWeight} /></label>
        <label>Reps done<NumberField value={reps} nullable decimal={false} onChange={setReps} /></label>
      </div>
      {advice && <div className={'pf-advice ' + advice.action}>
        <b>{advice.action === 'up' ? 'Move up' : advice.action === 'down' ? 'Move down' : 'Stay'}: {advice.weight} {unit}</b>
        <p>{setLine(advice, unit, reps)}</p>
      </div>}
    </div>
    <div className="card">
      <h3>Example: bench press</h3>
      <table className="pf-table"><thead><tr><th></th><th>Week 1</th><th>Week 2</th></tr></thead>
        <tbody>
          <tr><td>Set 1</td><td>135 lb × 8 → up</td><td>140 lb × 6 → up</td></tr>
          <tr><td>Set 2</td><td>140 lb × 5 → stay</td><td>145 lb × 4 → stay</td></tr>
          <tr><td>Set 3</td><td>140 lb × 4 → stay</td><td>145 lb × 3 → down</td></tr>
        </tbody></table>
    </div>
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
      <h3>🔔 Meal reminders</h3>
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
    <h3>🍽️ Today's food</h3>
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
    <h3>🥩 Protein for your body weight</h3>
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
    <h3>⚡ Creatine for {weight} kg</h3>
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
function Fold({ id, title, open = false, children }) {
  const key = 'badgefit_fold_' + id
  const [isOpen, setOpen] = useState(() => { try { const v = localStorage.getItem(key); return v == null ? open : v === '1' } catch { return open } })
  return <details className="card pf-fold" open={isOpen} onToggle={e => { const o = e.currentTarget.open; setOpen(o); try { localStorage.setItem(key, o ? '1' : '0') } catch { /* private mode */ } }}>
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
    <Fold id="log" title="🍽️ Today's food" open><MealLog P={P} targets={m} /></Fold>
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
  const [running, setRunning] = useState(() => runById(params.get('run')))
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
  const logRun = entry => {
    setP(p => ({ runLog: [...(p.runLog || []), { id: Date.now().toString(36), at: todayISO(), ...entry }].slice(-200) }))
    setRunning(null)
    useUI.getState().toast('Run saved. That is another level banked. 🏁')
  }
  return <div className="narrow pf">
    {running && <RunPlayer run={running} age={P.age} onClose={() => setRunning(null)} onLog={logRun} />}
    {overlay === 'beep' && <BeepTrainer target={P.beepTarget || DEFAULT_BEEP_TARGET} goal={P.beepGoal || DEFAULT_BEEP_GOAL} onClose={() => setOverlay(null)} onSave={v => {
      setP(p => ({ results: [...(p.results || []), { id: 'beep', v, at: todayISO() }] }))
      setOverlay(null); useUI.getState().toast(`📣 Beep test ${v} saved`)
    }} />}
    {overlay === 'test' && <TestDay target={P.beepTarget || DEFAULT_BEEP_TARGET} goal={P.beepGoal || DEFAULT_BEEP_GOAL} testName={(P.testName || '').trim() || 'PCT'} onClose={() => setOverlay(null)} onSave={vals => {
      const add = testDayResults(vals, todayISO(), P.beepTarget || DEFAULT_BEEP_TARGET)
      setP(p => ({ results: [...(p.results || []), ...add] }))
      setOverlay(null); setTab('tests'); useUI.getState().toast(`🧪 ${add.length} results saved`)
    }} />}
    <div className="hdr">
      <button className="iconbtn" data-back="/home" onClick={() => nav('/home')} aria-label="Home"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}><h1>{BRAND.name}</h1>
        <div className="sub">{BRAND.tagline}</div></div>
    </div>
    <PfTabs value={tab} onChange={setTab} />
    {tab === 'today' && <Today S={S} user={user} P={P} setTab={setTab} startRun={setRunning} openTest={() => setOverlay('test')} />}
    {tab === 'run' && <RunTab S={S} P={P} startRun={setRunning} />}
    {tab === 'tests' && <Tests S={S} P={P} openBeep={() => setOverlay('beep')} openTest={() => setOverlay('test')} />}
    {tab === 'plan' && <Plan S={S} P={P} />}
    {tab === 'food' && <Food S={S} P={P} />}
    {tab === 'care' && <Care />}
    {tab === 'more' && <More setTab={setTab} />}
    <p className="pf-sub pf-pad">Not affiliated with any police service. Check your own service's current requirements and see a doctor before starting a new training programme.</p>
  </div>
}
