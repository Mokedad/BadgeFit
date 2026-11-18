import json, re, os
SP = '/tmp/claude-0/-home-user/b23057b8-52d1-5b49-bfe4-30e2ed416d19/scratchpad/'
I = json.load(open(SP + 'site-icons.json'))
D = '/home/user/Police-Training-App/badgefit-site/'
JOIN = 'https://testflight.apple.com/join/rkAF7YVy'
SITE = 'https://badgefit.com.au'
IG = 'https://www.instagram.com/badgefit.au'
TT = 'https://www.tiktok.com/@badgefitau'
FB = 'https://www.facebook.com/profile.php?id=61596880432285'

def path_of(file):
    s = open(file).read()
    return re.search(r' d="([^"]+)"', s).group(1)

BRAND = {
 'youtube': path_of('/tmp/si/package/icons/youtube.svg'),
 'discord': path_of('/tmp/si/package/icons/discord.svg'),
 'facebook': path_of('/tmp/si/package/icons/facebook.svg'),
 'instagram': path_of('/tmp/si/package/icons/instagram.svg'),
 'x': path_of('/tmp/si/package/icons/x.svg'),
 'linkedin': path_of('/tmp/si11/package/icons/linkedin.svg'),
 'tiktok': path_of('/tmp/si/package/icons/tiktok.svg'),
}
def brand(name):
    return f'<svg class="soc-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="{BRAND[name]}"/></svg>'

def ic(n, cls='ico'):
    body = I[n].replace('<>', '').replace('</>', '')
    body = re.sub(r'([a-z])([A-Z])([a-z]*)=', lambda m: m.group(1) + '-' + m.group(2).lower() + m.group(3) + '=', body)
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true">{body}</svg>'

shield = '<svg class="logo" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 40 10v12c0 10-7 18-16 22C15 40 8 32 8 22V10Z" fill="#0b1a36" stroke="#ffc629" stroke-width="2.5"/><path d="m24 15 2.6 5.5 6 .7-4.5 4.1 1.2 5.9L24 28.3l-5.3 2.9 1.2-5.9-4.5-4.1 6-.7Z" fill="#ffc629"/></svg>'

# Social: the accounts BadgeFit has. The other four are shown as coming soon (no link).
def social(extra_class=''):
    live = [('Instagram', IG, 'instagram'), ('TikTok', TT, 'tiktok'), ('Facebook', FB, 'facebook')]
    soon = [('YouTube', 'youtube'), ('Discord', 'discord'), ('X', 'x'), ('LinkedIn', 'linkedin')]
    a = ''.join(f'<a class="soc" href="{u}" aria-label="{n}" title="{n}">{brand(k)}</a>' for n, u, k in live)
    return f'<div class="socials">{a}</div><p class="sitelink"><a href="{SITE}">badgefit.com.au</a></p>'

def shot(name, alt, cls=''):
    return f'<div class="phone {cls}"><img src="img/{name}.png" alt="{alt}" width="390" height="844" loading="lazy" decoding="async"></div>'

B3 = json.load(open(SP + 'mock/bots3.json')); B4 = json.load(open(SP + 'mock/bots4.json'))
_steps = [(B4['grey'], 'Guest', 'Grey, no gear'), (B4['colour'], 'Yours', 'Pick his colour'), (B3['mine'], 'Earning', 'Gear as you train'), (B3['g_badge'], 'Passed', 'The gold badge')]
journey = '<ol class="journey">' + ''.join(f'<li><span class="jb">{svg}</span><b>{t}</b><small>{u}</small></li>' for svg, t, u in _steps) + '</ol>'
feat = [
 ('target', 'The ready ring', 'Your six tests as six arcs. Gold fills toward the pass mark, green once you pass. One look tells you what to work on next.'),
 ('footprints', 'Pace sound on runs', 'Step on every tick. Hayden sets the beat for each part of your run, under your music.'),
 ('sparkles', 'A reward every session', 'Finish a session and something real is waiting: a new best, gear, or a tip for the test.'),
 ('shield', 'Your own Hayden', 'Pick his colour. He earns gear as you train: a sweatband, a whistle, a lightning bolt, and the gold badge when you pass.'),
]
feats = ''.join(
  f'<section class="feat{" rev" if i % 2 else ""}"><div class="sym">{ic(k, "sym-i")}</div><div class="ft"><h2>{t}</h2><p>{d}</p></div></section>'
  for i, (k, t, d) in enumerate(feat))

