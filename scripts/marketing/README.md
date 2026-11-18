# Reels for BadgeFit's socials

`cards.js` draws the transparent overlay cards (caption, the cartoon goal card, the ad lines,
"Comment PCT") into `cards/`; `make-reel.sh` puts one reel together from your clips in `in/`
(your own run and workout clips, no talking; used in name order): steadied, 1080x1920, 30 fps, montage muted
(music is added inside Instagram or TikTok).

    node cards.js "$PWD"            # needs Playwright
    ./make-reel.sh in cards out/reel.mp4

The format and scripts are in docs/dev/BADGEFIT_LAUNCH_POSTS.md. Never put exercise media from
the app in a reel (licensed to openGym only), and only film people who said yes.
