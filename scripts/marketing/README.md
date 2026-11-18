# Reels for BadgeFit's socials

`cards.js` draws the transparent overlay cards (caption, the cartoon goal card, the ad lines,
"Comment PCT") into `cards/`; `make-reel.sh` puts one reel together from four clips in `in/`
(`chat.mp4`, `run1.mp4`, `run2.mp4`, `ask.mp4`): steadied, 1080x1920, 30 fps, montage muted
(music is added inside Instagram or TikTok).

    node cards.js "$PWD"            # needs Playwright
    ./make-reel.sh in cards out/reel.mp4

The format and scripts are in docs/dev/BADGEFIT_LAUNCH_POSTS.md. Never put exercise media from
the app in a reel (licensed to openGym only), and only film people who said yes.
