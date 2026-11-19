// The bell, Instagram's way (views/Community.jsx BellSheet): what people did for you, newest first.
//  - Featured: the post or comment of yours the most people reacted to (2 or more), if any;
//  - then Today, This week and Earlier: reactions from one person in a row as one line with their
//    reactions stacked, several new followers as one line, replies and the rest one line each.
// Pure, over the list GET /api/cheers/history gives: { id, kind, from, who, colour, at, what, ref }.
const DAY = 86400000
// A cheer on a post reads as a love; a like too.
export const RX_KIND = { love: 'love', like: 'love', cheer: 'love', fire: 'fire', strong: 'strong', win: 'win', wow: 'wow' }

const dayOf = ms => new Date(ms).toISOString().slice(0, 10)

/** Your most-reacted post or comment, when 2 or more people reacted to it; else null. */
export function featuredOf(list) {
  const by = new Map()
  for (const c of list) {
    if (!RX_KIND[c.kind] || !c.ref || !c.what) continue
    const f = by.get(c.ref) || { ref: c.ref, what: c.what, people: [], kinds: [], at: 0 }
    if (c.who && !f.people.some(p => p.who === c.who)) f.people.push({ who: c.who, from: c.from, colour: c.colour })
    if (!f.kinds.includes(RX_KIND[c.kind])) f.kinds.push(RX_KIND[c.kind])
    f.at = Math.max(f.at, c.at || 0)
    by.set(c.ref, f)
  }
  const best = [...by.values()].sort((a, b) => b.people.length - a.people.length || b.at - a.at)[0]
  return best && best.people.length >= 2 ? best : null
}

/** One section's rows: reactions in a row from one person stacked; 2+ follows as one line. */
export function rowsOf(list) {
  const out = []
  for (const c of list) {
    const k = RX_KIND[c.kind]
    const prev = out.at(-1)
    if (k && prev?.kinds && prev.who && prev.who === c.who) { if (!prev.kinds.includes(k)) prev.kinds.push(k); prev.n++; continue }
    out.push(k ? { ...c, kinds: [k], n: 1 } : { ...c })
  }
  const follows = out.filter(r => r.kind === 'follow')
  if (follows.length < 2) return out
  const first = out.indexOf(follows[0])
  const rest = out.filter(r => r.kind !== 'follow')
  rest.splice(Math.min(first, rest.length), 0, { id: 'follows-' + follows[0].id, kind: 'follows', people: follows, at: follows[0].at })
  return rest
}

/** The whole bell: { featured, sections: [{ title, rows }] }, empty sections left out. */
export function buildBell(list, now = Date.now()) {
  const items = (list || []).filter(Boolean).slice().sort((a, b) => (b.at || 0) - (a.at || 0))
  const today = dayOf(now)
  const buckets = [['Today', c => dayOf(c.at) === today], ['This week', c => now - c.at < 7 * DAY], ['Earlier', () => true]]
  const left = [...items]
  const sections = []
  for (const [title, test] of buckets) {
    const here = left.filter(test)
    for (const c of here) left.splice(left.indexOf(c), 1)
    if (here.length) sections.push({ title, rows: rowsOf(here) })
  }
  return { featured: featuredOf(items), sections }
}
