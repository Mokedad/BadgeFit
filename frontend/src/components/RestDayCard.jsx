import { useMemo } from 'react'
import Icon from './Icon.jsx'
import CardHead from './CardHead.jsx'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { fatigueOf, LB_TO_KG } from '../lib/recovery.js'
import { restDayCard } from '../lib/rest-day.js'
import { lastBW } from '../lib/history.js'

// The rest-day card on Home (lib/rest-day.js): folded, one line; open, what to eat today and how
// to move if you still want to. Put away for the day with the ×, off in Settings → Look & Home.
// Whether it is open is remembered per profile (S.restDayOpen), like the Challenges fold.

export default function RestDayCard({ S }) {
  const today = todayISO()
  const card = useMemo(() => {
    if (S.restDay === false || S.restDayHide === today) return null
    const now = Date.now()
    const bw = lastBW(S)
    const bodyweightKg = bw && bw.w > 0 ? (S.unit === 'lb' ? bw.w * LB_TO_KG : bw.w) : undefined
    return restDayCard(S, { now, today, bw, fatigue: fatigueOf(S.workouts, now, { bodyweightKg, unit: S.unit }) })
  }, [S.workouts, S.restDay, S.restDayHide, S.active, S.week, S.dayPlan, S.queue, S.routines, S.unit, S.coach?.profile, S.bodyweight, today]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!card) return null
  const open = S.restDayOpen !== false
  const toggle = () => useStore.getState().update(s => { s.restDayOpen = !open })
  const dismiss = () => useStore.getState().update(s => { s.restDayHide = today })
  const sub = card.level === 'beginner' ? t('What to eat today, and easy ways to move.') : t('Fuel your recovery, and keep any training light.')
  return <div className="card rest-day-card" data-move={card.move.kind}>
    <CardHead icon="moon" tint="var(--purple)" eyebrow={t('Rest day')} title={t('Recover well today')} sub={sub}
      toggle={{ expanded: open, onToggle: toggle }}
      action={<button type="button" className="iconbtn" onClick={dismiss} aria-label={t('Hide for today')}><Icon name="xmark" /></button>} />
    {open && <div className="card-head-indent rest-day-body">
      <div className="lbl2 rest-day-h">{t('What to eat')}</div>
      <ul className="rest-day-list">
        {card.food.map(f => <li key={f.label}><b>{f.label}</b> {f.text}</li>)}
      </ul>
      <div className="lbl2 rest-day-h">{card.move.kind === 'starter' ? t('Want to move?') : t('Based on your recovery')}</div>
      <ul className="rest-day-list">
        {card.move.lines.map(l => <li key={l}>{l}</li>)}
      </ul>
    </div>}
  </div>
}
