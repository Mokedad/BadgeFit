// "Myth vs fact" reel, motion graphics only: hook, myth card, fact card, the one-line takeaway, Comment PCT.
const { chromium } = require('playwright'); const fs = require('fs')
const D = process.argv[2], FPS = 30, LEN = 12
const css = `*{margin:0;box-sizing:border-box}body{width:1080px;height:1920px;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#fff;background:#06101f;overflow:hidden;position:relative}
#bg{position:absolute;inset:-200px;background:radial-gradient(60% 45% at 50% 30%,#2a4a8a,#0b1a36 55%,#040a16)}
.x{position:absolute;left:0;right:0}.t{text-align:center;font-weight:900;line-height:1.05;text-shadow:0 6px 30px rgba(0,0,0,.5);padding:0 60px}
#bar{top:40px;left:40px;right:40px;height:12px;border-radius:6px;background:rgba(255,255,255,.18);overflow:hidden}#bar i{display:block;height:100%;background:#ffc629}
.card{left:70px;right:70px;border-radius:54px;padding:60px 50px;color:#111;box-shadow:0 40px 90px rgba(0,0,0,.55);text-align:center}
.tag{display:inline-block;font-size:44px;font-weight:900;letter-spacing:.06em;padding:10px 30px;border-radius:999px;margin-bottom:26px}
.line{font-size:58px;font-weight:800;line-height:1.2}
em{font-style:normal;color:#ffc629}`
const html = `<div id="bg"></div><div id="bar" class="x"><i></i></div>
<div id="hook" class="x t" style="top:560px;font-size:112px">Running more<br>makes you <em>slower</em></div>
<div id="myth" class="x card" style="top:520px;background:#ffe1e1"><span class="tag" style="background:#d23b3b;color:#fff">MYTH</span><div class="line">Run every single day for the beep test</div></div>
<div id="fact" class="x card" style="top:1020px;background:#ddf5e6"><span class="tag" style="background:#1c9a66;color:#fff">FACT</span><div class="line">Two hard sessions a week, and easy runs in between</div></div>
<div id="take" class="x t" style="top:1420px;font-size:56px;font-weight:800">Recovery is where the speed comes from</div>
<div id="end" class="x" style="inset:0"><div class="x t" style="top:600px;font-size:76px">Comment</div><div class="x t" style="top:700px;font-size:300px;color:#ffc629;line-height:1">PCT</div><div class="x t" style="top:1040px;font-size:50px;font-weight:800">and we'll send you the free app<br>that trains you for all six</div></div>`
const render = t => {
  const $ = id => document.getElementById(id), cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), ease = p => 1 - Math.pow(1 - cl(p), 3)
  $('bar').firstChild.style.width = (t / LEN * 100) + '%'
  $('bg').style.transform = `scale(${1 + t * 0.008}) rotate(${t * 0.3}deg)`
  const hIn = ease((t - 0.1) / 0.5), hOut = cl((t - 2.6) / 0.3)
  $('hook').style.opacity = hIn * (1 - hOut); $('hook').style.transform = `scale(${0.7 + 0.3 * hIn})`
  const mIn = ease((t - 2.9) / 0.5), mOut = cl((t - 5.9) / 0.3)
  $('myth').style.opacity = mIn * (1 - mOut); $('myth').style.transform = `translateX(${(1 - mIn) * -900 + mOut * 900}px) rotate(${-2 * mIn}deg)`
  const fIn = ease((t - 6.2) / 0.5), fOut = cl((t - 9.3) / 0.3)
  $('fact').style.opacity = fIn * (1 - fOut); $('fact').style.transform = `translateX(${(1 - fIn) * 900 - fOut * 900}px) rotate(${2 * fIn}deg)`
  const kIn = cl((t - 9.4) / 0.35); $('take').style.opacity = kIn * (1 - cl((t - 10.6) / 0.25))
  const e = cl((t - 10.7) / 0.35); $('end').style.opacity = e
  $('end').firstElementChild.style.transform = `translateY(${(1 - e) * 40}px)`
}
;(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`)
  await p.evaluate(`window.LEN = ${LEN}; window.render = ${render.toString()}`)
  fs.mkdirSync(D + '/fr', { recursive: true })
  for (let i = 0; i < LEN * FPS; i++) { await p.evaluate(t => window.render(t), i / FPS); await p.screenshot({ path: `${D}/fr/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 }) }
  await b.close()
})()
