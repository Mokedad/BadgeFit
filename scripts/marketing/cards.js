// Transparent 1080x1920 overlay cards for one reel, drawn as HTML so the type matches the brand.
const { chromium } = require('playwright')
const fs = require('fs')
const D = process.argv[2]
const b4 = JSON.parse(fs.readFileSync(D + '/bots4.json', 'utf8'))
const sz = (svg, w) => svg.replace('<svg', `<svg width="${w}" height="${w}"`)
const base = `*{margin:0;box-sizing:border-box}body{width:1080px;height:1920px;background:transparent;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#fff;position:relative;overflow:hidden}
.cap{position:absolute;left:60px;right:60px;text-align:center;font-weight:900;text-shadow:0 4px 24px rgba(0,0,0,.65)}
.pill{position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(15,15,18,.8);border:2px solid rgba(255,255,255,.15);border-radius:40px;padding:18px 34px;font-weight:800;font-size:44px;display:flex;gap:18px;align-items:center}
.pill b{width:54px;height:54px;border-radius:50%;border:5px solid #ffc629;display:grid;place-items:center;font-size:30px;color:#ffc629}
.card{position:absolute;left:70px;right:70px;background:#fffaf0;color:#111;border-radius:44px;padding:40px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
em{font-style:normal;color:#ffc629}`
const cards = {
  chat: `<div class="pill" style="top:1180px"><b>!</b>Real talk</div><div class="cap" style="top:1290px;font-size:76px;line-height:1.1">I failed the beep test<br>at level 6. <em>Twice.</em></div>`,
  goal: `<div class="card" style="top:220px"><div style="text-align:center;font-weight:800;font-size:46px;margin-bottom:24px">The goal</div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 30px"><div style="text-align:center"><div style="font-size:120px;font-weight:900;color:#d23b3b;line-height:1">6.4</div><div style="font-size:36px;color:#666">now</div></div>
    <svg width="240" height="60"><path d="M6 30h210m-26-20 26 20-26 20" stroke="#111" stroke-width="8" fill="none" stroke-linecap="round"/></svg>
    <div style="text-align:center"><div style="font-size:120px;font-weight:900;color:#1c9a66;line-height:1">7.5</div><div style="font-size:36px;color:#666">6 Dec</div></div></div>
    <div style="display:flex;align-items:center;gap:20px;margin-top:28px;justify-content:center">${sz(b4.hayden, 96)}<b style="font-size:38px">Two interval days a week</b></div></div>`,
  ad1: `<div class="cap" style="top:300px;font-size:82px;letter-spacing:4px;line-height:1.15">LEVEL 6 WAS<br>WHERE I STOPPED.</div>`,
  ad2: `<div class="cap" style="top:840px;font-size:104px;letter-spacing:2px;white-space:nowrap;left:0;right:0">NOT ANYMORE.</div>`,
  ask: `<div class="cap" style="top:330px;font-size:70px">Comment</div><div class="cap" style="top:410px;font-size:230px;color:#ffc629;line-height:1">PCT</div><div class="cap" style="top:660px;font-size:56px">and I'll send you what I use</div>`,
}
;(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  for (const [k, html] of Object.entries(cards)) {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${base}</style></head><body>${html}</body></html>`)
    await p.screenshot({ path: `${D}/cards/${k}.png`, omitBackground: true })
  }
  await b.close()
})()
