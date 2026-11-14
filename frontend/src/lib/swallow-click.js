// A press-and-hold that opens a sheet (Plan's exercise pictures, a workout's exercise numbers):
// the finger lifting a moment later is a tap, and it landed on the sheet's backdrop and closed the
// sheet at once. This swallows that one tap, for a short while after the hold.
export function swallowNextClick(ms = 900) {
  if (typeof document === 'undefined') return
  const eat = e => { e.stopPropagation(); e.preventDefault(); off() }
  const off = () => { document.removeEventListener('click', eat, true); clearTimeout(t) }
  const t = setTimeout(off, ms)
  document.addEventListener('click', eat, true)
}
