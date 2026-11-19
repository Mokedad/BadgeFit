// "Share my week" (BadgeFit, Plan's Share button): this week as a coloured strip (gym, run, rest),
// a few words, and, if you like, the plan itself so others can try it (it rides along as a shared
// plan, api/community.js). Your weights and test results never go with it.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { todayISO } from '../lib/format.js'
import { planWeekOf } from '../lib/police/programme.js'
import { planFromRoutines, stageOf } from '../lib/police/community.js'
import { mondayOf, weekDays, shareKind } from '../lib/police/week-edit.js'
import { dayInfo } from './PlanDays.jsx'
import { TextArea } from './ui.jsx'

/** This week's seven days for sharing: { label, days: [{ k, name }] }, and its gym sessions. */
export function weekToShare(S, today = todayISO()) {
  const P = S.police || {}
  const pw = P.start ? planWeekOf(P, today) : null
  const label = pw?.week && !pw.after ? `Week ${pw.week} of ${pw.last}` : 'My week'
  const infos = weekDays(mondayOf(today)).map(d => dayInfo(S, d))
  const routines = [...new Map(infos.flatMap(i => i.gym).map(r => [r.id, r])).values()]
  return { week: { label, days: infos.map(i => ({ k: shareKind(i.kind), name: i.kind === 'rest' ? 'Rest' : i.name })) }, routines }
}

/** The week as a strip: a coloured block a day, M to S. */
export function WeekStrip({ week }) {
  return <div className="wk-card">
    <b>{week.label}</b>
    <div className="wk-bars">{week.days.map((d, i) => <div key={i} className={'wkk-' + d.k} title={d.name}>{'MTWTFSS'[i]}<i /></div>)}</div>
    <small>{week.days.filter(d => d.k === 'gym').length} gym · {week.days.filter(d => d.k === 'run').length} run · {week.days.filter(d => d.k === 'rest').length} rest</small>
  </div>
}

function ShareWeek({ close }) {
  const S = useStore(s => s.S)
  const [text, setText] = useState('')
  const [tryIt, setTryIt] = useState(true)
  const [busy, setBusy] = useState(false)
  const { week, routines } = weekToShare(S)
  const P = S.police || {}
  const send = async () => {
    setBusy(true)
    try {
      const plan = tryIt && routines.length ? planFromRoutines(routines, (S.programme?.name || 'My week').slice(0, 60), P.level) : undefined
      await api('/api/community/post', { method: 'POST', body: JSON.stringify({ text, week, plan, topic: 'journey', stage: stageOf(P) }) })
      close()
      useUI.getState().toast('Shared to Community')
    } catch (e) { useUI.getState().toast(e?.message || 'Could not share right now') }
    setBusy(false)
  }
  return <div className="wk-share">
    <h3>Share my week</h3>
    <WeekStrip week={week} />
    <TextArea value={text} maxLength={1000} rows={2} placeholder="A few words (optional)" onChange={e => setText(e.target.value)} />
    {routines.length > 0 && <label className="wk-try"><input type="checkbox" checked={tryIt} onChange={e => setTryIt(e.target.checked)} /> Let others try this plan</label>}
    <p className="pf-sub">Others see the days and the exercises, never your weights or results.</p>
    <button type="button" className="pf-go" disabled={busy} onClick={send}>Post to Community</button>
  </div>
}

export const shareWeekSheet = () => {
  if (!useStore.getState().user) { useUI.getState().toast('Sign up free to share your week'); return }
  useUI.getState().openSheet(close => <ShareWeek close={close} />)
}
