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

/** Where a photo is cut to fill a w × h frame (cover): the source rectangle { sx, sy, sw, sh }. Pure. */
export function coverCrop(iw, ih, w, h) {
  const scale = Math.max(w / iw, h / ih)
  const sw = w / scale, sh = h / scale
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh }
}

const loadPhoto = file => new Promise(resolve => {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
  img.src = url
})

/**
 * The photo card: your own photo filling the story, the session's words over the bottom of it and
 * BadgeFit at the top. Made on the phone; the photo goes nowhere but the share sheet you choose.
 */
export async function photoCardImage(model, file) {
  const W = 1080, H = 1920
  const c = makeCanvas(W, H, FONT)
  const img = c && file ? await loadPhoto(file) : null
  if (!c || !img) return null
  const { ctx } = c
  const { sx, sy, sw, sh } = coverCrop(img.naturalWidth || img.width, img.naturalHeight || img.height, W, H)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
  // Dark at the top and the bottom so the words read on any photo.
  const top = ctx.createLinearGradient(0, 0, 0, 420)
  top.addColorStop(0, 'rgba(12,23,48,.85)'); top.addColorStop(1, 'rgba(12,23,48,0)')
  ctx.fillStyle = top; ctx.fillRect(0, 0, W, 420)
  const bot = ctx.createLinearGradient(0, H - 900, 0, H)
  bot.addColorStop(0, 'rgba(12,23,48,0)'); bot.addColorStop(0.55, 'rgba(12,23,48,.82)'); bot.addColorStop(1, 'rgba(12,23,48,.96)')
  ctx.fillStyle = bot; ctx.fillRect(0, H - 900, W, 900)
  // Shield and name, top left.
  ctx.save()
  const s = 2.6; ctx.translate(70, 80); ctx.scale(s, s)
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.6; ctx.strokeStyle = GOLD; ctx.fillStyle = '#0d1b33'
  const shield = new Path2D('M24 3 41 9v13c0 11-7.3 19.2-17 23C14.3 41.2 7 33 7 22V9z')
  ctx.fill(shield); ctx.stroke(shield)
  ctx.fillStyle = GOLD; ctx.fill(new Path2D('M24 12.5l3.1 6.4 7 .9-5.1 4.9 1.3 6.9L24 28.3l-6.3 3.3 1.3-6.9-5.1-4.9 7-.9z'))
  ctx.restore()
  ctx.textAlign = 'left'; ctx.font = `800 64px ${FONT}`
  const wb = ctx.measureText('Badge').width
  ctx.fillStyle = '#fff'; ctx.fillText('Badge', 210, 165)
  ctx.fillStyle = GOLD; ctx.fillText('Fit', 210 + wb, 165)
  // The session, bottom left.
  const X = 80
  let y = H - 520
  ctx.font = `700 42px ${FONT}`; ctx.fillStyle = GOLD; ctx.fillText(model.head.toUpperCase(), X, y); y += 100
  ctx.font = `800 88px ${FONT}`; ctx.fillStyle = '#fff'
  for (const l of wrapLines(model.title, t => ctx.measureText(t).width, W - 2 * X, 2)) { ctx.fillText(l, X, y); y += 100 }
  if (model.facts) { ctx.font = `600 56px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.fillText(model.facts, X, y + 6); y += 90 }
  if (model.count != null) { ctx.font = `700 50px ${FONT}`; ctx.fillStyle = GOLD; ctx.fillText(`${model.count} ${model.countLabel}`, X, y + 10) }
  ctx.font = `600 38px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillText(model.foot, X, H - 70)
  return toPng(c.canvas)
}

/** Makes the photo card from a photo the member took or chose, and opens the share sheet. */
export async function sharePhoto(input, file, toast) {
  const blob = await photoCardImage(cardModel(input), file)
  if (!blob) { toast?.('Could not use that photo on this device.'); return false }
  return shareImage(blob, 'badgefit-photo.png', 'BadgeFit', toast)
}
