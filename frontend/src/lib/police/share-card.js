// The BadgeFit share card: a picture of a finished session for a story or a message, made on the
// phone and handed to the phone's own share sheet (Instagram, Messages, WhatsApp, anything there).
// No account is linked and nothing is uploaded by BadgeFit. It carries no map and no place: what
// the session was, how long, and the countdown to the test.
import { makeCanvas, toPng, shareImage } from '../share-image.js'
import { BRAND } from './brand.js'

/** The card's words, from a finished session. Pure. */
export function cardModel({ title, minutes = null, km = null, daysToTest = null, testName = 'PCT', week = null, weeks = null } = {}) {
  const facts = []
  if (minutes > 0) facts.push(`${Math.round(minutes)} min`)
  if (km > 0) facts.push(`${Math.round(km * 10) / 10} km`)
  const name = String(testName || 'PCT').trim() || 'PCT'
  return {
    head: 'Session done',
    title: String(title || 'Training').trim().slice(0, 60),
    facts: facts.join('  ·  '),
    count: daysToTest != null && daysToTest >= 0 ? String(daysToTest) : null,
    countLabel: daysToTest === 0 ? `${name} today` : daysToTest === 1 ? `day to my ${name}` : `days to my ${name}`,
    week: week && weeks ? `Week ${week} of ${weeks}` : null,
    foot: BRAND.site || 'badgefit.com.au',
  }
}

const NAVY = '#0c1730', GOLD = '#ffc629', FONT = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

/** Breaks a title into lines that fit `max` pixels. */
export function wrapLines(text, measure, max, limit = 3) {
  const out = []
  let line = ''
  for (const word of String(text).split(/\s+/)) {
    const next = line ? line + ' ' + word : word
    if (line && measure(next) > max) { out.push(line); line = word } else line = next
  }
  if (line) out.push(line)
  return out.slice(0, limit)
}

/** The card as a PNG (1080 × 1920, a story), or null where there is no canvas. */
export async function cardImage(model) {
  const W = 1080, H = 1920
  const c = makeCanvas(W, H, FONT)
  if (!c) return null
  const { ctx } = c
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1b2e5c'); g.addColorStop(1, NAVY)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // The shield (components/BadgeLogo.jsx), drawn from the same paths, 48 units wide.
  ctx.save()
  const s = 6.2; ctx.translate(W / 2 - 24 * s, 190); ctx.scale(s, s)
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.6; ctx.strokeStyle = GOLD; ctx.fillStyle = '#0d1b33'
  const shield = new Path2D('M24 3 41 9v13c0 11-7.3 19.2-17 23C14.3 41.2 7 33 7 22V9z')
  ctx.fill(shield); ctx.stroke(shield)
  ctx.fillStyle = GOLD; ctx.fill(new Path2D('M24 12.5l3.1 6.4 7 .9-5.1 4.9 1.3 6.9L24 28.3l-6.3 3.3 1.3-6.9-5.1-4.9 7-.9z'))
  ctx.restore()
  ctx.textAlign = 'center'
  const text = (t, y, size, weight, color) => { ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color; ctx.fillText(t, W / 2, y) }
  // Badge in white, Fit in gold.
  ctx.font = `800 92px ${FONT}`
  const wb = ctx.measureText('Badge').width, wf = ctx.measureText('Fit').width
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText('Badge', W / 2 - (wb + wf) / 2, 620)
  ctx.fillStyle = GOLD; ctx.fillText('Fit', W / 2 - (wb + wf) / 2 + wb, 620)
  ctx.textAlign = 'center'
  text(model.head.toUpperCase(), 790, 44, 700, GOLD)
  ctx.font = `800 96px ${FONT}`
  const lines = wrapLines(model.title, t => ctx.measureText(t).width, W - 160)
  let y = 920
  for (const l of lines) { text(l, y, 96, 800, '#fff'); y += 112 }
  if (model.facts) { text(model.facts, y + 20, 60, 600, 'rgba(255,255,255,.82)'); y += 90 }
  if (model.count != null) {
    text(model.count, Math.max(y + 300, 1480), 300, 800, GOLD)
    text(model.countLabel, Math.max(y + 300, 1480) + 86, 56, 600, '#fff')
  }
  if (model.week) text(model.week, 1730, 44, 600, 'rgba(255,255,255,.7)')
  text(model.foot, 1830, 44, 600, 'rgba(255,255,255,.6)')
  return toPng(c.canvas)
}

/** Makes the card and opens the phone's share sheet with it. */
export async function shareSession(input, toast) {
  const blob = await cardImage(cardModel(input))
  if (!blob) { toast?.('Could not make the picture on this device.'); return false }
  return shareImage(blob, 'badgefit-session.png', 'BadgeFit', toast)
}
