// Today's session before it starts (BadgeFit): the exercises as pictures, fitted to 45 minutes
// with rests that suit each one (lib/police/session-length.js). Swipe an exercise left to take it
// out for today; more time puts more back. Only today changes: the plan stays as it is.
import { useMemo, useRef, useState } from 'react'
import { EXIDX } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n-core.js'
import { CAPS, fitSession, sessionMinutes, restFor, restLabel } from '../lib/police/session-length.js'
import { Thumb } from './Media.jsx'
import Icon from './Icon.jsx'

const keyOf = e => `${e.rid || ''}:${e.id}`
const OPEN = 88

function Row({ e, onRemove }) {
  const [dx, setDx] = useState(0)
  const g = useRef(null)
  const ex = EXIDX[e.id]
  const reps = e.target?.mode === 'time' ? `${e.target.sec || 40} s` : e.target?.repsMin && e.target?.reps ? `${e.target.repsMin}-${e.target.reps}` : e.target?.reps || ''
  const down = ev => { g.current = { x: ev.clientX, y: ev.clientY, base: dx, axis: null } }
  const move = ev => {
    const s = g.current
    if (!s) return
    const mx = ev.clientX - s.x, my = ev.clientY - s.y
    if (!s.axis && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
    if (s.axis === 'x') setDx(Math.max(-OPEN * 1.4, Math.min(0, s.base + mx)))
  }
  const up = () => { const s = g.current; g.current = null; if (s?.axis === 'x') setDx(dx < -OPEN / 2 ? -OPEN : 0) }
  return <div className="sp-row">
    <button className="sp-del" onClick={() => onRemove(e)} tabIndex={dx ? 0 : -1} aria-label={'Remove ' + (ex ? exerciseNameFor(ex) : 'exercise')}><Icon name="trash" /></button>
    <div className="sp-fg" style={{ transform: `translateX(${dx}px)`, transition: g.current ? 'none' : 'transform .2s' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-nodrag>
      {ex ? <Thumb ex={ex} /> : <span className="sp-ph" />}
      <span className="sp-m"><b>{ex ? exerciseNameFor(ex) : e.id}</b><small>{e.sets.length} × {reps}{restFor(e) ? ` · rest ${restLabel(restFor(e))}` : ''}</small></span>
    </div>
  </div>
}

export default function SessionPreview({ entries, start, close, cap: cap0 = 45 }) {
  const [cap, setCap] = useState(cap0)
  const [removed, setRemoved] = useState(() => new Set())
  const list = useMemo(() => fitSession(entries, cap).filter(e => !removed.has(keyOf(e))), [entries, cap, removed])
  const remove = e => setRemoved(r => new Set(r).add(keyOf(e)))
  const go = () => { close(); start(list, cap) }
  return <div className="sp">
    <div className="sp-h">
      <b>{sessionMinutes(list)} min</b>
      <div className="sp-caps" role="tablist" aria-label="Time today">
        {CAPS.map(c => <button key={c.id} role="tab" aria-selected={cap === c.id} className={cap === c.id ? 'on' : ''} onClick={() => setCap(c.id)}>{c.label}</button>)}
      </div>
    </div>
    <div className="sp-list">{list.map(e => <Row key={keyOf(e)} e={e} onRemove={remove} />)}</div>
    {removed.size > 0 && <button className="sp-undo" onClick={() => setRemoved(new Set())}>Put them back</button>}
    <button className="sp-go" onClick={go} disabled={!list.length}>Start</button>
  </div>
}
