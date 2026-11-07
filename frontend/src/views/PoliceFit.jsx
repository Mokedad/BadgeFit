// Police Prep: the police applicant hub. Jarvis's daily briefing, the six physical standards
// with pass/fail tracking, the 12-week beginner/intermediate programme (installed as ordinary
// routines and a programme, so it runs in the normal workout screen), the rep-range rule, and
// the nutrition guides. All logic lives in lib/police/*, each with its test beside it.
//
// Copy here is English only: the programme is written for Australian police applicants. It is
// kept out of t() on purpose so the locale checks do not ask nineteen packs to translate it.
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO, localTZ } from '../lib/format.js'
import { lastBW } from '../lib/history.js'
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
import { LEVELS, PHASES, WEEKS, WARMUP, TAPER, zone2, startForTest, daysUntil, weekPlan, weekNumber, phaseOf, buildPoliceProgramme, applyPhaseRange } from '../lib/police/programme.js'
import { DIETS, PRINCIPLES, RECOVERY, DISCLAIMER, SUPPLEMENTS, macroTargets, proteinFor, proteinTable, creatineFor } from '../lib/police/nutrition.js'
import { RUN_CARE, RUN_CARE_INTRO, findCare } from '../lib/police/run-care.js'
import { addMeal, removeMeal, dayTotals, lastDays, quickMeals, bodyProgress } from '../lib/police/meals.js'
import { bwSheet } from '../sheets.jsx'
import { briefing, setLine, resultLine } from '../lib/police/jarvis.js'
import MusicBar from '../components/MusicBar.jsx'
import '../police.css'

const TABS = [
  { value: 'today', label: 'Today', sym: '⭐' },
  { value: 'tests', label: 'Tests', sym: '🎯' },
  { value: 'plan', label: 'Plan', sym: '📅' },
  { value: 'reps', label: 'Reps', sym: '🏋️' },
  { value: 'food', label: 'Food', sym: '🍽️' },
  { value: 'care', label: 'Care', sym: '🩹' },
]

// Symbols for the kinds of day and the recovery chips, so a week reads at a glance.
const DAY_SYM = { gym: '🏋️', run: '🏃', walk: '🚶', rest: '😴', test: '🎯' }
const recSym = x => (/sauna/i.test(x) ? '🧖 ' : /boots/i.test(x) ? '🦵 ' : /sleep/i.test(x) ? '🛌 ' : '')

/** A round symbol button with a small word under it: compact, and still says what it does. */
function SymButton({ sym, label, onClick, primary }) {
  return <button className={'pf-sym' + (primary ? ' primary' : '')} onClick={onClick} aria-label={label} title={label}>
    <span aria-hidden="true">{sym}</span><small>{label}</small>
  </button>
}

/** The hub's tabs: a symbol with a short word, six across. */
function PfTabs({ value, onChange }) {
  return <nav className="pf-tabbar" role="tablist" aria-label="BadgeFit">
    {TABS.map(x => <button key={x.value} role="tab" aria-selected={x.value === value} className={x.value === value ? 'on' : ''} onClick={() => onChange(x.value)}>
      <span aria-hidden="true">{x.sym}</span><small>{x.label}</small>
    </button>)}
  </nav>
}

const policeOf = S => S.police || {}
const usePolice = () => {
  const update = useStore(s => s.update)
  return patch => update(s => { s.police = { ...(s.police || {}), ...(typeof patch === 'function' ? patch(s.police || {}) : patch) } })
}

/** Reads text aloud with the browser's own voice, where there is one. */
function speak(lines) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return false
    synth.cancel()
    const u = new SpeechSynthesisUtterance(lines.join(' '))
    const en = synth.getVoices().filter(v => /^en(-|_)(GB|AU)/i.test(v.lang))
    if (en.length) u.voice = en.find(v => /daniel|male|george|james/i.test(v.name)) || en[0]
    u.rate = 1.02; u.pitch = 0.9
    synth.speak(u)
    return true
  } catch { return false }
}

