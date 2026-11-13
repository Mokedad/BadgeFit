// BadgeFit's runner: a clean pictogram for the run screens, in place of the 🏃 emoji. Faces the
// way the run goes (left to right); `lines` adds the gold speed marks behind him.
export default function RunnerIcon({ size = 64, lines = false, className = '' }) {
  return <svg className={'runner-ic ' + className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    {lines && <path d="M4 26h10M2 36h9M6 46h8" stroke="#f2b81a" strokeWidth="3.5" strokeLinecap="round" />}
    <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M37 20 L29 37" />
      <path d="M36 23 L45 28 L51 22" />
      <path d="M34 23 L25 27 L20 33" />
      <path d="M29 37 L40 44 L37 56" />
      <path d="M29 37 L22 47 L12 48" />
    </g>
    <circle cx="41" cy="11" r="6.5" fill="currentColor" />
  </svg>
}

/** The finish: a small chequered flag. */
export function FinishFlag({ size = 20 }) {
  return <svg className="finish-ic" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 2v17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="5" y="3" width="12" height="8" fill="#fff" />
    <path d="M5 3h3v2.7H5zM11 3h3v2.7h-3zM8 5.7h3v2.6H8zM14 5.7h3v2.6h-3zM5 8.3h3V11H5zM11 8.3h3V11h-3z" fill="#0b1a36" />
  </svg>
}
