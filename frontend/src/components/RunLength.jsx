// How long a run lasts (BadgeFit): one wheel of minutes, 5 to 120, or Open (no set time: the clock
// counts up until you tap Finish). From a run's minutes on Plan's day card and from the run screen
// before Start. lib/police/runs.js fitRun makes the run fit what was picked.
import { useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { WheelColumn } from './DurationWheel.jsx'
import Icon from './Icon.jsx'

export const RUN_MIN = 5, RUN_MAX = 120
const clampMin = n => Math.max(RUN_MIN, Math.min(RUN_MAX, Math.round(Number(n) || 30)))

export function RunLength({ close, minutes, open, planned, onPick }) {
  const start = clampMin(minutes || planned)
  const [v, setV] = useState(start)
  const row = useRef(null)
  const done = () => { const m = RUN_MIN + (row.current ? row.current() : v - RUN_MIN); close(); onPick(m === planned ? null : m) }
  return <div className="rl">
    <h3>How long?</h3>
    <div className="dw rl-wheel" data-nodrag="" dir="ltr">
      <span className="dw-band" aria-hidden="true" />
      <WheelColumn count={RUN_MAX - RUN_MIN + 1} index={v - RUN_MIN} onPick={i => setV(RUN_MIN + i)} step={5} rowRef={row}
        label="Minutes" unit="min" format={i => String(RUN_MIN + i)} valueText={`${v} minutes`} />
    </div>
    <div className="rl-acts">
      <button type="button" className={'rr-chip rl-open' + (open ? ' on' : '')} onClick={() => { close(); onPick('open') }}>
        <Icon name="stopwatch" /> Open · count up</button>
      {planned > 0 && (open || minutes !== planned) && <button type="button" className="rr-chip" onClick={() => { close(); onPick(null) }}>
        <Icon name="reset" /> Plan's {planned} min</button>}
    </div>
    <button type="button" className="calm-go rl-done" onClick={done}>Done</button>
  </div>
}

/**
 * Asks how long: `minutes` now (the run as it stands), `open` when it is open now, `planned` the
 * plan's own minutes. `onPick(v)` gets minutes, 'open', or null for the plan's time again.
 */
export function runLengthSheet({ minutes, open = false, planned, onPick }) {
  useUI.getState().openSheet(close => <RunLength close={close} minutes={minutes} open={open} planned={planned} onPick={onPick} />)
}
