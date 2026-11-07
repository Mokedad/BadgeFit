// Police Prep: the police applicant hub. Jarvis's daily briefing, the six physical standards
// with pass/fail tracking, the 12-week beginner/intermediate programme (installed as ordinary
// routines and a programme, so it runs in the normal workout screen), the rep-range rule, and
// the nutrition guides. All logic lives in lib/police/*, each with its test beside it.
//
// Copy here is English only: the programme is written for Australian police applicants. It is
// kept out of t() on purpose so the locale checks do not ask nineteen packs to translate it.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { todayISO } from '../lib/format.js'
import { lastBW } from '../lib/history.js'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, Segmented, TextField } from '../components/ui.jsx'
import { saveProgramme, startProgramme } from '../lib/programmes.js'
import { STANDARDS, DEFAULT_BEEP_TARGET, BEEP_LEVELS, evaluate, readiness, fmtResult, bestResult, parseBeep } from '../lib/police/standards.js'
import { REP_RANGES, rangeById, nextSetAdvice } from '../lib/police/set-advice.js'
import { LEVELS, PHASES, WEEKS, weekPlan, weekNumber, phaseOf, buildPoliceProgramme, applyPhaseRange } from '../lib/police/programme.js'
import { DIETS, PRINCIPLES, RECOVERY, DISCLAIMER, macroTargets } from '../lib/police/nutrition.js'
import { briefing, setLine, resultLine } from '../lib/police/jarvis.js'
import '../police.css'

