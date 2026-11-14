// "Upload my own program" (BadgeFit, from Hayden's sheet or his words): a file from a trainer
// (text, Word or CSV) or pasted text, read into routines (lib/police/program-text.js), shown for a
// look, then added to the plan. "Make it my plan" puts its days on Home and Plan in place of the
// BadgeFit plan, which can be picked again under Plan any time; nothing is deleted.
import { useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { EXIDX } from '../lib/exercises.js'
import { findExercise } from '../lib/police/find-exercise.js'
import { exerciseNameFor } from '../lib/i18n.js'
import { parseProgramText, asPlanFile, weekFor } from '../lib/police/program-text.js'
import { fileText } from '../lib/police/doc-text.js'
import { parsePlan, mergePlan } from '../lib/plan-share.js'
import { endProgramme } from '../lib/programmes.js'
import { Switch } from './ui.jsx'
import Icon from './Icon.jsx'

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WHY = {
  pdf: 'A PDF cannot be read here yet. Open it, copy the text, and paste it below.',
  image: 'A photo cannot be read here yet. Type or paste the plan below.',
  unreadable: 'That file cannot be read here. Save it as text or Word, or paste it below.',
}

export default function ProgramUpload({ close }) {
  const unit = useStore(s => s.S.unit) || 'kg'
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [got, setGot] = useState(null)
  const [mine, setMine] = useState(true)
  const pick = useRef(null)
  const read = (words, title = '') => {
    const p = parseProgramText(words, findExercise, { title })
    if (!p.routines.length) { setNote(p.read ? 'Hayden found exercises but none he knows. Check the names, or paste it below.' : 'Hayden could not find exercises with sets and reps in that. Each one on its own line, like "Bench press 4x8".'); setGot(null); return }
    setNote(''); setGot({ ...p, week: weekFor(p) })
  }
  const onFile = async ev => {
    const f = ev.target.files?.[0]; ev.target.value = ''
    if (!f) return
    try { read(await fileText(f), f.name.replace(/\.[a-z0-9]+$/i, '')) } catch (e) { setNote(WHY[e?.code] || WHY.unreadable); setGot(null) }
  }
  const add = () => {
    const bundle = parsePlan(asPlanFile(got, unit), unit)
    useStore.getState().update(s => {
      if (mine) endProgramme(s)
      mergePlan(s, bundle, { schedule: mine })
      if (mine) s.police = { ...(s.police || {}), planChoice: 'upload' }
    })
    close()
    useUI.getState().toast(mine ? 'Your program is your plan now' : 'Added to Plan')
    location.hash = mine ? '#/police?tab=plan' : '#/plan'
  }
  const dayOf = id => Object.entries(got?.week || {}).find(([, v]) => v[0] === id)?.[0]

  if (got) return <div className="pu">
    <h3>Your program</h3>
    <p className="muted small">{got.routines.length} {got.routines.length === 1 ? 'day' : 'days'} · {got.routines.reduce((n, r) => n + r.ex.length, 0)} exercises</p>
    <div className="pu-days">{got.routines.map(r => <div key={r.id} className="pu-day">
      <div className="pu-dh"><b>{r.name}</b>{dayOf(r.id) != null && <span>{DAY[dayOf(r.id)]}</span>}</div>
      {r.ex.map((e, i) => <div key={i} className="pu-ex"><span>{exerciseNameFor(EXIDX[e.id])}</span><small>{e.sec ? `${e.sets} × ${e.sec} s` : `${e.sets} × ${e.repsMin ? e.repsMin + '-' : ''}${e.reps}`}{e.weight ? ` · ${e.weight} ${unit}` : ''}</small></div>)}
    </div>)}</div>
    {got.unknown.length > 0 && <p className="pu-left small">Left out, not in the library: {got.unknown.join(', ')}</p>}
    <label className="pu-mine"><span><b>Make it my plan</b><small>Its days go on Home and Plan, in place of the BadgeFit plan</small></span><Switch checked={mine} onChange={setMine} /></label>
    <button className="pf-go" onClick={add}>Add to my plan</button>
    <button className="btn ghost dim" onClick={() => setGot(null)}>Back</button>
  </div>

  return <div className="pu">
    <h3>Upload your program</h3>
    <p className="muted small">A file from your trainer (text, Word or CSV), or paste it. Hayden puts it into your plan.</p>
    <input ref={pick} type="file" accept=".txt,.csv,.md,.docx,.json,text/plain,text/csv" hidden onChange={onFile} />
    <button className="pf-go" onClick={() => pick.current?.click()}><Icon name="download" /> Choose a file</button>
    <textarea className="pu-paste" rows={6} placeholder={'Or paste it here, one exercise a line:\nDay 1 - Push\nBench press 4x8\nOverhead press 3x10'} value={text} onChange={e => setText(e.target.value)} />
    {text.trim() && <button className="btn" onClick={() => read(text)}>Read it</button>}
    {note && <p className="pu-left small">{note}</p>}
  </div>
}
