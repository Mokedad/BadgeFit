// Reactions on a Community post (api/community.js REACTS): five, drawn in BadgeFit's own icons, each
// in its colour, the way people react on Instagram or Facebook. One each; tap another to change it.
import Icon from './Icon.jsx'

export const REACTIONS = [
  { id: 'love', label: 'Love', icon: 'heart', c: '#ff3b5c', fill: true },
  { id: 'fire', label: 'Fire', icon: 'flame', c: '#ff7a1a', fill: true },
  { id: 'strong', label: 'Strong', icon: 'dumbbell', c: '#e8a200' },
  { id: 'win', label: 'Win', icon: 'trophy', c: '#8b5cf6', fill: true },
  { id: 'wow', label: 'Wow', icon: 'sparkles', c: '#2f9bff', fill: true },
]
const BY = Object.fromEntries(REACTIONS.map(r => [r.id, r]))

/** One reaction as a small coloured disc. */
export function ReactIcon({ id, size = 22 }) {
  const r = BY[id] || BY.love
  return <span className={'rx' + (r.fill ? ' rx-fill' : '')} style={{ '--c': r.c, width: size, height: size }} aria-hidden="true"><Icon name={r.icon} /></span>
}

/** The five to pick from; the one you gave is lit. */
export function ReactBar({ mine, onPick }) {
  return <div className="rx-bar" role="group" aria-label="React">
    {REACTIONS.map(r => <button key={r.id} type="button" className={mine === r.id ? 'on' : ''} aria-pressed={mine === r.id} aria-label={r.label} onClick={() => onPick(r.id)}>
      <ReactIcon id={r.id} size={34} /><small>{r.label}</small></button>)}
  </div>
}

/** The top three kinds given, stacked, and how many reacted. */
export function ReactSummary({ reacts, total }) {
  const top = Object.entries(reacts || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)
  if (!total) return null
  return <span className="rx-sum" aria-label={`${total} ${total === 1 ? 'reaction' : 'reactions'}`}>
    <span className="rx-stack">{top.map(k => <ReactIcon key={k} id={k} size={20} />)}</span><b>{total}</b>
  </span>
}