const TABS = [
  { value: 'today', label: 'Today' },
  { value: 'tests', label: 'Tests' },
  { value: 'plan', label: 'Plan' },
  { value: 'reps', label: 'Reps' },
  { value: 'food', label: 'Food' },
]

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
  const ready = readiness(P.results, P.beepTarget)
  const week = weekNumber(P.start, todayISO())
  const dow = new Date().getDay()
  const plan = P.level && week ? weekPlan(P.level, week) : null
  const day = plan?.days.find(d => d.day === dow)
  const lines = useMemo(() => briefing({ name: P.name || user?.name, hour: new Date().getHours(), week, day, ready, seed: Number(todayISO().replace(/-/g, '')) }),
    [P.name, user?.name, week, day, ready.passed, ready.weakest?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return <>
    <div className="card pf-jarvis">
      <div className="pf-jarvis-h"><span className="pf-orb" aria-hidden="true" /><b>Jarvis</b><span className="pf-sub">Your recruit coach</span></div>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
      <Button variant="tinted" icon="play" onClick={() => { if (!speak(lines)) useUI.getState().toast('This device has no voice to read aloud') }}>Hear it</Button>
    </div>

    <div className="card pf-ready">
      <div className="pf-ring" style={{ '--p': ready.pct }}><span>{ready.pct}%</span></div>
      <div>
        <h3>Test readiness</h3>
        <p className="pf-sub">Passing {ready.passed} of {ready.total} standards</p>
        <Button size="sm" onClick={() => setTab('tests')}>Log a test</Button>
      </div>
    </div>

    {!P.level || !P.start ? <Setup S={S} P={P} /> : <div className="card">
      <div className="row between"><h3>Week {week} of {WEEKS}</h3><span className="pf-chip">Phase {plan.phase.n}: {plan.phase.range} reps</span></div>
      <p className="pf-sub">{plan.phase.focus}</p>
      {day && <DayCard d={day} today />}
      <div className="pf-actions">
        {day?.key && <Button variant="primary" icon="play" onClick={() => nav('/home')}>Start from Home</Button>}
        <Button onClick={() => setTab('plan')}>Whole week</Button>
      </div>
      <PhaseSync S={S} P={P} week={week} />
    </div>}
  </>
}

function Setup({ S, P }) {
  const update = useStore(s => s.update)
  const setP = usePolice()
  const [level, setLevel] = useState(P.level || 'beginner')
  const build = () => {
    const built = buildPoliceProgramme(level)
    update(s => {
      s.routines = [...(s.routines || []), ...built.routines.map(({ police, ...r }) => r)]
      saveProgramme(s, built.programme)
      startProgramme(s, built.programme.id)
      s.police = { ...(s.police || {}), level, start: todayISO(), programmeId: built.programme.id, keys: built.keys, phase: 1 }
    })
    useUI.getState().toast('Your 12 weeks start today. Let us get to work.')
  }
  return <div className="card">
    <h3>Build your 12-week programme</h3>
    <Segmented options={LEVELS.map(l => ({ value: l.id, label: l.name }))} value={level} onChange={setLevel} />
    <p className="pf-sub">{LEVELS.find(l => l.id === level).blurb}</p>
    <p className="pf-sub">It adds 7 routines (gym, runs and a recovery walk) and starts a 12-week programme in your Plan. Your current plan comes back when you end it.</p>
    <Button variant="primary" onClick={build}>Build my programme</Button>
    {S.programme && <p className="pf-sub">This replaces the programme running now.</p>}
    <button className="pf-link" onClick={() => setP({ level, start: P.start || todayISO() })}>Just show me the plan, I will track it myself</button>
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
    <div className="pf-day-h"><span>{d.dayName}</span><b>{d.title}</b></div>
    <ul>{d.details.map((x, i) => <li key={i}>{x}</li>)}</ul>
    {d.recovery?.length > 0 && <div className="pf-rec">{d.recovery.map((x, i) => <span key={i} className="pf-chip">{x}</span>)}</div>}
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
          <span className="pf-sub">{std.id === 'beep' ? `Target level ${P.beepTarget || DEFAULT_BEEP_TARGET}` : `${std.better === 'lower' ? 'At most' : 'At least'} ${std.min} ${std.unit}${std.perHand ? ' each hand' : ''}`} · {std.attempts} attempt{std.attempts > 1 ? 's' : ''}</span>
        </span>
        {ev ? <span className={'pf-chip ' + (ev.pass ? 'pass' : 'fail')}>{ev.pass ? 'PASS' : `${ev.pct}%`}</span> : <span className="pf-chip">Not tested</span>}
      </button>
      {ev && <div className="pf-bar"><span style={{ width: ev.pct + '%' }} /></div>}
      {latest && <p className="pf-sub">Latest: {fmtResult(std.id, latest.v)} on {latest.at}{(() => { const b = bestResult(P.results, std.id); return b && b !== latest ? ` · Best: ${fmtResult(std.id, b.v)}` : '' })()}</p>}
      {open === std.id && <LogForm std={std} P={P} onDone={() => setOpen(null)} />}
    </div>)}
    <div className="card">
      <h3>Beep test target</h3>
      <p className="pf-sub">Standards differ by state and change. Check your service's current requirement and set it here (level.shuttle).</p>
      <TextField value={P.beepTarget || DEFAULT_BEEP_TARGET} inputMode="decimal" aria-label="Beep test target"
        onChange={e => setP({ beepTarget: e.target.value })} />
      {!parseBeep(P.beepTarget || DEFAULT_BEEP_TARGET) && <p className="pf-warn">Write it as level.shuttle, for example 7.5</p>}
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
  const plan = weekPlan(level, week)
  return <>
    <Segmented options={LEVELS.map(l => ({ value: l.id, label: l.name }))} value={level} onChange={l => setP({ level: l })} />
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
      <h3>The rep range rule</h3>
      <div className="pf-rule">
        <div><b>{range.min - 1}</b><span>or fewer</span><em className="down">Move down next set</em></div>
        <div><b>{range.min}-{range.max - 1}</b><span>in range</span><em className="stay">Stay</em></div>
        <div><b>{range.max}+</b><span>top or more</span><em className="up">Move up +{unit === 'lb' ? '5 lb' : '2.5 kg'}</em></div>
      </div>
      <p className="pf-sub">Same rule week to week: where you finish is where you start next week. Log every set, so you always know your number.</p>
    </div>
    <div className="card">
      <h3>What next set?</h3>
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

