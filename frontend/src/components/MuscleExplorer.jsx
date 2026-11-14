import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { BODYPARTS, allExercises, equipmentOf, searchExercises } from '../lib/exercises.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum, exCount } from '../lib/format.js'
import { MUSCLES, MUSCLE_NAME, musclesOf, loadOfWorkouts, muscleBalanceWindow } from '../lib/muscles.js'
import { weekStartOf } from '../lib/format.js'
import { t, exerciseNameFor, exerciseNameClass, eqName } from '../lib/i18n.js'
import BodyMap from './BodyMap.jsx'
import '../police.css'
import { Thumb } from './Media.jsx'
import Icon from './Icon.jsx'
import ExerciseViewToggle from './ExerciseViewToggle.jsx'
import { Button } from './ui.jsx'
import { useAutoMore } from '../lib/use-auto-more.js'
import { favIds, isFav, sortFavouritesFirst } from '../lib/favourites.js'

const FAV = '☆'

// One explorer for the Library and every catalogue picker. Supplying `onPick` turns
// a result into a selection; without it the explorer behaves like the normal Library.
const TRAINED_STEPS = [{ at: 1, level: 1 }, { at: 4, level: 2 }, { at: 8, level: 3 }, { at: 12, level: 4 }]

export default function MuscleExplorer({ onPick, onDetail, onPlan, pickIcon = 'plus', initial = null }) {
  const S = useStore(s => s.S)
  // Effective work sets per muscle this week (lib/muscles.js), from finished workouts.
  const weekLoad = useMemo(() => loadOfWorkouts(muscleBalanceWindow(S.workouts, 7, Date.now(), undefined, weekStartOf(S))), [S.workouts]) // eslint-disable-line react-hooks/exhaustive-deps
  const trainedCount = MUSCLES.filter(m => (weekLoad[m] || 0) >= 1).length
  const [selected, setSelected] = useState(initial)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const [shown, setShown] = useState(40)
  const [showAll, setShowAll] = useState(false)   // ignore the active equipment profile for this session
  const moreRef = useAutoMore(() => setShown(s => s + 40))
  // Same rule as the Library and the picker: the active equipment profile narrows the catalogue
  // (and the per-muscle counts) unless the user asks for everything.
  const profile = activeProfile(S)
  const catalog = useMemo(() => {
    const all = allExercises(S)
    return (profile && !showAll) ? all.filter(e => exAvailable(S, e)) : all
  }, [S.customEx, S.equipFilterOn, S.activeEquipId, S.equipProfiles, showAll])
  const counts = useMemo(() => Object.fromEntries(MUSCLES.map(m => [m,
    catalog.filter(e => musclesOf(e)[m]).length
  ])), [catalog])
  const pick = muscle => { setSelected(muscle === selected ? null : muscle); setEq(''); setShown(40) }
  const targeted = selected ? catalog.filter(e => musclesOf(e)[selected]) : []
  // The picker's Favourites chip (#669), here for the chosen muscle: '☆' in place of a body part.
  const favOn = bp === FAV
  const favHere = targeted.filter(e => isFav(S, e.id)).length
  const base = searchExercises(targeted.filter(e => favOn ? isFav(S, e.id) : (!bp || e.bp === bp)), q)
  const eqOpts = equipmentOf(base)
  const eqOn = eqOpts.includes(eq) ? eq : ''
  // Favourites float to the top of whatever the filters left (issue #6), the rest keeps its order.
  const exercises = sortFavouritesFirst(eqOn ? base.filter(e => e.eq === eqOn) : base, S)
  const choose = ex => onPick ? onPick(ex) : onDetail(ex)
  // The live count and the × of the Library's search (#338): the count while a search or a
  // filter narrows the muscle's list, the × while there is text.
  const narrowed = !!(q.trim() || bp || eqOn)

  return <>
    {profile && <div className="small dim row" style={{ margin: '-4px 2px 10px', gap: 6, alignItems: 'center' }}>
      <Icon name="kettlebell" style={{ fontSize: 'var(--fs-footnote)' }} />
      {showAll ? t('Showing all equipment') : t('Showing what you have in "{0}"', profile.name)}
      <button className="chip nocap" style={{ marginInlineStart: 'auto', padding: '3px 10px', fontSize: 'var(--fs-caption)' }} onClick={() => { setShowAll(v => !v); setEq(''); setShown(40) }}>
        {showAll ? t('Filter by "{0}"', profile.name) : t('Show all equipment')}
      </button>
    </div>}
    <div className="card">
      {/* Your own body this week (BadgeFit): green where you trained, brighter for more work sets,
          empty where nothing was done yet. Fixed steps, so a light week reads as light. */}
      <div className="bm-trained-h"><b>Your muscles this week</b><span>{trainedCount} of {MUSCLES.length} trained</span></div>
      <BodyMap className="tappable bm-trained" body={S.body} selected={selected} onMuscle={pick} load={weekLoad} thresholds={TRAINED_STEPS} />
      <div className="bm-trained-legend"><span><i className="l0" />Not yet</span><span><i className="l1" />1-3 sets</span><span><i className="l2" />4-7</span><span><i className="l3" />8-11</span><span><i className="l4" />12+ strong</span></div>
      <div className="chips" style={{ marginTop: 10 }}>
        {MUSCLES.map(m => <button key={m} className={'chip' + (selected === m ? ' on' : '')}
          aria-pressed={selected === m} onClick={() => pick(m)}>
          {t(MUSCLE_NAME[m])} <span className="dim">{counts[m]}</span>
        </button>)}
      </div>
    </div>

    {!selected && onPick && <div className="empty"><div className="ico"><Icon name="figureStrength" /></div>{t('Choose a muscle to see exercises that train it.')}</div>}

    {selected && <>
      <div className="row between" style={{ margin: '2px 0 10px' }}>
        <h4 className="sec" style={{ margin: 0 }}>{t('Exercises for {0}', t(MUSCLE_NAME[selected]))}</h4>
        <Button size="sm" variant="ghost" onClick={() => pick(selected)}>{t('Clear selection')}</Button>
      </div>
      <div className="search-row" style={{ marginBottom: 10 }}><div className={'search' + (narrowed ? ' has-count' : '') + (q ? ' has-clear' : '')}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input className="input" placeholder={t('Search…')} value={q} onChange={e => { setQ(e.target.value); setShown(40) }} />
        {narrowed && <span className="search-count" role="status" aria-label={exCount(exercises.length)}>{fmtNum(exercises.length)}</span>}
        {q && <button className="clear" onClick={() => { setQ(''); setShown(40) }} aria-label={t('Clear')}><Icon name="xmark" /></button>}
      </div><ExerciseViewToggle /></div>
      {/* Changing body part keeps the equipment filter (issue #71, same rule as Library): the
          eqOn fallback above drops it only for this view if the new body part has nothing under
          it, without forgetting the choice. "All" clears it, since it spans every body part. */}
      <div className="chips" style={{ marginBottom: eqOpts.length > 1 ? 8 : 12 }}>
        {favIds(S).length > 0 && <button className={'chip' + (favOn ? ' on' : '')} onClick={() => { setBp(FAV); setEq(''); setShown(40) }}><Icon name="starFill" className="fav-star" />{t('Favourites')} ({favHere})</button>}
        <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>{t('All')}</button>
        {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setShown(40) }}>{t(b)}</button>)}
      </div>
      {eqOpts.length > 1 && <div className="chips" style={{ marginBottom: 12 }}>
        <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
        {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{eqName(x)}</button>)}
      </div>}
      <div className={'list' + (S.exerciseView === 'cards' ? ' ex-grid' : '')}>
        {exercises.slice(0, shown).map(e => {
          const best = bestWeightFor(S, e.id)
          const primary = musclesOf(e)[selected] === 1
          // The name is the row's button, stretched over it; Plan is its sibling (card dismiss pass).
          return <div key={e.id} className="item tap-host">
            <Thumb ex={e} />
            <button type="button" className="grow item-open tap-main" onClick={() => choose(e)}><span className={`tt ${exerciseNameClass(e)}`}>{isFav(S, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</span><span className="ss">{t(primary ? 'Primary target' : 'Also trains')} · <span className="capitalize">{t(MUSCLE_NAME[e.tg] || e.tg || e.bp)} · {eqName(e.eq)}</span></span></button>
            {onPick ? <Icon name={pickIcon} className="chev" /> : <>
              {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
              <Button size="sm" variant="tinted" icon="plus" onClick={() => onPlan(e)}>{t('Plan')}</Button>
            </>}
          </div>
        })}
        {exercises.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
      </div>
      {exercises.length > shown && <><div style={{ height: 10 }} /><Button ref={moreRef} onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
    </>}
  </>
}
