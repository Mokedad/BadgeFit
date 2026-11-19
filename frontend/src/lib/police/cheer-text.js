// What Hayden's cheer bubble says (components/CheerBubble.jsx), from what the server kept for you
// (api/cheers.js): first names and a few words only.

const SYM = { love: '❤️', like: '👍', cheer: '💪', reply: '💬', training: '🏃', best: '⭐', plan: '📋', follow: '🔔', post: '📣' }
export const cheerSym = kind => SYM[kind] || '💪'

/** "Sam cheered your win: Hit 7.4 on the beep test" */
export function cheerLine(c) {
  const who = c?.from || 'Someone'
  switch (c?.kind) {
    case 'love': return `${who} sent love`
    case 'like': return `${who} sent a like`
    case 'fire': return `${who} sent fire${c.what ? ' on ' + c.what : ''}`
    case 'strong': return `${who} sent strong${c.what ? ' on ' + c.what : ''}`
    case 'win': return `${who} called it a win${c.what ? ': ' + c.what : ''}`
    case 'wow': return `${who} sent wow${c.what ? ' on ' + c.what : ''}`
    case 'training': return `${who} is training now`
    case 'best': return `${who} picked your answer as the best`
    case 'plan': return `${who} follows your plan${c.what ? ': ' + c.what : ''}`
    case 'follow': return `${who} followed you`
    case 'post': return `${who} posted${c.what ? ': ' + c.what : ''}`
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

/** The text offered when sharing a win to Community (components/ShareWin.jsx). */
export function winText({ kind, name, value, unit, pass, best, week, of } = {}) {
  if (kind === 'result') {
    const what = `${name}: ${value}${unit && unit !== 'level' ? ' ' + unit : ''}`
    return pass ? `Passed the ${name.toLowerCase()} standard! ${what}` : best ? `New best on the ${name.toLowerCase()}. ${what}` : `Logged my ${name.toLowerCase()}. ${what}`
  }
  if (kind === 'workout') return `Done for today: ${name}.${week ? ` Week ${week}${of ? ' of ' + of : ''}.` : ''} One step closer to the badge.`
  return String(name || '')
}
