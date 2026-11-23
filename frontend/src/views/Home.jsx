import { countsForPlan } from '../lib/police/reopen.js'
import { HaydenToggle } from '../components/HaydenBuddy.jsx'
import { useEffect, useMemo, useState } from 'react'
import BadgeLogo from '../components/BadgeLogo.jsx'
import { todayChoiceSheet, underWaySheet } from '../workout-controls.jsx'
import { HaydenCards, HaydenAsk } from '../components/HaydenCards.jsx'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutines, effectiveRoutineIds, nextTrainingDay, lastBW } from '../lib/history.js'
import { streakInfo } from '../lib/streak.js'
import { StreakFlame, StreakMeta, StreakParty } from '../components/Streak.jsx'
import { fmtNum, fmtDate, todayISO, isoOf, weekStartOf, weekDayOffset, DAYS, DAYN } from '../lib/format.js'
import { t, tn, dateLocale } from '../lib/i18n.js'
import { bwSheet, goalSheet, workoutDetailSheet, menuSheet, dayOverrideSheet, calendarSheet, startFlow, starterPlanSheet, bwDeltaColor, weighInsSheet } from '../sheets.jsx'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import StartPicker from '../components/StartPicker.jsx'
import { needsAfterTest, afterPatch, AFTER_CHOICES } from '../lib/police/after-test.js'
import { countIn, countInRun, actForRoutine } from '../components/CountIn.jsx'
import { runMinutes } from '../lib/police/runs.js'
import { shareWin } from '../components/ShareWin.jsx'
import { winText } from '../lib/police/cheer-text.js'
import CardHead from '../components/CardHead.jsx'
import QueueRow from '../components/QueueRow.jsx'
import MiniBodyMap from '../components/MiniBodyMap.jsx'
import { queueOf, queueView, weekTally, pinState } from '../lib/queue.js'
import { workoutsLeft } from '../lib/week-left.js'
import { WeeklySetsHomeLine } from '../components/WeeklySets.jsx'
import { RecapHomeCard } from '../components/Recap.jsx'
import { scheduleModeOf } from '../lib/rotation.js'
import { useConnectionTrouble } from '../components/SyncBanner.jsx'
import { Button } from '../components/ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { glyphOf } from '../lib/glyphs.js'
import { dayNoteOf } from '../lib/day-notes.js'
import { weighInAt } from '../lib/bodyweight.js'
import WeightRate from '../components/WeightRate.jsx'
import { programmeChip } from '../lib/programmes.js'
import { SeasonDeco } from '../components/Seasonal.jsx'
import { WrappedHomeCard } from '../components/WrappedEntry.jsx'
import RecoveryHint from '../components/RecoveryHint.jsx'
import { ChallengesCard } from '../components/Challenges.jsx'
import { isOn } from '../lib/modules.js'
import { BRAND } from '../lib/police/brand.js'
import { planWeekOf, daysUntil } from '../lib/police/programme.js'
import { todayNow } from '../lib/police/today-now.js'
import { shareSession } from '../lib/police/share-card.js'
import { durationMinOf } from '../lib/workout-date.js'
import { runForRoutine } from '../lib/police/run-routines.js'
import EventCountdown from '../components/EventCountdown.jsx'
import { coachAvailable } from '../lib/coach.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import TodaySwipe from '../components/TodaySwipe.jsx'
import { isBadgeFit, isBadgeFitGuest, toSignIn } from '../lib/police/guest.js'
import ReadyRing from '../components/ReadyRing.jsx'
import { weeksInARow } from '../lib/police/bot-card.js'
import { installPlanIn, onBadgeFitPlan } from '../lib/police/install-plan.js'
import { offerHealthOnce } from '../lib/police/health-ask.js'
import { useUI } from '../store/useUI.js'
import { REST } from '../lib/rotation.js'
import { weeklyFocus } from '../lib/police/weekly-focus.js'

