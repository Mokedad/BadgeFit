# BadgeFit website

Two static pages, no build step: `index.html` (the landing page for beta testers) and
`links.html` (the link-in-bio page for Instagram and TikTok), with `style.css` and `img/`.
deploy/setup.sh copies this folder onto the server (SITE_DOMAIN, badgefit.com.au).

## Placeholders to fill

| Placeholder      | What goes there                                         |
|------------------|---------------------------------------------------------|
| `TESTFLIGHT_URL` | The TestFlight public link (App Store Connect)          |
| `INSTAGRAM_URL`  | The Instagram profile                                   |
| `TIKTOK_URL`     | The TikTok profile                                      |
| `SOURCE_URL`     | The public source code (the AGPL licence requires it)   |

## Screenshots

`img/` holds screenshots of the app without exercise pictures: the exercise media are licensed
to openGym only and must not appear on the website. Retake them after design changes.