pct = ''.join(f'<li>{ic(i,"wi")}<b>{d}</b><span>{t}</span></li>' for d,i,t in [('Mon','dumbbell','Chest, shoulders and abs'),('Tue','figureRun','Intervals for the beep test'),('Wed','dumbbell','Squats and push power'),('Thu','figureRun','Easy run'),('Fri','dumbbell','Arms, back and grip'),('Sat','figureRun','Steady run or beep focus'),('Sun','moon','Rest and recover')])
acad = ''.join(f'<li>{ic(i,"wi")}<b>{d}</b><span>{t}</span></li>' for d,i,t in [('Mon','dumbbell','Strength A: squat and pull-ups'),('Tue','figureRun','Steady run at formation pace'),('Wed','timer','Academy circuit'),('Thu','figureRun','Intervals'),('Fri','dumbbell','Strength B: deadlift and press'),('Sat','figureRun','Long easy run'),('Sun','moon','Rest, mobility')])
std = [('arm','Handgrip','30 kg','each hand'),('timer','Prone bridge','90 s',''),('arrowUp','Vertical jump','30 cm',''),('figureStrength','Push-ups','25','reps'),('shuffle','Illinois agility','20 s','or under'),('speaker','Beep test','7.1','level')]
stds = ''.join(f'<article>{ic(a)}<h3>{b}</h3><p class="mark">{c} <small>{d}</small></p></article>' for a,b,c,d in std)

index = f'''<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BadgeFit: Train for the PCT</title>
<meta name="description" content="BadgeFit trains you for the police PCT: beep test, push-ups, prone bridge, handgrip, vertical jump and Illinois agility. A plan to your test date, Hayden your coach, and a community of applicants. Free iPhone beta.">
<meta property="og:title" content="BadgeFit: Train for the PCT. Earn the badge.">
<meta property="og:description" content="A plan to your test date, the six standards tracked, Hayden your coach. Join the free iPhone beta.">
<meta property="og:image" content="img/app-ring.png">
<meta name="theme-color" content="#0b1a36">
<link rel="icon" href="img/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="nav">
  <a class="brand" href="#top">{shield}BadgeFit</a>
  <a class="btn small" href="{JOIN}">Join the beta</a>
</header>
<main id="top">
<section class="hero">
  <div class="hero-text">
    <p class="eyebrow">Early access · Not on the App Store yet</p>
    <h1>Train for the PCT.<br><span>Earn the badge.</span></h1>
    <p class="lead">The plan, the coach and the tracking, before everyone else has it. A plan to your test date, all six standards, and Hayden in your pocket.</p>
    <div class="cta"><a class="btn" href="{JOIN}">{ic("download","bi")}Beta Test</a></div>
    <p class="fine">iPhone only for now. Free during early access.</p>
  </div>
  {shot('app-pace', 'BadgeFit mid-run: 4 minutes hard, the pace sound on at 180 steps a minute', 'tilt')}
</section>
<section class="band" id="standards">
  <div class="pair">
    {shot('app-ring', 'BadgeFit Home: the ready ring with four of six standards passing', 'tilt')}
    <div class="pair-text">
      <h2>Six standards. Pass every one.</h2>
      <div class="grid six">{stds}</div>
      <p class="note">The NSW applicant standards as BadgeFit trains them. Always check your service's current requirements.</p>
    </div>
  </div>
</section>
<section class="band hayden" id="hayden">
  <h2>Your Hayden starts grey</h2>
  <p class="sub">Sign up and he takes your colour. Train and he earns gear. Pass, and he wears the gold badge.</p>
  {journey}
</section>
<section class="band dark" id="plans">
  <h2>A plan for where you are</h2>
  <table class="cmp"><thead><tr><th></th><th>PCT prep<small>12 weeks to your test</small></th><th>Academy prep<small>After you pass</small></th></tr></thead><tbody><tr><th>Mon</th><td><i class="dot g" aria-hidden="true"></i>Chest, shoulders</td><td><i class="dot g" aria-hidden="true"></i>Squat, pull‑ups</td></tr><tr><th>Tue</th><td><i class="dot r" aria-hidden="true"></i>Beep intervals</td><td><i class="dot r" aria-hidden="true"></i>Steady run</td></tr><tr><th>Wed</th><td><i class="dot g" aria-hidden="true"></i>Legs and power</td><td><i class="dot g" aria-hidden="true"></i>Circuit</td></tr><tr><th>Thu</th><td><i class="dot r" aria-hidden="true"></i>Easy run</td><td><i class="dot r" aria-hidden="true"></i>Intervals</td></tr><tr><th>Fri</th><td><i class="dot g" aria-hidden="true"></i>Back, arms</td><td><i class="dot g" aria-hidden="true"></i>Deadlift, press</td></tr><tr><th>Sat</th><td><i class="dot r" aria-hidden="true"></i>Steady run</td><td><i class="dot r" aria-hidden="true"></i>Long run</td></tr><tr><th>Sun</th><td><i class="dot x" aria-hidden="true"></i>Rest</td><td><i class="dot x" aria-hidden="true"></i>Rest, mobility</td></tr></tbody></table>
  <p class="legend"><span><i class="dot g"></i>Gym</span><span><i class="dot r"></i>Run</span><span><i class="dot x"></i>Rest</span></p>
  <p class="note light">For beginners and intermediates. Weights go up as you get stronger; runs build slowly.</p>
</section>
<section class="band" id="pricing">
  <h2>Guest, Free or Prep Pass</h2>
  <p class="sub banner">Coming after the beta. Everything is free while we test.</p>
  <div class="tiers">
    <article class="tier-card">
      <h3>Guest</h3><p class="tc-sub">Stay as long as you like</p>
      <ul class="tc-list"><li>{ic("check","tc-i")}Today's session and runs with Hayden</li><li>{ic("check","tc-i")}The simple plan</li><li>{ic("check","tc-i")}Read the community</li></ul>
      <p class="tc-price">Free</p>
    </article>
    <article class="tier-card">
      <h3>Free account</h3><p class="tc-sub">Your plan, saved</p>
      <ul class="tc-list"><li>{ic("calendar","tc-i")}A plan to your test date</li><li>{ic("target","tc-i")}The ready ring and test days</li><li>{ic("shield","tc-i")}Your Hayden: colour and gear</li><li>{ic("check","tc-i")}Saved on every phone</li><li>{ic("check","tc-i")}Move a day, swap an exercise</li><li>{ic("check","tc-i")}Ask Hayden 3 times a week</li></ul>
      <p class="tc-price">Free</p>
    </article>
    <article class="tier-card best">
      <span class="tc-tag">Best value</span>
      <h3>Prep Pass</h3><p class="tc-sub">Your 12-week PCT block, coached</p>
      <ul class="tc-list"><li>{ic("footprints","tc-i")}Pace sound on every run</li><li>{ic("sparkles","tc-i")}Plan changes every week to fit you</li><li>{ic("calendar","tc-i")}Easy week before your test</li><li>{ic("speaker","tc-i")}Say your sets out loud</li><li>{ic("check","tc-i")}Ask Hayden any time</li></ul>
      <p class="tc-price">$19 <small>once, 12 weeks</small></p>
      <p class="tc-alt">or $9.99 a month, cancel any time</p>
    </article>
  </div>
</section>
<section class="beta" id="join">
  <h2>Get in before it goes public</h2>
  <div class="qr"><img src="img/beta-qr.png" alt="QR code: scan with your iPhone camera to open the BadgeFit beta" width="180" height="180" loading="lazy"><p class="fine">Scan with your iPhone camera</p></div>
  <ol class="steps">
    <li><b>1</b><span>Get <a href="https://apps.apple.com/app/testflight/id899247664">TestFlight</a> from the App Store</span></li>
    <li><b>2</b><span>Open the beta link on your iPhone and tap Accept</span></li>
    <li><b>3</b><span>Install BadgeFit and start week 1</span></li>
  </ol>
  <a class="btn" href="{JOIN}">{ic("download","bi")}Join the beta</a>
  <p class="fine">Free while in beta. Tell us what to fix: that is the deal.</p>
</section>
</main>
<footer>
  {social()}
  <p><b>BadgeFit</b> · Train for the PCT. Earn the badge.</p>
  <p>BadgeFit is an independent training app and is not affiliated with, or endorsed by, any police service. General information only, not medical advice: see your doctor before starting a new training plan.</p>
  <p>Built on <a href="https://github.com/DuarteSantos8/openGym">openGym</a>, free software under the AGPL-3.0. <a href="https://github.com/Mokedad/BadgeFit">Source code</a>.</p>
</footer>
</body>
</html>
'''
open(D + 'index.html', 'w').write(index)