// --- Food --------------------------------------------------------------------------------
function Food({ S, P }) {
  const setP = usePolice()
  const bw = lastBW(S)
  const kg = bw ? (S.unit === 'lb' ? bw.w / 2.2046 : bw.w) : null
  const [weight, setWeight] = useState(P.weightKg ?? (kg ? Math.round(kg) : 80))
  const [goal, setGoal] = useState(P.goal || 'lose')
  const m = macroTargets({ weightKg: weight, goal, activity: 'high' })
  return <>
    <div className="card">
      <h3>Your daily targets</h3>
      <div className="pf-2">
        <label>Body weight (kg)<NumberField value={weight} onChange={x => { setWeight(x); setP({ weightKg: x }) }} /></label>
      </div>
      <Segmented options={[{ value: 'lose', label: 'Lose fat' }, { value: 'recomp', label: 'Recomp' }, { value: 'gain', label: 'Gain' }]} value={goal} onChange={g => { setGoal(g); setP({ goal: g }) }} />
      {m && <div className="pf-macros">
        <div><b>{m.kcal}</b><span>kcal</span></div>
        <div><b>{m.protein} g</b><span>protein</span></div>
        <div><b>{m.carbs} g</b><span>carbs</span></div>
        <div><b>{m.fat} g</b><span>fat</span></div>
        <div><b>{m.water} L</b><span>water</span></div>
      </div>}
      <p className="pf-sub">Estimated for 6-7 training sessions a week. Check the weekly average of your weigh-ins and adjust by 100-200 kcal.</p>
    </div>
    {DIETS.map(d => <details key={d.id} className="card pf-diet" open={P.diet === d.id}>
      <summary><b>{d.name}</b> <span className="pf-chip">{d.tag}</span></summary>
      <p className="pf-sub">{d.who}</p>
      <h4>How it works</h4><ul>{d.how.map((x, i) => <li key={i}>{x}</li>)}</ul>
      <h4>A day of eating</h4><ul>{d.day.map((x, i) => <li key={i}>{x}</li>)}</ul>
      {d.variants && <><h4>Other options</h4><ul>{d.variants.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
      <Button size="sm" variant={P.diet === d.id ? 'primary' : 'plain'} onClick={() => setP({ diet: d.id })}>{P.diet === d.id ? 'My plan' : 'Follow this plan'}</Button>
    </details>)}
    <div className="card"><h3>The rules every plan follows</h3><ol>{PRINCIPLES.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
    <div className="card"><h3>Recovery</h3>{RECOVERY.map(r => <p key={r.id} className="pf-sub"><b>{r.name}.</b> {r.how}</p>)}</div>
    <p className="pf-sub pf-pad">{DISCLAIMER}</p>
  </>
}

export default function PoliceFit() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const P = policeOf(S)
  const [tab, setTab] = useState('today')
  return <div className="narrow pf">
    <div className="hdr">
      <button className="iconbtn" data-back="/home" onClick={() => nav('/home')} aria-label="Home"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}><h1>Police Prep</h1>
        <div className="sub">Train for the test. Become the officer.</div></div>
    </div>
    <Segmented options={TABS} value={tab} onChange={setTab} className="pf-tabs" />
    {tab === 'today' && <Today S={S} user={user} P={P} setTab={setTab} />}
    {tab === 'tests' && <Tests P={P} />}
    {tab === 'plan' && <Plan P={P} />}
    {tab === 'reps' && <Reps S={S} />}
    {tab === 'food' && <Food S={S} P={P} />}
    <p className="pf-sub pf-pad">Not affiliated with any police service. Check your own service's current requirements and see a doctor before starting a new training programme.</p>
  </div>
}
