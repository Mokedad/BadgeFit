// BadgeFit's rep-range rule live in the workout (lib/police/set-advice.js liveAdvice), from the
// very first session: after each work set it says move up, stay or move down, and puts that
// weight on the next set still to do, once per finished set, so a weight typed over it stays.
// Shown for a BadgeFit member on every weighted exercise: its own rep range, or one built from
// its planned reps (workout-voice.js rangeOf: 8 planned is 6-8). English only.
import { useEffect, useRef } from 'react'
import { liveAdvice } from '../lib/police/set-advice.js'
import { fmtNum } from '../lib/format.js'
import { rangeOf } from '../lib/police/workout-voice.js'

export default function RepRangeCoach({ entry, unit, onApply }) {
  const range = rangeOf(entry)
  const a = liveAdvice(entry?.sets, range, unit)
  const applied = useRef(new Set())
  const key = a && !a.firstTime ? `${a.lastIdx}:${a.reps}:${a.weight}` : null

  useEffect(() => {
    if (!key || a.nextIdx == null || applied.current.has(key)) return
    applied.current.add(key)
    const next = entry.sets[a.nextIdx]
    if (next && Number(next.w) !== a.advice.weight) onApply(a.nextIdx, a.advice.weight)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!a) return null
  const w = v => `${fmtNum(v)} ${unit}`
  if (a.firstTime) return <div className="rrc first">🎯 Range {range.min}-{range.max}: pick a weight you can lift {range.min}-{range.max} times. Log the set and I set the next one.</div>
  const { action, weight } = a.advice
  const text = action === 'up' ? `⬆️ ${a.reps} reps: top of the range. Move up to ${w(weight)}`
    : action === 'down' ? `⬇️ ${a.reps} reps: under the range. Move down to ${w(weight)}`
      : `➡️ ${a.reps} reps: in the range. Stay at ${w(weight)}, chase ${range.max}`
  return <div className={'rrc ' + action}>{text}{a.nextIdx == null ? ' next time.' : ' next set.'}</div>
}
