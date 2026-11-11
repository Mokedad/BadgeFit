import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import CardHead from './CardHead.jsx'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { todayISO } from '../lib/format.js'
import { fitnessStatus, testInfo, fmtTest } from '../lib/pct.js'

// The police fitness test on Home (views/FitnessTest.jsx): before it is set up, an invitation to
// track it; after, when the next test is and the biggest gap, or that a test is due. The × on
// the invitation puts it away for good (S.fitnessTestCard = false); the screen stays reachable
// from Settings.

export default function FitnessTestCard({ S }) {
  const nav = useNavigate()
  const today = todayISO()
  const ft = S.fitnessTest
  const st = useMemo(() => (ft ? fitnessStatus(ft, today) : null), [ft, today])
  if (S.fitnessTestCard === false) return null
  const open = { onClick: () => nav('/fitness-test') }
  if (!st) {
    const hide = () => useStore.getState().update(s => { s.fitnessTestCard = false })
    return <div className="card tap-host fitness-card">
      <CardHead icon="shield" tint="var(--blue)" eyebrow={t('Fitness test')} title={t('Training for the police fitness test?')}
        sub={t('Log your results and the Coach builds your plan around what to improve.')} open={open}
        action={<button type="button" className="iconbtn" onClick={hide} aria-label={t('Hide')}><Icon name="xmark" /></button>} />
    </div>
  }
  const gap = st.gaps.find(g => g.have != null)
  const title = st.due ? (st.count ? t('Time to test again') : t('Do your first test to set a baseline'))
    : st.passed ? t('You meet the standard')
      : st.daysToNext === 1 ? t('Next test tomorrow') : t('Next test in {0} days', st.daysToNext)
  const sub = gap ? t('{0}: {1} of {2}', testInfo(gap.test).name, fmtTest(gap.test, gap.have), fmtTest(gap.test, gap.need))
    : st.due ? t('Log your results to see what to work on.') : null
  return <div className="card tap-host fitness-card" data-due={st.due ? '1' : '0'}>
    <CardHead icon="shield" tint={st.due ? 'var(--orange)' : 'var(--blue)'} eyebrow={st.standard || t('Fitness test')} title={title} sub={sub} open={open} />
  </div>
}
