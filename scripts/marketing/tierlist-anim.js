// Renders the tier list reel frame by frame (30 fps): every element is placed from the time t, so
// the motion is smooth and steady (no shake), and something moves every second.
const { chromium } = require('playwright'); const fs = require('fs')
const D = process.argv[2], FPS = 30, LEN = 12.5
const raw = JSON.parse(fs.readFileSync(D + '/site-icons.json', 'utf8'))
const b4 = JSON.parse(fs.readFileSync(D + '/bots4.json', 'utf8'))
const sz = (svg, w) => svg.replace('<svg', `<svg width="${w}" height="${w}"`)
const ic = (n, w) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="#111" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${raw[n].replace(/<\/?>/g, '')}</svg>`
const css = `*{margin:0;box-sizing:border-box}body{width:1080px;height:1920px;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#fff;background:#06101f;overflow:hidden;position:relative}
#bg{position:absolute;inset:-200px;background:radial-gradient(60% 45% at 50% 30%,#2a4a8a,#0b1a36 55%,#040a16)}
.x{position:absolute;will-change:transform,opacity}
.t{left:60px;right:60px;text-align:center;font-weight:900;line-height:1.05;text-shadow:0 6px 30px rgba(0,0,0,.5)}
#bar{top:40px;left:40px;right:40px;height:12px;border-radius:6px;background:rgba(255,255,255,.18);overflow:hidden}#bar i{display:block;height:100%;background:#ffc629}
#board{left:60px;right:60px;top:560px;background:#fffaf0;border-radius:54px;padding:40px 40px 30px;color:#111;box-shadow:0 40px 90px rgba(0,0,0,.55)}
.row{display:flex;align-items:center;gap:24px;height:150px;margin:8px 0}.row>span{width:120px;height:120px;border-radius:30px;display:grid;place-items:center;font-size:70px;font-weight:900;flex:none}
.chip{display:inline-flex;align-items:center;gap:12px;background:#f1ede4;border-radius:24px;padding:18px 24px;font-size:42px;font-weight:800;margin-right:14px}
.q{display:inline-grid;place-items:center;width:300px;height:96px;border-radius:24px;background:#111;color:#ffc629;font-size:56px;font-weight:900}
em{font-style:normal;color:#ffc629}`
const rows = [['S', '#ff8a80', [['speaker', 'Beep test']]], ['A', '#ffc46b', [['shuffle', 'Agility'], ['timer', 'Bridge']]], ['B', '#fff176', [['figureStrength', 'Push-ups']]], ['C', '#a5d6a7', [['arm', 'Grip'], ['arrowUp', 'Jump']]]]
const html = `<div id="bg"></div><div id="bar" class="x"><i></i></div>
<div id="hook" class="x t" style="top:600px;font-size:118px">Which PCT test<br>is the <em>hardest?</em></div>
<div id="wait" class="x t" style="top:960px;font-size:52px;font-weight:800">Wait for number 1</div>
<div id="title" class="x t" style="top:270px;font-size:86px">The 6 PCT tests,<br><em>ranked</em></div>
<div id="board" class="x">${rows.map(([l, c, items], i) => `<div class="row"><span style="background:${c}">${l}</span><div id="r${i}">${l === 'S' ? `<span id="qbox" class="q">?</span><span id="sreal">` + items.map(([n, t]) => `<em class="chip" style="color:#111">${ic(n, 48)}${t}</em>`).join('') + '</span>' : items.map(([n, t], k) => `<em id="c${i}${k}" class="chip x" style="position:relative;color:#111">${ic(n, 48)}${t}</em>`).join('')}</div></div>`).join('')}</div>
<div id="sub" class="x t" style="top:1380px;font-size:50px;font-weight:800"></div>
<div id="flash" class="x" style="inset:0;background:#fff;opacity:0"></div>
<div id="end" class="x" style="inset:0"><div class="t x" style="top:520px;font-size:80px;position:absolute">Comment</div><div id="pct" class="t x" style="top:620px;font-size:320px;color:#ffc629;position:absolute;line-height:1">PCT</div><div class="t x" style="top:980px;font-size:50px;font-weight:800;position:absolute">and we'll send you the free app<br>that trains you for all six</div><div id="hb" class="x" style="left:400px;top:1150px">${sz(b4.hayden, 280)}</div></div>`
const render = t => {
  const $ = id => document.getElementById(id)
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
  const pop = (t0, d = 0.35) => { const p = cl((t - t0) / d); const s = p === 0 ? 0 : 1 + 1.70158 * Math.pow(p - 1, 3) + 0.70158 * Math.pow(p - 1, 2) + (p - 1) * 0; return { p, s: cl(p, 0, 1) === 0 ? 0 : (1 - Math.pow(1 - p, 3)) * (1 + 0.12 * Math.sin(p * Math.PI)) } }
  const vis = (el, o, tr = '') => { el.style.opacity = o; el.style.transform = tr }
  $('bar').firstChild.style.width = (t / LEN * 100) + '%'
  $('bg').style.transform = `scale(${1 + t * 0.01}) rotate(${t * 0.4}deg)`
  const h = pop(0.05, 0.4); vis($('hook'), t < 1.6 ? h.p : cl(1 - (t - 1.6) / 0.25), `scale(${t < 1.6 ? 0.6 + 0.4 * h.s : 1 + (t - 1.6) * 0.3})`)
  const w = pop(0.6, 0.3); vis($('wait'), t < 1.6 ? w.p : cl(1 - (t - 1.6) / 0.25), `translateY(${(1 - w.p) * 40}px)`)
  const inB = cl((t - 1.75) / 0.45), outB = cl((t - 9.4) / 0.3)
  vis($('board'), inB * (1 - outB), `translateY(${(1 - (1 - Math.pow(1 - inB, 3))) * 500}px) scale(${1 - outB * 0.1})`)
  vis($('title'), inB * (1 - outB), `translateY(${(1 - inB) * -60}px)`)
  // C at 2.2, B at 3.6, A at 5.0 (two chips each a beat apart); S is the reveal at 7.2.
  const at = { 3: 2.2, 2: 3.6, 1: 5.0 }
  for (const i of [1, 2, 3]) for (let k = 0; k < 2; k++) { const el = $('c' + i + k); if (!el) continue; const q = pop(at[i] + k * 0.35, 0.35); vis(el, q.p, `scale(${0.3 + 0.7 * q.s})`) }
  const sub = $('sub'), lines = [[2.2, 3.6, 'Easiest. Train them, pass them.'], [3.6, 5.0, '25 strict. Harder than it sounds.'], [5.0, 6.4, 'Technique beats strength here.'], [6.4, 7.2, 'And number 1 is...'], [7.3, 9.3, 'The one most applicants dread.']]
  const L = lines.find(([a, b]) => t >= a && t < b); sub.textContent = L ? L[2] : ''; sub.style.opacity = L ? cl((t - L[0]) / 0.2) : 0
  const pulse = t >= 6.4 && t < 7.2 ? 1 + 0.06 * Math.sin((t - 6.4) * 14) : 1
  vis($('qbox'), t < 7.2 ? 1 : 0, `scale(${pulse})`); $('qbox').style.display = t < 7.2 ? 'inline-grid' : 'none'
  const r = pop(7.2, 0.4); $('sreal').style.display = t >= 7.2 ? 'inline' : 'none'; vis($('sreal'), r.p, `scale(${0.5 + 0.5 * r.s})`); $('sreal').style.display = t >= 7.2 ? 'inline-block' : 'none'
  $('flash').style.opacity = t >= 7.2 && t < 7.5 ? 0.6 * (1 - (t - 7.2) / 0.3) : 0
  const e = cl((t - 9.6) / 0.35); vis($('end'), e)
  const pp = pop(9.75, 0.45); $('pct').style.transform = `scale(${t < 9.75 ? 0.3 : (0.3 + 0.7 * pp.s) * (1 + 0.03 * Math.sin((t - 10) * 6))})`
  $('hb').style.transform = `translateY(${Math.sin(t * 3) * 14}px) rotate(${Math.sin(t * 2) * 4}deg)`
}
;(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`)
  await p.evaluate(`window.render = ${render.toString()}; window.LEN = ${LEN}`)
  fs.mkdirSync(D + '/fr', { recursive: true })
  const N = Math.round(LEN * FPS)
  for (let i = 0; i < N; i++) { await p.evaluate(t => window.render(t), i / FPS); await p.screenshot({ path: `${D}/fr/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 }) }
  await b.close()
})()
