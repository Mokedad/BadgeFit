// The BadgeFit mark: a police-style shield in navy with a gold rim and a gold star. Drawn here so
// it is crisp at every size and the same on every device (an emoji is not).
export default function BadgeLogo({ size = 40, className = '' }) {
  return <svg className={'bf-logo ' + className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 3 41 9v13c0 11-7.3 19.2-17 23C14.3 41.2 7 33 7 22V9z" fill="#0d1b33" stroke="#ffc629" strokeWidth="2.6" strokeLinejoin="round" />
    <path d="M24 12.5l3.1 6.4 7 .9-5.1 4.9 1.3 6.9L24 28.3l-6.3 3.3 1.3-6.9-5.1-4.9 7-.9z" fill="#ffc629" />
    <path d="M14 36.5c3 2.7 6.3 4.6 10 5.9 3.7-1.3 7-3.2 10-5.9" fill="none" stroke="#ffc629" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
  </svg>
}
