import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate, todayISO } from '../lib/format.js'
import { LB_TO_KG } from '../lib/recovery.js'
import Icon from '../components/Icon.jsx'
import { Button, Section, Row, SelectRow, TextField } from '../components/ui.jsx'
import { DEFAULT_FT, STANDARDS, TESTS, fitnessStatus, standardOf, resultsOf, testInfo, focusText, fmtTest, saveResult, removeResult } from '../lib/pct.js'
import { confirmSheet } from '../sheets.jsx'

// The police fitness test (lib/pct.js, api/coach/core/fitness-test.js): the standard, where you
// stand against it, logging a test day, and when to test again. The Coach builds plans toward
// the gaps shown here.

export default function FitnessTest() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const toast = useUI(s => s.toast)
  const ft = S.fitnessTest || DEFAULT_FT
  const today = todayISO()
  const st = useMemo(() => fitnessStatus(ft, today), [ft, today])
  const std = standardOf(ft)
  const results = resultsOf(ft)
  const lb = S.unit === 'lb'
  const [logging, setLogging] = useState(false)
  const [form, setForm] = useState({})
  const setFt = patch => update(s => { s.fitnessTest = { ...DEFAULT_FT, ...(s.fitnessTest || {}), ...patch } })

  const save = () => {
    const bw = Number(form.bw) > 0 ? (lb ? Number(form.bw) * LB_TO_KG : Number(form.bw)) : null
    let ok = false
    update(s => { ok = saveResult(s, form.d || today, { ...form, bw }) })
    if (ok) { setLogging(false); setForm({}); toast(t('Results saved')) } else toast(t('Enter at least one result.'))
  }

  return <>
    <div className="hdr"><button className="iconbtn" data-back="/home" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('Fitness test')}</h1>
        <div className="sub">{std?.name || t('Your own standard')}</div></div></div>

    <div className="card pct-status">
      <div className="pct-next">
        {st.due ? <b>{st.count ? t('Time to test again') : t('Do your first test to set a baseline')}</b>
          : <b>{t('Next test {0}', fmtDate(st.nextTest))}</b>}
        {st.passed && <span className="pct-pass">{t('You meet the standard')}</span>}
      </div>
      {st.tests.map(x => {
        const info = testInfo(x.test)
        return <div key={x.test} className="pct-row" data-pass={x.pass ? '1' : '0'}>
          <span className="pct-ic" aria-hidden="true"><Icon name={x.pass ? 'checkCircle' : x.have == null ? 'flag' : 'xmark'} /></span>
          <span className="grow"><span className="pct-name">{info.name}</span>
            <span className="pct-sub">{t('Need {0}', fmtTest(x.test, x.need))}{x.trend === 'up' ? ' · ' + t('improving') : x.trend === 'down' ? ' · ' + t('slipping') : ''}</span></span>
          <span className="pct-have">{fmtTest(x.test, x.have)}</span>
        </div>
      })}
      {st.weight && <div className="pct-row" data-pass={st.weight.toLose > 0 ? '0' : '1'}>
        <span className="pct-ic" aria-hidden="true"><Icon name="scale" /></span>
        <span className="grow"><span className="pct-name">{t('Body weight')}</span>
          <span className="pct-sub">{t('Goal {0}', fmtW(st.weight.goal, lb))}</span></span>
        <span className="pct-have">{fmtW(st.weight.have, lb)}</span>
      </div>}
    </div>

    {st.gaps.some(g => g.have != null) && <Section title={t('What to work on')}
      footer={t('The Coach builds your plan around these until your next test.')}>
      {st.gaps.filter(g => g.have != null).slice(0, 3).map(g => <Row key={g.test} icon="target" iconTint="var(--orange)"
        title={testInfo(g.test).name} subtitle={focusText(g.focus)} />)}
      {st.weight?.toLose > 0 && <Row icon="scale" iconTint="var(--orange)" title={t('Body weight')}
        subtitle={t('{0} to lose: steady cardio and a small calorie deficit', fmtW(st.weight.toLose, lb))} />}
    </Section>}

    <div style={{ padding: '0 16px', marginBottom: 18 }}>
      {!logging ? <Button variant="primary" icon="plus" onClick={() => { setForm({ d: today }); setLogging(true) }}>{t('Log test results')}</Button>
        : <div className="card pct-form">
          <label className="pct-field"><span>{t('Date')}</span>
            <input type="date" className="timef" value={form.d || today} max={today} onChange={e => setForm(f => ({ ...f, d: e.target.value }))} /></label>
          {Object.keys(std?.targets || {}).map(k => {
            const info = testInfo(k)
            return <label key={k} className="pct-field"><span>{info.name}<small>{info.hint}</small></span>
              <TextField inputMode="decimal" value={form[k] ?? ''} placeholder={fmtTest(k, std.targets[k])}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></label>
          })}
          <label className="pct-field"><span>{t('Body weight')}<small>{lb ? 'lb' : 'kg'}</small></span>
            <TextField inputMode="decimal" value={form.bw ?? ''} onChange={e => setForm(f => ({ ...f, bw: e.target.value }))} /></label>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <Button variant="primary" onClick={save}>{t('Save')}</Button>
            <Button onClick={() => setLogging(false)}>{t('Cancel')}</Button>
          </div>
        </div>}
    </div>

    <Section title={t('Settings')}>
      <SelectRow icon="shield" iconTint="var(--blue)" title={t('Standard')} value={STANDARDS[ft.standard] ? ft.standard : 'custom'}
        // Your own standard starts from the one you had, so there is something to edit.
        onChange={v => setFt(v === 'custom' && !ft.targets ? { standard: v, targets: { ...(std?.targets || {}) } } : { standard: v })}
        options={[...Object.entries(STANDARDS).map(([id, s]) => ({ value: id, label: s.name })), { value: 'custom', label: t('Your own standard') }]} />
      <SelectRow icon="calendar" iconTint="var(--purple)" title={t('Test again every')} value={String(st.every)}
        onChange={v => setFt({ every: Number(v) })}
        options={[{ value: '7', label: t('Weekly') }, { value: '14', label: t('2 weeks') }]} />
      <Row icon="scale" iconTint="var(--green)" title={t('Goal weight')} subtitle={t('Optional. The Coach adds cardio when you are above it.')}>
        <TextField inputMode="decimal" style={{ width: 80 }} value={ft.goalWeight ? String(Math.round((lb ? ft.goalWeight / LB_TO_KG : ft.goalWeight) * 10) / 10) : ''}
          placeholder={lb ? 'lb' : 'kg'}
          onChange={e => { const n = Number(e.target.value.replace(',', '.')); setFt({ goalWeight: n > 0 ? (lb ? n * LB_TO_KG : n) : null }) }} />
      </Row>
    </Section>

    <Section title={t('Targets')} footer={t('Grip strength is not tracked: it needs a dynamometer most people do not have.')}>
      {TESTS.map(k => {
        const info = testInfo(k)
        const own = ft.targets?.[k]
        return <Row key={k} title={info.name} subtitle={info.hint}>
          <TextField inputMode="decimal" style={{ width: 80 }} value={own ?? ''} placeholder={String(STANDARDS[ft.standard]?.targets?.[k] ?? '')}
            onChange={e => setFt({ targets: { ...(ft.targets || {}), [k]: e.target.value || undefined } })} />
        </Row>
      })}
    </Section>

    {results.length > 0 && <Section title={t('History')}>
      {[...results].reverse().map(r => <Row key={r.d} title={fmtDate(r.d)}
        subtitle={TESTS.filter(k => r[k] != null).map(k => `${testInfo(k).name} ${fmtTest(k, r[k])}`).join(' · ')}>
        <button type="button" className="iconbtn" aria-label={t('Delete')} onClick={() => confirmSheet({
          title: t('Delete this test?'), confirmText: t('Delete'), danger: true,
          onConfirm: () => update(s => removeResult(s, r.d)),
        })}><Icon name="trash" /></button>
      </Row>)}
    </Section>}
    <div style={{ height: 24 }} />
  </>
}

const fmtW = (kg, lb) => `${Math.round((lb ? kg / LB_TO_KG : kg) * 10) / 10} ${lb ? 'lb' : 'kg'}`