// --- Today -------------------------------------------------------------------------------
function Today({ S, user, P, setTab }) {
  const nav = useNavigate()
  const [more, setMore] = useState(false)
  const ready = readiness(P.results, P.beepTarget)
  const week = weekNumber(P.start, todayISO())
  const dow = new Date().getDay()
  const plan = P.level && week ? weekPlan(P.level, week, P.age, { beepFocus: P.beepFocus }) : null
  const day = plan?.days.find(d => d.day === dow)
  const lines = useMemo(() => briefing({ name: P.name || user?.name, hour: new Date().getHours(), week, day, ready, seed: Number(todayISO().replace(/-/g, '')) }),
    [P.name, user?.name, week, day, ready.passed, ready.weakest?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return <>
    <div className="card pf-jarvis">
      <div className="pf-jarvis-h"><span className="pf-orb" aria-hidden="true" /><b>{BRAND.coach}</b><span className="pf-sub">Your recruit coach</span></div>
      {(more ? lines : lines.slice(0, 3)).map((l, i) => <p key={i}>{l}</p>)}
      {lines.length > 3 && <button className="pf-more-btn" onClick={() => setMore(!more)}>{more ? 'Less' : 'More'}</button>}
      <div className="pf-syms">
        <SymButton sym="🔊" label="Hear it" onClick={() => { if (!speak(lines)) useUI.getState().toast('This device has no voice to read aloud') }} />
        {isOn(S, 'coach') && <SymButton sym="🎤" label={'Ask ' + BRAND.coach} primary onClick={() => nav('/coach')} />}
        <SymButton sym="👥" label="Community" onClick={() => nav('/community')} />
        <SymButton sym="🎯" label="Log test" onClick={() => setTab('tests')} />
      </div>
    </div>

    <TestCountdown P={P} />
    <BodyCard S={S} P={P} />

    <MusicBar />

    <div className="card pf-ready">
      <div className="pf-ring" style={{ '--p': ready.pct }}><span>{ready.pct}%</span></div>
      <div>
        <h3>🎯 Test readiness</h3>
        <p className="pf-sub">Passing {ready.passed} of {ready.total} standards</p>
        <div className="pf-dots" aria-hidden="true">{ready.rows.map(r => <span key={r.std.id} title={r.std.name} className={r.ev?.pass ? 'ok' : r.ev ? 'part' : ''}>{r.std.icon}</span>)}</div>
      </div>
    </div>

    {!P.level || !P.start ? <Setup S={S} P={P} /> : <div className="card">
      <div className="row between"><h3>📅 Week {week} of {WEEKS}</h3><span className="pf-chip">Phase {plan.phase.n}: {plan.phase.range} reps</span></div>
      <p className="pf-sub">{plan.phase.focus}</p>
      {day && <DayCard d={day} today />}
      <div className="pf-actions">
        {day?.key && <Button variant="primary" icon="play" onClick={() => nav('/home')}>Start</Button>}
        <Button onClick={() => setTab('plan')}>📅 Week</Button>
      </div>
      <PhaseSync S={S} P={P} week={week} />
    </div>}
  </>
}

/** Days to the test, and setting its date: the programme then counts down so week 12 is test week. */
function TestCountdown({ P }) {
  const update = useStore(s => s.update)
  const left = P.testDate ? daysUntil(P.testDate, todayISO()) : null
  const setDate = d => update(s => {
    const prev = s.police || {}
    const next = { ...prev, testDate: d || undefined }
    // Re-anchor the plan on the test, keeping the phase the lifts are already set to.
    if (d && startForTest(d) && prev.level) next.start = startForTest(d)
    s.police = next
  })
  return <div className="card pf-count">
    {left != null && left >= 0
      ? <div className="pf-count-n"><b>{left}</b><span>⏳ {left === 1 ? 'day' : 'days'} to go</span></div>
      : <div className="pf-count-n"><b>PCT</b><span>⏳ set the date</span></div>}
    <div className="pf-count-m">
      <label>Test date<TextField type="date" value={P.testDate || ''} onChange={e => setDate(e.target.value)} /></label>
      {left != null && left >= 0 && left <= 7 && <ul className="pf-taper">{TAPER.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {P.testDate && <p className="pf-sub">The plan counts down so test week is week 12{left != null && left < 84 ? `: you start at week ${Math.max(1, 12 - Math.floor(left / 7))}` : ''}.</p>}
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
      {S.targetW == null && <p className="pf-sub">Set a goal weight in Settings to see how far along you are.</p>}
    </> : <p className="pf-sub">Log your weight a few mornings a week, same time, before breakfast. The weekly average is what counts.</p>}
    <div className="pf-actions">
      <Button size="sm" onClick={() => nav('/measurements')}>📏 Measure</Button>
      <Button size="sm" onClick={() => nav('/progress-photos')}>📸 Photos</Button>
    </div>
  </div>
}

function Setup({ S, P }) {
  const update = useStore(s => s.update)
  const setP = usePolice()
  const [level, setLevel] = useState(P.level || 'beginner')
  const build = () => {
    const built = buildPoliceProgramme(level, Date.now(), { beepFocus: P.beepFocus })
    update(s => {
      s.routines = [...(s.routines || []), ...built.routines.map(({ police, ...r }) => r)]
      saveProgramme(s, built.programme)
      startProgramme(s, built.programme.id)
      const start = (P.testDate && startForTest(P.testDate)) || todayISO()
      s.police = { ...(s.police || {}), level, start, programmeId: built.programme.id, keys: built.keys, phase: 1 }
    })
    useUI.getState().toast(P.testDate ? 'Your plan now counts down to test day. Let us get to work.' : 'Your 12 weeks start today. Let us get to work.')
  }
  return <div className="card">
    <h3>Build your 12-week programme</h3>
    <Segmented options={LEVELS.map(l => ({ value: l.id, label: l.name }))} value={level} onChange={setLevel} />
    <p className="pf-sub">{LEVELS.find(l => l.id === level).blurb}</p>
    <p className="pf-sub">It adds 7 routines (gym, runs and a recovery walk) and starts a 12-week programme in your Plan. Your current plan comes back when you end it.</p>
    <Button variant="primary" onClick={build}>Build my programme</Button>
    {S.programme && <p className="pf-sub">This replaces the programme running now.</p>}
    <button className="pf-link" onClick={() => setP({ level, start: P.start || (P.testDate && startForTest(P.testDate)) || todayISO() })}>Just show me the plan, I will track it myself</button>
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

// --- Tests -------------------------------------------------------------------------------
function Tests({ P }) {
  const setP = usePolice()
  const ready = readiness(P.results, P.beepTarget)
  const [open, setOpen] = useState(null)
  return <>
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
function Plan({ P }) {
  const setP = usePolice()
  const level = P.level || 'beginner'
  const current = weekNumber(P.start, todayISO()) || 1
  const [week, setWeek] = useState(current)
  const plan = weekPlan(level, week, P.age, { beepFocus: P.beepFocus })
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
    <div className="pf-weeks" role="tablist" aria-label="Week">
      {Array.from({ length: WEEKS }, (_, i) => i + 1).map(n =>
        <button key={n} className={(n === week ? 'on ' : '') + (n === current && P.start ? 'now' : '')} onClick={() => setWeek(n)} aria-pressed={n === week}>{n}</button>)}
    </div>
    <div className="card">
      <div className="row between"><h3>Week {week}</h3><span className="pf-chip">Phase {plan.phase.n}: {plan.phase.range} reps</span></div>
      <p className="pf-sub">{plan.phase.focus}{plan.test ? ' This week ends with a re-test.' : ''}</p>
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

// --- Food --------------------------------------------------------------------------------
function Food({ S, P }) {
  const setP = usePolice()
  const bw = lastBW(S)
  const kg = bw ? (S.unit === 'lb' ? bw.w / 2.2046 : bw.w) : null
  const [weight, setWeight] = useState(P.weightKg ?? (kg ? Math.round(kg) : 80))
  const [goal, setGoal] = useState(P.goal || 'lose')
  const m = macroTargets({ weightKg: weight, goal, activity: 'high', heightCm: P.heightCm, age: P.age, sex: P.sex })
  return <>
    <div className="card">
      <h3>🎯 Your daily targets</h3>
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
    </div>
    <MealReminders S={S} P={P} />
    <MealLog P={P} targets={m} />
    <ProteinCard weight={weight} />
    <CreatineCard weight={weight} />
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
    <div className="card"><h3>The rules every plan follows</h3><ol>{PRINCIPLES.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
    <div className="card"><h3>🧖 Recovery</h3>{RECOVERY.map(r => <p key={r.id} className="pf-sub"><b>{r.name}.</b> {r.how}</p>)}</div>
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
  const tab = TABS.some(x => x.value === params.get('tab')) ? params.get('tab') : 'today'
  const setTab = v => setParams(v === 'today' ? {} : { tab: v }, { replace: true })
  return <div className="narrow pf">
    <div className="hdr">
      <button className="iconbtn" data-back="/home" onClick={() => nav('/home')} aria-label="Home"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}><h1>{BRAND.name}</h1>
        <div className="sub">{BRAND.tagline}</div></div>
    </div>
    <PfTabs value={tab} onChange={setTab} />
    {tab === 'today' && <Today S={S} user={user} P={P} setTab={setTab} />}
    {tab === 'tests' && <Tests P={P} />}
    {tab === 'plan' && <Plan P={P} />}
    {tab === 'reps' && <Reps S={S} />}
    {tab === 'food' && <Food S={S} P={P} />}
    {tab === 'care' && <Care />}
    <p className="pf-sub pf-pad">Not affiliated with any police service. Check your own service's current requirements and see a doctor before starting a new training programme.</p>
  </div>
}