// Home = what to do now + a quick glance. Deep charts & history live in Stats.
export default function Home() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  // The banner switched off and the sync stuck: a dot on the gear (Settings → Show connection status).
  const trouble = useConnectionTrouble()
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  // A weekday can hold several routines. `todayRoutines` is the whole day; `routine` is the
  // first, kept for the one-routine glyph. The derived session name joins them (§9).
  const todayRoutines = effectiveRoutines(S, todayISO())
  const routine = todayRoutines[0] || null
  const todayName = todayRoutines.map(r => r.name).join(' + ')
  // A fulfilled pin (a coach session pinned to today and since done) reads as no override.
  const todayOvr = S.dayPlan[todayISO()] !== undefined && pinState(S, S.dayPlan[todayISO()]) !== 'done'
  // An open editor on a saved workout (lib/session-edit.js) holds S.active too, but it is not a
  // session in progress: the row takes you back to it as an edit, the way the tab bar does.
  const editingSaved = !!S.active?.editingWorkoutId
  const bw = lastBW(S)
  const prevBW = S.bodyweight.length > 1 ? S.bodyweight[S.bodyweight.length - 2] : null
  const delta = bw && prevBW ? bw.w - prevBW.w : null

  const ws = weekStartOf(S)
  // The first day of the shown week. Named for the role, not for Monday — which day that is
  // is the setting.
  const wkStart = new Date(today)
  wkStart.setDate(today.getDate() - weekDayOffset(today.getDay(), ws) + weekOffset * 7)
  // A day unticked on Plan loses its ✓ here too (lib/police/reopen.js).
  const doneDays = new Set(S.workouts.filter(w => countsForPlan(w, S.police)).map(w => w.d))
  // The last session logged for today, if any — what the row below reports instead of asking
  // you to start the one you already did. Last wins, so a second session names itself. Only once
  // today's plan is covered, though: a freestyle session on a planned day, or the rotation's
  // first session done when its next one is today's too, leaves the row offering what is still
  // to do, as Start and the progress row already do. A queue session is never "covered" by an
  // earlier workout: the queue only names one it does not count as done yet.
  // A day unticked on Plan (lib/police/reopen.js) is offered again: earlier workouts stop counting.
  const loggedToday = S.workouts.filter(w => w.d === todayISO() && countsForPlan(w, S.police))
  const queueIds = queueOf(S)?.ids || []
  const coveredToday = id => !queueIds.includes(id) && loggedToday.some(w => (Array.isArray(w.routineIds) ? w.routineIds : [w.routineId]).includes(id))
  const doneToday = (todayRoutines.every(r => coveredToday(r.id)) && loggedToday.at(-1)) || null
  const strip = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(wkStart); d.setDate(wkStart.getDate() + i)
    const iso = isoOf(d)
    const eff = effectiveRoutineIds(S, iso).length > 0, ovr = S.dayPlan[iso] !== undefined, done = doneDays.has(iso)
    // A day off with a note (#261) reads as excused, not as a plan that went by.
    const dot = done ? ' done' : dayNoteOf(S, iso) ? ' noted' : ovr && eff ? ' ovr' : eff ? ' plan' : ''
    // BadgeFit: a day gone by is over: faded, not tappable, a ✓ if it was trained, else blank.
    const past = !!S.police?.start && iso < todayISO()
    if (past) strip.push(<div key={i} className={'wday past' + (done ? ' was-done' : '')} aria-disabled="true">
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div>{done ? <div className="wcheck" aria-label={t('Done')}>✓</div> : <div className="dot" />}</div>)
    else strip.push(<div key={i} className={'wday' + (iso === todayISO() ? ' today' : '')} {...tappable(() => dayOverrideSheet(iso))}>
      <div className="lbl">{t(DAYS[d.getDay()])}</div><div className="num">{d.getDate()}</div>{S.police?.start && done ? <div className="wcheck" aria-label={t('Done')}>✓</div> : <div className={'dot' + dot} />}</div>)
  }
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkStart.getDate() + 6)
  const wkLabel = weekOffset === 0 ? t('This week') : `${wkStart.getDate()} ${wkStart.toLocaleDateString(dateLocale(), { month: 'short' })} – ${wkEnd.getDate()} ${wkEnd.toLocaleDateString(dateLocale(), { month: 'short' })}`

  // A coach week (S.queue) read through the same tolerant reader QueueRow uses, so a malformed
  // queue from another client shows the weekday dots, never an empty card.
  const queue = queueView(S, todayISO())
  // This card shows one thing or the other — QueueRow for a live queue, or Rotation chosen with
  // nothing built yet (S.scheduleMode), in which case there is no queue for QueueRow to render and
  // an empty-state card takes its place. Plan does the same in rotation mode: no weekday grid, only
  // the days that add a routine the loop does not have (Plan.jsx, "Also on fixed days").
  const rotating = scheduleModeOf(S) === 'rotation'
  const weekNav = <>
    <div className="row between" style={{ marginBottom: 8 }}>
      <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 'var(--fs-subhead)' }} onClick={() => setWeekOffset(w => w - 1)} aria-label={t('Previous week')}><Icon name="chevronLeft" /></button>
      <div className="small muted" style={{ fontWeight: 500 }}>{wkLabel}</div>
      <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 'var(--fs-subhead)' }} onClick={() => setWeekOffset(w => w + 1)} aria-label={t('Next week')}><Icon name="chevronRight" /></button>
    </div>
    <div className="week">{strip}</div>
  </>
  // A planner-written queue (no rotationId) still names its weekday when it hasn't started yet —
  // that copy predates rotation and stays as it is. Our own rotation has no weekday of its own
  // (lib/rotation.js): naming one here — including on the pass's own one-day empty gap (THE
  // ONE-DAY BOUNDARY, rotation.js) or before a first routine is even added — would be the
  // fixed-week model leaking into a schedule that was never weekday-based.
  const liveQ = queueOf(S)
  const plannerQueue = !!queue && !liveQ?.rotationId
  // Ownership, not mere presence of a rotationId: a stale id left over from a rebuilt rotation
  // would otherwise still read as "this app manages it" (lib/rotation.js).
  const managedQueue = !!liveQ && !!S.rotation && liveQ.rotationId === S.rotation.id
  // On a rest day, saying when you train next beats leaving the row as a full stop.
  const next = !S.active && !todayRoutines.length && !(rotating && !plannerQueue) ? nextTrainingDay(S, todayISO()) : null
  // The streak card's fraction: this calendar week's workouts over the weekdays with a plan, or,
  // in a coach week, the queue's sessions and your own days together (lib/queue.js weekTally).
  const tally = weekTally(S, todayISO())
  const { done: doneThisWeek, planned: plannedPerWeek } = tally
  const left = workoutsLeft(S, todayISO())
  // The week's plan as a countdown (#753, lib/week-left.js): "2 of 4 left this week".
  const weekLeft = left && <div className={'small dim wkleft' + (left.left > 0 ? '' : ' done')}>
    {left.left > 0 ? tn('{0} of {1} left this week', '{0} of {1} left this week', left.left, left.of) : t('All done this week. Nice.')}
  </div>
  // BadgeFit: the week strip sits inside the countdown card, so the two read as one card.
  const bfWeek = !rotating && !!S.police?.start && !!weeklyFocus(S.police, todayISO())
  // The streak with its best run and freezes (lib/streak.js), read back from the workouts.
  const todayKey = todayISO()
  const streak = useMemo(() => streakInfo(S, todayKey), [S.workouts, S.weekStart, todayKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // Settings → Modules (lib/modules.js): what a module switched off hides here.
  const on = id => isOn(S, id)
  const bwPoints = S.bodyweight.slice(-30).map(b => ({ t: weighInAt(b), y: b.w, d: b.d }))

  // today's session shown right under the week strip
  const onTodayNow = () => { if (S.active) nav('/workout'); else if (todayRoutines.length) startFlow(effectiveRoutineIds(S, todayISO())); else dayOverrideSheet(todayISO()) }
  // BadgeFit: today's workout asks first (Start / something else / rest today / not now), so a
  // tap never drops anyone into a session by accident. A running one opens straight away.
  // BadgeFit: on a run day the plan's run routine opens the guided run (with Hayden), not a gym
  // session with a cardio row in it.
  const bfRun = S.active || !S.police?.level ? null : todayRoutines.map(r => runForRoutine(S.police, r.id, todayISO())).find(Boolean) || null
  const onToday = () => (bfRun ? countInRun(bfRun, runMinutes(bfRun))
    // BadgeFit with a plan: Start opens today's session as pictures (components/SessionPreview.jsx),
    // where it can be changed or started; the swap symbol is the way to something else.
    : S.police?.level && !S.police?.start && !S.active && todayRoutines.length ? todayChoiceSheet(todayName, onTodayNow) : onTodayNow())
  // BadgeFit with a plan: Start opens the round-button sheet (components/StartPicker.jsx), today's
  // session first and lit, the other kinds of training beside it. A running session opens at once.
  const onStart = () => {
    if (S.active || !S.police?.start) return onToday()
    const guestHere = isBadgeFitGuest(S, useStore.getState().config, useStore.getState().user)
    const today = todayRoutines.length ? { kind: bfRun ? 'run' : 'gym', done: !!doneToday, name: bfRun?.name || todayName } : null
    // Today's gym session is counted in by Hayden too, doing its first exercise.
    const startToday = bfRun ? onToday : () => countIn({ title: todayName || 'Today', act: actForRoutine(todayRoutines[0]), onGo: onTodayNow })
    useUI.getState().openSheet(close => <StartPicker close={close} today={today} guest={guestHere} startToday={startToday}
      startRoutine={id => startFlow([id], { auto: true })} restToday={removeToday} />)
  }
  // BadgeFit: today's box swipes away (TodaySwipe) while there is a plan still to do.
  const swipeable = !!S.police?.level && !S.active && !doneToday && todayRoutines.length > 0
  const removeToday = () => { useStore.getState().update(s => { s.dayPlan = { ...(s.dayPlan || {}), [todayISO()]: REST } }); useUI.getState().toast('Removed. Today is a rest day.') }
  const holdToday = () => menuSheet({ title: todayName || t('Today'), sections: [{ items: [
    { icon: 'swap', label: 'Swap for another workout', onClick: () => dayOverrideSheet(todayISO()) },
    { icon: 'trash', danger: true, label: "Remove today's workout", onClick: removeToday },
  ] }, { items: [{ icon: 'xmark', label: t('Cancel'), onClick: () => {} }] }] })
  // Everything logged today that the row above does not already show as done.
  const extraDone = loggedToday.filter(w => w !== doneToday)
  // A chip on the coach week's progress row starts that one routine, in any order. A session
  // already in progress wins, as on the today row — starting another would overwrite it.
  // A BadgeFit member's programme runs as long as their plan (lib/police/programme.js), not 12 weeks.
  const bfPlan = S.police?.level && S.police?.start && S.programme?.id && S.programme.id === S.police.programmeId ? planWeekOf(S.police, todayISO()) : null
  const progChip = bfPlan?.week ? (bfPlan.after ? 'Plan done, training on' : bfPlan.final ? `Final week · ${bfPlan.week} of ${bfPlan.last}` : `Week ${bfPlan.week} of ${bfPlan.last}`) : programmeChip(S)
  // A BadgeFit server (passkeys off): someone not set up yet goes straight to the BadgeFit welcome,
  // once per visit, instead of an empty training log.
  const config = useStore(st => st.config)
  const coachModeHere = useStore(st => st.coachLocal?.mode)
  const coachHere = !!S.police?.level && coachAvailable(config, user, { demo: DEMO, mobile: MOBILE, coachMode: coachModeHere })
  useEffect(() => {
    if (!isBadgeFit(null, config) || S.police?.level) return
    try { if (sessionStorage.getItem('badgefit_welcomed')) return; sessionStorage.setItem('badgefit_welcomed', '1') } catch { /* private mode */ }
    nav('/police')
  }, [config?.passkeys]) // eslint-disable-line react-hooks/exhaustive-deps
  // The phone app offers Apple Health once the plan is set up (lib/police/health-ask.js).
  useEffect(() => {
    if (!S.police?.start) return
    const tm = setTimeout(() => { import('../sheets.jsx').then(m => offerHealthOnce(useStore.getState().S, m.confirmSheet, useUI.getState().toast)).catch(() => {}) }, 2500)
    return () => clearTimeout(tm)
  }, [S.police?.start])
  // Members who said "I passed" before the Academy prep plan existed move onto it once, from the
  // week they are in (lib/police/install-plan.js).
  useEffect(() => {
    const P0 = S.police
    if (!P0?.level || P0.afterTest !== 'passed' || P0.track === 'academy' || !onBadgeFitPlan(P0) || S.active) return
    useStore.getState().update(s => { installPlanIn(s, { level: s.police.level, choice: s.police.planChoice === 'run' ? 'run' : 'badgefit', track: 'academy' }) })
  }, [S.police?.afterTest, S.police?.track]) // eslint-disable-line react-hooks/exhaustive-deps
  const onQueueStart = id => { if (S.active) nav('/workout'); else startFlow([id]) }

  // BadgeFit with a plan: the calm Home. One screen that reads like a trainer, not an app: a
  // welcome, what today is, one button, the week's dates, and Hayden at the bottom. Everything
  // else (plan, tests, stats, exercises, settings) is behind the menu, top left.
  // BadgeFit without a plan: Home is the setup (the calm look starts with the plan).
  if (!S.police?.start && !DEMO && isBadgeFit(S, config)) return <Navigate to="/police" replace />
  if (S.police?.start) {
    const P = S.police
    const guest = isBadgeFitGuest(S, config, user)
    const left = P.testDate ? daysUntil(P.testDate, todayISO()) : null
    const facts = [bfPlan?.week && !bfPlan.after ? `Week ${bfPlan.week} of ${bfPlan.last}` : null].filter(Boolean)
    // What today really is (lib/police/today-now.js): the same source Hayden reads from.
    const now = todayNow(S, todayISO())
    const nowName = now.name
    const mins = S.active || doneToday || !routine ? null : now.minutes
    const line = S.active ? `${S.active.name} is under way.`
      : doneToday ? 'Done. Good work.'
      : routine ? `${nowName}${mins ? ` · ${mins} min` : ''}`
      : next ? `Rest day · next ${t(DAYN[next.weekday])}` : 'Rest day'
    const shareToday = () => {
      const all = loggedToday
      const runKm = (P.runLog || []).filter(r => r.at === todayISO()).reduce((a, r) => a + (Number(r.km) || 0), 0)
      shareSession({
        title: [...new Set(all.map(w => w.name).filter(Boolean))].join(' + ') || 'Training',
        minutes: all.reduce((a, w) => a + durationMinOf(w), 0), km: runKm || null,
        daysToTest: left, testName: P.testName, week: bfPlan?.week && !bfPlan.after ? bfPlan.week : null, weeks: bfPlan?.last || null,
      }, useUI.getState().toast)
    }
    return <div className="narrow calm">
      <div className="calm-top">
        <span />
        <div className="calm-right">
          <HaydenToggle />
          {guest ? <button className="calm-pill" onClick={() => toSignIn(nav)}>Sign in</button>
            : <button className="calm-rb" onClick={() => nav('/settings')} aria-label={trouble ? t('Settings') + ', ' + t('Connection problem') : t('Settings')}><Icon name="personCircle" />{trouble && <span className="tab-dot" aria-hidden="true" />}</button>}
        </div>
      </div>
      {/* Hayden's one small question, only after 3+ days away (components/HaydenCards.jsx). */}
      <HaydenAsk S={S} signedIn={!guest} />

      <div className="calm-mid">
        {/* A member sees how ready they are, the days to go and what to do next (components/ReadyRing.jsx);
            a guest keeps the welcome and the countdown, said big. */}
        {guest ? <>
          <BadgeLogo size={54} />
          <h1 className="calm-hi">{user?.name ? `Welcome, ${user.name}` : 'Welcome'}</h1>
          {left != null && left >= 0 && <div className="calm-count" aria-label={`${left} days to your ${(P.testName || 'PCT').trim()}`}>
            <b>{left}</b><span>{left === 1 ? 'day' : 'days'} to your {(P.testName || 'PCT').trim()}</span>
          </div>}
        </> : <ReadyRing results={P.results} beepTarget={P.beepTarget} left={left} testName={P.testName} streak={weeksInARow(S)}
          onFind={() => nav('/police?tab=tests&test=1')} onOpen={() => nav('/police?tab=tests')} />}
        {/* The test date has gone by: Hayden asks how it went, once, and the plan follows the answer
            (lib/police/after-test.js): the Academy, a re-test, or your own training. */}
        {needsAfterTest(P, todayISO()) && <div className="card calm-after">
          <b>How did your {(P.testName || 'PCT').trim()} go?</b>
          <div className="calm-after-row">{AFTER_CHOICES.map(c => <button key={c.id} type="button" onClick={() => {
            const name = (P.testName || 'PCT').trim()
            useStore.getState().update(s => {
              s.police = { ...(s.police || {}), ...afterPatch(c.id, s.police, todayISO()) }
              // Passed: the Academy prep plan (more running, more lifting) takes over the BadgeFit plan;
              // a re-test goes back to the PCT plan. A plan of your own is left as it is.
              const P2 = s.police
              if (P2.level && onBadgeFitPlan(P2) && (c.id === 'passed' || (c.id === 'retest' && P2.track === 'academy'))) {
                installPlanIn(s, { level: P2.level, choice: P2.planChoice === 'run' ? 'run' : 'badgefit', track: c.id === 'passed' ? 'academy' : undefined })
              } else if (c.id === 'passed') s.police = { ...s.police, track: 'academy' }
            })
            useUI.getState().toast(c.id === 'passed' ? 'Congratulations! Your plan is now Academy prep: more running, more lifting.' : c.id === 'retest' ? 'We go again. Set your new date on the PCT page.' : 'Your plan carries on. Train well.')
            if (c.id === 'passed') shareWin(`I passed my ${name}! Next stop: the Academy.`, 'win', 'passed')
            if (c.id === 'retest') nav('/police?tab=tests')
          }}><Icon name={c.icon} /><span>{c.label}</span><small>{c.sub}</small></button>)}</div>
        </div>}
        {!!facts.length && <div className="calm-facts">{facts.join(' · ')}</div>}
        <p className="calm-line">{line}{swipeable && <button className="calm-swap" onClick={holdToday} aria-label="Change today's workout"><Icon name="swap" /></button>}
          {S.active && <button className="calm-swap" onClick={() => underWaySheet({ resume: onStart })} aria-label="Cancel or change the workout under way"><Icon name="swap" /></button>}</p>
        {/* Nothing tested yet: ten minutes at home to find where you stand, so progress has a start. */}
        {/* Hayden: back after missed days, and one question a week in (components/HaydenCards.jsx). */}
        <HaydenCards S={S} left={left} testName={(P.testName || 'PCT').trim()} onStart={onStart} />
        {guest && !(P.results || []).length && !S.active && <button className="calm-link calm-first" onClick={() => nav('/police?tab=tests&test=1')}><Icon name="target" /> Find your starting point · 10 min</button>}
        {doneToday && !S.active
          ? <div className="calm-done"><span aria-hidden="true">✓</span> Done for today</div>
          : <button className="calm-go" data-tour="today" onClick={onStart}>{S.active ? 'Resume' : routine ? 'Start' : 'Pick a workout'}</button>}
        {/* Done: just the tick. Sharing is offered at the end of the workout itself (the summary and
            the run's done screen); here one quiet line keeps it reachable later. */}
        {doneToday && !S.active && <div className="calm-done-links">
          <button className="calm-link" onClick={() => useUI.getState().openSheet(close => <div className="fin-bf fin-bf-sheet">
            <h3>Share today</h3>
            <button type="button" className="fin-bf-b" onClick={() => { close(); shareToday() }}><Icon name="share" /> Picture card</button>
            {user && <button type="button" className="fin-bf-b" onClick={() => { close(); shareWin(winText({ kind: 'workout', name: doneToday.name || nowName || 'Training', week: bfPlan?.after ? null : bfPlan?.week, of: bfPlan?.last }), 'win', `day:${todayISO()}:${doneToday.name || nowName || 'Training'}`) }}><Icon name="sparkles" /> Share to Community</button>}
          </div>)}>Share</button>
          <span aria-hidden="true">·</span>
          <button className="calm-link" onClick={() => nav('/workout')}>Add a workout</button>
        </div>}
        {extraDone.length > 0 && <div className="done-today">
          {extraDone.map(w => <button key={w.id} type="button" onClick={() => workoutDetailSheet(w)}>
            <span className="ok">✓</span><b>{w.name || t('Workout')}</b><small>{t('Done')}</small>
          </button>)}
        </div>}
        <div className="calm-week">{weekNav}</div>
      </div>
    </div>
  }

  return <div className="narrow">
    <div className="hdr">
      <SeasonDeco spot="header-bats" />
      <div><h1>{user ? t('Hi {0}', user.name) : BRAND.name}</h1><div className="sub">{today.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <div className="hdr-btns hdr-actions">
        {/* BadgeFit: the Coach (Hayden), as on Plan, on the same plan. */}
        {coachHere && <Button size="sm" variant="tinted" icon="sparkles" onClick={() => nav('/coach')}>{t('Coach')}</Button>}
        {/* A guest always has the way to an account in sight. */}
        {isBadgeFitGuest(S, config, user) && <Button size="sm" variant="primary" onClick={() => toSignIn(nav)}>Sign in</Button>}
        <button className="iconbtn" data-tour="settings-gear" onClick={() => nav('/settings')} aria-label={trouble ? t('Settings') + ', ' + t('Connection problem') : t('Settings')}><Icon name="gear" />{trouble && <span className="tab-dot" aria-hidden="true" />}</button>
      </div>
    </div>

    {/* Police Prep (views/PoliceFit.jsx): the applicant hub, one tap from Home. English only, like that screen. */}
    <button type="button" className="card tap-host police-home" onClick={() => nav('/police')}>
      <BadgeLogo size={46} />
      <span className="police-home-m"><b className="bf-word">Badge<span>Fit</span></b><span>{S.police?.start ? 'Hayden has your briefing. Tap in.' : 'Fitness standards, 12-week plan, nutrition and your coach'}</span></span>
      <Icon name="chevronRight" />
    </button>
    {S.police?.start && <EventCountdown P={S.police}>{bfWeek && weekNav}</EventCountdown>}

    <div className="card">
      {/* A running programme (lib/programmes.js) wrote this week's plan: where it stands, one tap from its screen. */}
      {/* BadgeFit shows the week in its countdown card above (EventCountdown), not twice. */}
      {progChip && !(bfPlan?.week && S.police?.start) && <button type="button" className="chip ichip prog-chip" onClick={() => nav(bfPlan?.week ? '/police?tab=plan' : '/plan/programmes')}><Icon name="calendar" /><span>{progChip}</span></button>}
      {/* A coach week runs by order, not by weekday, so its progress row stands in for the
          seven dots (components/QueueRow.jsx). The today row below stays as it is: the queue's
          next session reaches it through effectiveRoutineIds like any planned routine. */}
      {rotating ? (queue ? <QueueRow S={S} today={todayISO()} onStart={onQueueStart} managed={managedQueue} /> : <div className="empty">
        {t('No rotation yet. Add routines to it in Plan.')}
        <div style={{ marginTop: 10 }}><Button size="sm" variant="tinted" onClick={() => nav('/plan')}>{t('Set up in Plan')}</Button></div>
      </div>) : <>
        {!bfWeek && weekNav}
      </>}
      {!bfWeek && weekLeft}
      {/* Once today's session is logged the row stops asking for it. The week strip already
          knew (its dot goes 'done'); this row did not, so a finished day kept showing the
          routine name behind a green Start tag and read as still outstanding (issue #4).
          An in-progress session still wins — that one is happening right now. Tapping the
          row keeps working, so a second session in one day is a tap away, just not urged. */}
      {/* BadgeFit: swipe today's box left (or hold it) to remove today's workout: today becomes a
          rest day, nothing is deleted. */}
      <TodaySwipe enabled={swipeable} onRemove={removeToday} onHold={holdToday}>
      {/* Done for today: shown as complete and not tappable, so a finished session is not started again. */}
      <div className={'today-row' + (doneToday && !S.active ? ' is-done' : '')} data-tour="today" {...(doneToday && !S.active ? { 'aria-disabled': true } : tappable(onToday))}>
        <div className="row" style={{ gap: 9, minWidth: 0 }}>
          <span className="lrow-i" style={{ background: S.active ? 'var(--orange)' : doneToday ? 'var(--surface-3)' : routine ? 'var(--acc)' : 'var(--surface-3)',
            // the rest day's moon on the grey square: white on #e3e3e8 vanished in the light theme
            ...(!S.active && !doneToday && !routine ? { color: 'var(--label-2)' } : {}) }}>
            <Icon name={S.active ? (editingSaved ? 'pencil' : 'play') : doneToday ? 'checkCircle' : routine ? glyphOf(routine.emoji) : 'moon'}
              style={doneToday && !S.active ? { color: 'var(--green)' } : undefined} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="lbl2">{t('Today')}</div>
            <div className="ttl">{S.active ? (editingSaved ? S.active.name : t('{0} (in progress)', S.active.name))
              : doneToday ? (doneToday.name ? t('{0} (done)', doneToday.name) : t('Workout done'))
              : routine ? todayName : t('Rest day')}{todayOvr && routine && !doneToday ? ' · ' + t('rescheduled') : ''}</div>
            {bfRun && !doneToday && <div className="ss">Guided run with Hayden · {bfRun.name}</div>}
            {next && !doneToday && <div className="ss">{t('Next session: {0}, {1}', t(DAYN[next.weekday]), next.routine.name)}</div>}
          </div>
        </div>
        {S.active ? <span className="tag" style={{ color: 'var(--orange)', background: 'color-mix(in srgb,var(--orange) 16%,transparent)' }}>{editingSaved ? t('Edit') : t('Resume')}</span>
          : doneToday ? <span className="tag" style={{ color: 'var(--green)', background: 'color-mix(in srgb,var(--green) 16%,transparent)' }}>{t('Done')}</span>
          : routine ? <span className="row" style={{ gap: 8 }}><MiniBodyMap routines={todayRoutines} body={S.body} /><span className="tag acc">{t('Start')}</span></span>
          : <Icon name="plus" className="chev" />}
      </div>
      </TodaySwipe>
      {/* BadgeFit: everything trained today, ticked, so a session beside the plan (legs on a run
          day) shows as done too. Tap one to see it. */}
      {S.police?.level && extraDone.length > 0 && <div className="done-today">
        {extraDone.map(w => <button key={w.id} type="button" onClick={() => workoutDetailSheet(w)}>
          <span className="ok">✓</span><b>{w.name || t('Workout')}</b><small>{t('Done')}</small>
        </button>)}
      </div>}
      {/* The row above starts today's plan in one tap, and so does the Start button in the tab
          bar — which is the whole problem when you want something else. Both jump straight into
          the planned session whenever there is one, so the Start screen (a freestyle session,
          and your other routines) is only reachable on a day with nothing planned. The one other
          way in, "Choose a different workout" on the weigh-in sheet, does not exist when the
          weigh-in is switched off. This is that door, and it starts nothing on its own. */}
      {!S.active && (!S.police?.level || doneToday) && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <Button size="sm" variant="ghost" className="dim" icon="swap" onClick={() => nav('/workout')}>
          {doneToday && S.police?.level ? 'Add an extra workout' : t('Choose a different workout')}
        </Button>
      </div>}
      <SeasonDeco spot="home-hero" />
    </div>

    {/* Monday: Your week; the 1st: Your month (lib/recap.js). Off in Settings → Look & Home. */}
    <RecapHomeCard S={S} />

    {/* Christmas (lib/seasonal.js): the advent calendar's card, 1 to 24 December, from the theme's chunk. */}
    <SeasonDeco spot="home-advent" />

    {/* December and January: the year in openGym is ready (lib/wrapped.js homeCardYear). */}
    {on('motivation') && <WrappedHomeCard S={S} />}

    {/* What has rested and what is still recovering, kindly (lib/recovery-hint.js). */}
    {on('health') && <RecoveryHint S={S} />}

    {/* This month's three challenges and how far you are (lib/challenges.js). */}
    <ChallengesCard S={S} />

    {/* Jump to the gym check-in cards (QR membership codes). Shown here as a quick tap on
        arrival at the gym; folds away per user via the "Gym check-in" switch in Settings. */}
    {/* BadgeFit has no gym check-in: the card is gone from Home, and its screen from the app. */}

    {!S.routines.length && !S.active && (
      <div className="card">
        <CardHead icon="calendar" title={t('Welcome!')} sub={t('Set up your weekly routine to get going, or grab a ready-made starter plan.')} />
        <Button variant="primary" icon="clipboard" onClick={starterPlanSheet}>{t('Load starter plan')}</Button>
        <div style={{ height: 8 }} /><Button onClick={() => nav('/plan')}>{t('Build my own plan')}</Button>
      </div>
    )}

    {on('body') && S.showWeightCard !== false && <div className="card">
      {/* one trailing action, Log; the goal lives with the goal line and the weigh-ins below (P2) */}
      <CardHead icon="scale" tint="var(--teal)" title={t('Body weight')} className="bw-head"
        action={<Button size="sm" icon="plus" onClick={() => bwSheet()}>{t('Log')}</Button>} />
      {bw ? <>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <div className="big">{fmtNum(bw.w)} <span className="muted" style={{ fontSize: 'var(--fs-callout)' }}>{S.unit}</span></div>
          {/* only when it actually moved — an unchanged weight used to read as "− 0" */}
          {!!delta && (
            <span className="small row" style={{ gap: 2, fontWeight: 500, color: bwDeltaColor(delta, bw.w) }}>
              <Icon name={delta > 0 ? 'arrowUp' : 'arrowDown'} style={{ fontSize: 'var(--fs-caption)' }} />
              {fmtNum(Math.abs(delta))}
            </span>
          )}
          <span className="dim small" style={{ marginInlineStart: 'auto' }}>{fmtDate(bw.d, true)}</span>
        </div>
        {S.targetW && (
          <div className="small row" style={{ color: 'var(--gold-ink)', marginTop: 4, gap: 5 }}>
            <Icon name="target" style={{ fontSize: 'var(--fs-footnote)' }} />
            <span>{t('Goal')} {fmtNum(S.targetW)} {S.unit} · {Math.abs(S.targetW - bw.w) < 0.05 ? t('reached!') : t(S.targetW > bw.w ? '{0} to gain' : '{0} to lose', fmtNum(Math.abs(S.targetW - bw.w)) + ' ' + S.unit)}</span>
          </div>
        )}
        <div className="chart" style={{ marginTop: 8 }}><LineChart points={bwPoints} h={130} unit={S.unit} goal={S.targetW} /></div>
        {/* the weekly rate and, with one set, how it sits in its corridor (#759) */}
        <WeightRate S={S} />
        {/* every weigh-in, week by week with its average (Discord 'Weight') */}
        <div className="row between" style={{ marginTop: 4 }}>
          <Button size="sm" variant="ghost" icon="target" className="bw-goal" style={S.targetW ? { color: 'var(--gold-ink)' } : undefined} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
          <Button size="sm" variant="ghost" trailingIcon="chevronRight" data-tour="home-weighins" onClick={weighInsSheet}>{t('All weigh-ins')}</Button>
        </div>
      </> : <>
        <div className="muted small">{S.weighIn === false
          ? t('No weigh-ins yet. Log your weight to start the curve.')
          : t("No weigh-ins yet. Log your weight to start the curve (we also ask before every workout).")}</div>
        <Button size="sm" variant="ghost" icon="target" className="bw-goal" style={{ marginTop: 6, ...(S.targetW ? { color: 'var(--gold-ink)' } : {}) }} onClick={goalSheet}>{S.targetW ? fmtNum(S.targetW) : t('Goal')}</Button>
      </>}
    </div>}

    {/* The streak opens its calendar from its text (CardHead open); the weekly-sets line and the
        party banner are buttons of their own beside it, not inside a card that is a button. */}
    {on('motivation') ? <div className="card tap-host streak-card">
      <SeasonDeco spot="home-streak" />
      {/* in season, a Santa hat on the flame (components/Seasonal.jsx) */}
      <CardHead className="streak-head" glyph={<span className="streak-flame-wrap"><StreakFlame lit={streak.current > 0} /><SeasonDeco spot="streak-flame" /></span>}
        title={t('{0} week streak', streak.current)} open={{ onClick: () => calendarSheet(), haspopup: 'dialog' }}
        sub={<>{doneThisWeek}{plannedPerWeek ? ' / ' + plannedPerWeek : ''} {t('this week')} · {tn('{0} workout total', '{0} workouts total', S.workouts.length)}</>}
        action={<Icon name="calendar" className="chev" style={{ fontSize: 'var(--fs-title3)' }} />} />
      {(streak.best > 0 || streak.freezes > 0) && <div className="muted small card-head-indent streak-meta-line"><StreakMeta info={streak} /></div>}
      <StreakParty S={S} info={streak} tally={tally} />
      {/* Settings → Look & Home → Weekly sets on Home (lib/muscle-targets.js): the muscle with
          the most room this week, one tap from the Stats card. */}
      {/* Straight to Stats → Lifts, where the card is, not to the top of Overview (P5 deep link). */}
      {S.homeMuscleSets === true && <WeeklySetsHomeLine S={S} onOpen={() => nav('/stats?section=lifts')} />}
    </div>
      // Motivation off: no streak card, but the weekly sets line it carried keeps a card of its own.
      : S.homeMuscleSets === true && <div className="card wsets-solo"><WeeklySetsHomeLine S={S} onOpen={() => nav('/stats?section=lifts')} /></div>}
  </div>
}
