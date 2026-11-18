# BadgeFit poster for gym and supermarket noticeboards: badgefit-site/poster.html (A4, prints
# edge to edge), with a QR to the links page and tear-off strips. Run after make-site2.py.
import json, re, qrcode
import os; SP = os.path.dirname(os.path.abspath(__file__)) + '/'
D = os.path.join(SP, '../../badgefit-site/')
I = json.load(open(SP + 'site-icons.json')); B4 = json.load(open(SP + 'bots4.json'))
LINK = 'https://badgefit.com.au/links.html'

def ic(n):
    body = I[n].replace('<>', '').replace('</>', '')
    body = re.sub(r'([a-z])([A-Z])([a-z]*)=', lambda m: m.group(1) + '-' + m.group(2).lower() + m.group(3) + '=', body)
    return f'<svg class="pi" viewBox="0 0 24 24" aria-hidden="true">{body}</svg>'

q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=20, border=1)
q.add_data(LINK); q.make(fit=True)
q.make_image(fill_color='#0b1a36', back_color='white').save(D + 'img/poster-qr.png')

shield = '<svg class="p-logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 40 10v12c0 10-7 18-16 22C15 40 8 32 8 22V10Z" fill="#0b1a36" stroke="#ffc629" stroke-width="2.5"/><path d="m24 15 2.6 5.5 6 .7-4.5 4.1 1.2 5.9L24 28.3l-5.3 2.9 1.2-5.9-4.5-4.1 6-.7Z" fill="#ffc629"/></svg>'
strip = '<div class="tab"><b>badgefit.com.au</b><span>PCT + Academy</span></div>'

html = f'''<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>BadgeFit poster</title>
<link rel="icon" href="img/icon.svg" type="image/svg+xml">
<style>
@page{{size:A4;margin:0}}
*{{box-sizing:border-box}}
html,body{{margin:0;background:#3a4256}}
body{{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.sheet{{position:relative;width:210mm;height:297mm;margin:12mm auto;overflow:hidden;background:radial-gradient(120% 70% at 30% 0%,#1d3566 0%,#0b1a36 55%,#060f20 100%);color:#fff;display:flex;flex-direction:column}}
.hb{{position:absolute;right:-26mm;bottom:70mm;width:120mm;opacity:.16;transform:rotate(-8deg);pointer-events:none}}
.hb svg{{width:100%;height:auto;display:block}}
.top{{position:relative;padding:13mm 16mm 7mm;flex:1 1 auto;min-height:0}}
.brand{{display:flex;align-items:center;gap:4mm}}
.p-logo{{width:15mm;height:15mm}}
.brand b{{font-size:9mm;font-weight:900;letter-spacing:-.02em}}
.eyebrow{{display:inline-block;margin:9mm 0 0;padding:2.2mm 4.5mm;border:.5mm solid #ffc629;border-radius:99mm;color:#ffc629;font-weight:800;font-size:4mm;letter-spacing:.14em;text-transform:uppercase}}
h1{{margin:6mm 0 0;font-size:13mm;line-height:1.02;font-weight:900;letter-spacing:-.03em}}
h1 em{{font-style:normal;color:#ffc629}}
.secret{{margin:6mm 0 0;max-width:150mm;font-size:5.3mm;line-height:1.4;color:rgba(255,255,255,.82)}}
.secret b{{color:#fff}}
ul{{list-style:none;margin:7mm 0 0;padding:0;display:grid;gap:3.5mm;max-width:140mm}}
li{{display:flex;align-items:center;gap:4mm;font-size:4.9mm;font-weight:700}}
.pi{{flex:none;width:10mm;height:10mm;padding:2.2mm;border-radius:3mm;background:rgba(255,198,41,.14);color:#ffc629;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}}
.cta{{position:relative;flex:none;margin:0 16mm 9mm;display:flex;align-items:center;gap:7mm;padding:6mm;border-radius:7mm;background:rgba(255,255,255,.07);border:.4mm solid rgba(255,255,255,.16)}}
.cta img{{width:38mm;height:38mm;border-radius:3.5mm;background:#fff;padding:2mm}}
.cta h2{{margin:0;font-size:8mm;font-weight:900;letter-spacing:-.02em}}
.cta p{{margin:2.5mm 0 0;font-size:4.4mm;line-height:1.4;color:rgba(255,255,255,.8)}}
.cta .url{{margin-top:3.5mm;font-size:5mm;font-weight:800;color:#ffc629}}
.fine{{position:relative;margin:0 16mm 4mm;font-size:3.2mm;color:rgba(255,255,255,.45)}}
.tabs{{position:relative;flex:none;display:grid;grid-template-columns:repeat(8,1fr);height:40mm;background:#fff;color:#0b1a36;border-top:.5mm dashed #0b1a36}}
.tab{{writing-mode:vertical-rl;transform:rotate(180deg);display:flex;align-items:center;justify-content:center;gap:1.2mm;border-left:.35mm dashed #8792a8;font-size:2.9mm;flex-direction:column;line-height:1.15}}
.tab b{{font-size:3.5mm;font-weight:900}}
.tab span{{color:#3a4566}}
.note{{max-width:210mm;margin:0 auto 12mm;color:#dfe5f0;font-size:14px;text-align:center}}
@media print{{html,body{{background:none}}.sheet{{margin:0}}.note{{display:none}}}}
@media (max-width:820px){{.sheet{{zoom:calc(100vw / 210mm)}}}}
</style>
</head>
<body>
<div class="sheet">
  <div class="hb" aria-hidden="true">{B4['hayden']}</div>
  <div class="top">
    <div class="brand">{shield}<b>BadgeFit</b></div>
    <span class="eyebrow">Thinking about policing?</span>
    <h1>Passing the PCT<br>gets you in.<br><em>The Academy is<br>the real test.</em></h1>
    <p class="secret">Most applicants train to scrape through the PCT. <b>The ones who make it train for what comes after.</b> This is the plan they don't talk about.</p>
    <ul>
      <li>{ic('calendar')}A plan to your PCT date, all six standards</li>
      <li>{ic('footprints')}Beep test pace in your ear on every run</li>
      <li>{ic('flag')}After you pass: Academy prep, gym or no gym</li>
    </ul>
  </div>
  <div class="cta">
    <img src="img/poster-qr.png" alt="QR code to badgefit.com.au">
    <div>
      <h2>Scan to get in early</h2>
      <p>Free iPhone beta. Not on the App Store yet.</p>
      <div class="url">badgefit.com.au</div>
    </div>
  </div>
  <p class="fine">Not affiliated with any police service. Training support only; it can't promise a result.</p>
  <div class="tabs">{strip * 8}</div>
</div>
<p class="note">Print on A4 (or A3, "fit to page"), colour, no margins. Cut along the dashed lines between the tabs.</p>
</body>
</html>
'''
open(D + 'poster.html', 'w').write(html)
print('poster ok')