links = f'''<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>BadgeFit</title>
<meta name="description" content="BadgeFit: train for the police PCT. Join the free iPhone beta.">
<meta name="theme-color" content="#0b1a36">
<link rel="icon" href="img/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="style.css">
</head>
<body class="lp">
<div class="lp-hb" aria-hidden="true">{B4['hayden']}</div>
<main class="lp-main">
  <header class="lp-hero">
    {shield.replace('class="logo"', 'class="lp-logo"')}
    <h1>BadgeFit</h1>
    <p>Train for the PCT. Earn the badge.</p>
  </header>
  <nav class="lp-btns">
    <a class="lp-btn gold" href="{JOIN}">{ic("download","bi")}Beta Test</a>
    <a class="lp-btn" href="./">{ic("target","bi")}What BadgeFit does</a>
  </nav>
  <div class="lp-soc">
    <a href="{IG}" aria-label="Instagram">{brand('instagram')}</a>
    <a href="{TT}" aria-label="TikTok">{brand('tiktok')}</a>
    <a href="{FB}" aria-label="Facebook">{brand('facebook')}</a>
  </div>
  <p class="lp-fine">Not affiliated with any police service</p>
</main>
</body>
</html>
'''
open(D + 'links.html', 'w').write(links)
print('pages ok')
