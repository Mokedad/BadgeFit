# BadgeFit website

Two static pages, no build step: `index.html` (the landing page for beta testers) and
`links.html` (the link-in-bio page for Instagram and TikTok), with `style.css` and `img/`.
deploy/setup.sh copies this folder onto the server (SITE_DOMAIN, badgefit.com.au).

## Placeholders to fill

| Placeholder      | What goes there                                         |
|------------------|---------------------------------------------------------|
| Join the beta    | Until the TestFlight public link is in, the buttons open an email to badgefit.au@gmail.com. Replace every `mailto:badgefit.au@gmail.com?subject=...` join link with the TestFlight link. |
| Socials          | instagram.com/badgefit.au, tiktok.com/@badgefit.au, the Facebook page (filled in). |
| Source code      | github.com/Mokedad/BadgeFit: must be public for the AGPL licence. |

## Screenshots

`img/` holds screenshots of the app without exercise pictures: the exercise media are licensed
to openGym only and must not appear on the website. Retake them after design changes.
