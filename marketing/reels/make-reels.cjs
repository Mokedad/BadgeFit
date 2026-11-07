#!/usr/bin/env node
// Renders the reels in reels.cjs to 1080×1920 MP4s (H.264, 30 fps, no audio: add a trending
// sound in Instagram or TikTok when you post, which also helps reach).
//
//   node marketing/reels/make-reels.cjs            # all reels → marketing/reels/out/
//   node marketing/reels/make-reels.cjs 02         # only reels whose id contains "02"
//
// Needs Playwright (Chromium) and ffmpeg on the PATH.
const { chromium } = require('playwright')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const HERE = __dirname
const OUT = path.join(HERE, 'out')
const IMG = path.join(HERE, '..', '..', 'badgefit-site', 'img')
const REELS = require('./reels.cjs')
const FPS = 30
const FADE = 0.35

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function slideHtml(s, i, n) {
  const img = s.img ? `<div class="phone"><img src="file://${path.join(IMG, s.img)}"></div>` : ''
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1080px;height:1920px;overflow:hidden;font-family:Inter,'Inter Display',sans-serif;color:#eef3fb;
    background:radial-gradient(900px 700px at 80% 10%,#1d4a8f 0,transparent 60%),linear-gradient(170deg,#0d2a56,#0a1628 60%);
    display:flex;flex-direction:column;justify-content:${img ? 'flex-start' : 'center'};padding:${img ? '170px' : '0'} 90px 0}
  .brand{position:absolute;top:70px;left:90px;font-weight:800;font-size:40px;letter-spacing:-.02em;opacity:.9}
  .brand b{color:#7fb2ff}
  .dots{position:absolute;top:84px;right:90px;display:flex;gap:10px}
  .dots i{width:${Math.max(18, 300 / n)}px;height:8px;border-radius:4px;background:rgba(255,255,255,.2)}
  .dots i.on{background:#30d158}
  .kicker{color:#30d158;font-weight:800;font-size:46px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:26px}
  h1{font-size:${img ? 104 : 124}px;line-height:1.02;font-weight:800;letter-spacing:-.03em}
  .big{font-size:230px;line-height:1;font-weight:900;letter-spacing:-.04em;margin:30px 0 10px;color:${s.tone === 'down' ? '#ff9f0a' : s.tone === 'stay' ? '#7fb2ff' : '#30d158'}}
  p{font-size:60px;line-height:1.2;color:#a9b7cc;margin-top:34px;font-weight:600}
  .phone{margin:70px auto 0;width:560px;border-radius:70px;padding:16px;background:#000;box-shadow:0 0 0 4px #2a3550,0 60px 120px rgba(0,0,0,.6),0 0 200px rgba(47,124,246,.35)}
  .phone img{width:100%;border-radius:56px;display:block}
  </style></head><body>
  <div class="brand">Badge<b>Fit</b></div>
  <div class="dots">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
  ${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}
  <h1>${esc(s.title)}</h1>
  ${s.big ? `<div class="big">${esc(s.big)}</div>` : ''}
  ${s.body ? `<p>${esc(s.body)}</p>` : ''}
  ${img}
  </body></html>`
}

async function renderReel(browser, reel) {
  const dir = path.join(OUT, reel.id)
  fs.mkdirSync(dir, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
  const files = []
  for (let i = 0; i < reel.slides.length; i++) {
    // From a file, not setContent: an about:blank page may not load the file:// screenshots.
    const html = path.join(dir, `slide-${i + 1}.html`)
    fs.writeFileSync(html, slideHtml(reel.slides[i], i, reel.slides.length))
    await page.goto('file://' + html, { waitUntil: 'load' })
    await page.evaluate(() => Promise.all([...document.images].map(im => im.decode().catch(() => {}))))
    const f = path.join(dir, `slide-${String(i + 1).padStart(2, '0')}.png`)
    await page.screenshot({ path: f })
    files.push(f)
  }
  await page.close()

  // Each slide: a slow push-in (zoompan), then cross-faded into the next one.
  const args = ['-y']
  reel.slides.forEach((s, i) => args.push('-i', files[i])) // one frame each: zoompan makes the clip
  const parts = reel.slides.map((s, i) => {
    const frames = Math.round((s.sec + FADE) * FPS)
    return `[${i}:v]scale=1188:2112,zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${FPS},setsar=1,format=yuv420p[s${i}]`
  })
  let last = 's0', offset = 0
  for (let i = 1; i < reel.slides.length; i++) {
    offset += reel.slides[i - 1].sec
    parts.push(`[${last}][s${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(2)}[x${i}]`)
    last = `x${i}`
  }
  const mp4 = path.join(OUT, reel.id + '.mp4')
  args.push('-filter_complex', parts.join(';'), '-map', `[${last}]`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4)
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
  fs.writeFileSync(path.join(OUT, reel.id + '.caption.txt'), reel.caption + '\n')
  return mp4
}

;(async () => {
  const only = process.argv[2]
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  for (const reel of REELS.filter(r => !only || r.id.includes(only))) {
    const f = await renderReel(browser, reel)
    console.log('wrote', path.relative(process.cwd(), f))
  }
  await browser.close()
})().catch(e => { console.error(e.stderr ? String(e.stderr).slice(-2000) : e); process.exit(1) })
