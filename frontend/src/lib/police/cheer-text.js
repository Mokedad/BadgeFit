// What Hayden's cheer bubble says (components/CheerBubble.jsx), from what the server kept for you
// (api/cheers.js): first names and a few words only.

const SYM = { love: '❤️', like: '👍', cheer: '💪', reply: '💬' }
export const cheerSym = kind => SYM[kind] || '💪'

/** "Sam cheered your win: Hit 7.4 on the beep test" */
export function cheerLine(c) {
  const who = c?.from || 'Someone'
  switch (c?.kind) {
    case 'love': return `${who} sent you a love`
    case 'like': return `${who} sent you a like`
    case 'reply': return `${who} replied to ${c.what || 'your post'}`
    default: return `${who} cheered ${c?.what || 'you on'}`
  }
}

/** Several at once read as one: the newest first, then "and 3 more". */
export function cheerSummary(list) {
  const items = (list || []).filter(Boolean)
  if (!items.length) return ''
  const last = items.at(-1)
  return items.length === 1 ? cheerLine(last) : `${cheerLine(last)}, and ${items.length - 1} more`
}

/** The text offered when sharing a win with the crew (components/ShareWin.jsx). */
export function winText({ kind, name, value, unit, pass, best, week, of } = {}) {
  if (kind === 'result') {
    const what = `${name}: ${value}${unit && unit !== 'level' ? ' ' + unit : ''}`
    return pass ? `Passed the ${name.toLowerCase()} standard! ${what}` : best ? `New best on the ${name.toLowerCase()}. ${what}` : `Logged my ${name.toLowerCase()}. ${what}`
  }
  if (kind === 'workout') return `Done for today: ${name}.${week ? ` Week ${week}${of ? ' of ' + of : ''}.` : ''} One step closer to the badge.`
  return String(name || '')
}
