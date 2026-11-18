# BadgeFit A4 poster for gym and supermarket noticeboards. Pictures first, few words: two app
# screens, Hayden, the PCT -> Academy -> Badge path, a big QR and tear-off tabs. Print only (not on
# the website): writes poster.html beside the app screenshots in OUT, then a PDF.
import json, re, os, sys, qrcode
HERE = os.path.dirname(os.path.abspath(__file__)) + '/'
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE + 'poster/'
I = json.load(open(HERE + 'site-icons.json')); B4 = json.load(open(HERE + ('bots4.json' if os.path.exists(HERE + 'bots4.json') else 'mock/bots4.json')))
LINK = 'https://badgefit.com.au/links.html'

def ic(n, cls='pi'):
    body = I[n].replace('<>', '').replace('</>', '')
    body = re.sub(r'([a-z])([A-Z])([a-z]*)=', lambda m: m.group(1) + '-' + m.group(2).lower() + m.group(3) + '=', body)
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true">{body}</svg>'

q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=20, border=1)
q.add_data(LINK); q.make(fit=True)
q.make_image(fill_color='#0b1a36', back_color='white').save(OUT + 'poster-qr.png')

shield = '<svg class="p-logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 40 10v12c0 10-7 18-16 22C15 40 8 32 8 22V10Z" fill="#0b1a36" stroke="#ffc629" stroke-width="2.5"/><path d="m24 15 2.6 5.5 6 .7-4.5 4.1 1.2 5.9L24 28.3l-5.3 2.9 1.2-5.9-4.5-4.1 6-.7Z" fill="#ffc629"/></svg>'
strip = '<div class="tab"><b>badgefit.com.au</b><span>PCT + Academy</span></div>'
step = lambda icon, word, cls='': f'<div class="st {cls}"><span class="dot">{ic(icon)}</span><b>{word}</b></div>'

html = f'''<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><title>BadgeFit poster</title>
<style>
@page{{size:A4;margin:0}}
*{{box-sizing:border-box}}
html,body{{margin:0;background:#3a4256}}
body{{font-family:Inter,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.sheet{{position:relative;width:210mm;height:297mm;margin:0 auto;overflow:hidden;background:radial-gradient(110% 60% at 50% 38%,#24407a 0%,#0b1a36 60%,#060f20 100%);color:#fff;display:flex;flex-direction:column}}
.head{{padding:12mm 14mm 0;text-align:center}}
.brand{{display:inline-flex;align-items:center;gap:3mm}}
.p-logo{{width:11mm;height:11mm}}
.brand b{{font-size:7mm;font-weight:900;letter-spacing:-.02em}}
.eye{{margin:6mm 0 0;color:#ffc629;font-weight:800;font-size:4.4mm;letter-spacing:.16em;text-transform:uppercase}}
h1{{margin:2.5mm 0 0;font-size:14.5mm;line-height:1;font-weight:900;letter-spacing:-.035em}}
h1 em{{display:block;font-style:normal;color:#ffc629}}
.stage{{position:relative;flex:1 1 auto;min-height:0}}
.ph{{position:absolute;top:5mm;width:41mm;aspect-ratio:390/844;border-radius:9mm;padding:2mm;background:#0d1424;box-shadow:0 6mm 14mm rgba(0,0,0,.5),0 0 0 .5mm rgba(255,255,255,.18)}}
.ph img{{width:100%;height:100%;object-fit:cover;border-radius:7.2mm;display:block}}
.ph.a{{left:70mm;transform:rotate(-7deg)}}
.ph.b{{left:118mm;top:9mm;transform:rotate(6deg)}}
.hay{{position:absolute;left:12mm;bottom:2mm;width:60mm;filter:drop-shadow(0 4mm 8mm rgba(0,0,0,.45))}}
.hay svg{{width:100%;height:auto;display:block}}
.bubble{{position:absolute;left:14mm;top:6mm;background:#ffc629;color:#0b1a36;font-weight:900;font-size:5.2mm;padding:3mm 4.5mm;border-radius:5mm 5mm 5mm 1mm;transform:rotate(-4deg)}}
.road{{position:relative;flex:none;margin:3mm 14mm 0;display:flex;justify-content:space-between;align-items:flex-start;padding-top:1mm}}
.road::before{{content:"";position:absolute;left:12%;right:12%;top:10.5mm;border-top:1.2mm dashed rgba(255,198,41,.7)}}
.st{{position:relative;width:33%;display:flex;flex-direction:column;align-items:center;gap:2.5mm}}
.dot{{display:grid;place-items:center;width:22mm;height:22mm;border-radius:50%;background:#13254a;border:.8mm solid #ffc629}}
.st.gold .dot{{background:#ffc629}}
.st.gold .pi{{stroke:#0b1a36}}
.pi{{width:11mm;height:11mm;fill:none;stroke:#ffc629;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:#ffc629}}
.st b{{font-size:6mm;font-weight:900}}
.cta{{flex:none;margin:6mm 14mm 4mm;display:flex;align-items:center;gap:6mm;padding:4.5mm;border-radius:6mm;background:#fff;color:#0b1a36}}
.cta img{{width:40mm;height:40mm;display:block}}
.cta h2{{margin:0;font-size:11mm;line-height:1;font-weight:900;letter-spacing:-.03em}}
.cta p{{margin:2.5mm 0 0;font-size:5mm;font-weight:700;color:#3a4566}}
.cta .url{{margin-top:2.5mm;font-size:5.4mm;font-weight:900;color:#0b1a36}}
.fine{{margin:0 14mm 3mm;font-size:3mm;color:rgba(255,255,255,.5);text-align:center}}
.tabs{{flex:none;display:grid;grid-template-columns:repeat(8,1fr);height:36mm;background:#fff;color:#0b1a36;border-top:.5mm dashed #0b1a36}}
.tab{{writing-mode:vertical-rl;transform:rotate(180deg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2mm;border-left:.35mm dashed #8792a8;font-size:2.9mm;line-height:1.15}}
.tab b{{font-size:3.5mm;font-weight:900}}
.tab span{{color:#3a4566}}
@media print{{html,body{{background:none}}}}
</style></head><body>
<div class="sheet">
  <div class="head">
    <div class="brand">{shield}<b>BadgeFit</b></div>
    <p class="eye">Thinking about policing?</p>
    <h1>Pass the PCT.<em>Make the Academy.</em></h1>
  </div>
  <div class="stage">
    <div class="ph a"><img src="app-ring.png" alt=""></div>
    <div class="ph b"><img src="app-pace.png" alt=""></div>
    <div class="hay">{B4['hayden']}</div>
    <div class="bubble">I'll coach you</div>
  </div>
  <div class="road">{step('figureRun', 'PCT')}{step('flag', 'Academy')}{step('shield', 'Badge', 'gold')}</div>
  <div class="cta">
    <img src="poster-qr.png" alt="QR code">
    <div><h2>Scan me</h2><p>Free iPhone beta</p><div class="url">badgefit.com.au</div></div>
  </div>
  <p class="fine">Not affiliated with any police service</p>
  <div class="tabs">{strip * 8}</div>
</div>
</body></html>
'''
open(OUT + 'poster.html', 'w').write(html)
print('poster ok')
