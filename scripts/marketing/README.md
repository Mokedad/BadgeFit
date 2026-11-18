# Reels for BadgeFit's socials

`cards.js` draws the transparent overlay cards (caption, the cartoon goal card, the ad lines,
"Comment PCT") into `cards/`; `make-reel.sh` puts one reel together from your clips in `in/`
(your own run and workout clips, no talking; used in name order): steadied, 1080x1920, 30 fps, montage muted
(music is added inside Instagram or TikTok).

    node cards.js "$PWD"            # needs Playwright
    ./make-reel.sh in cards out/reel.mp4

The format and scripts are in docs/dev/BADGEFIT_LAUNCH_POSTS.md. Never put exercise media from
the app in a reel (licensed to openGym only), and only film people who said yes.

`tierlist-anim.js` renders the animated tier list reel frame by frame into `fr/` (then
`ffmpeg -framerate 30 -i fr/%04d.jpg ... tierlist.mp4`): a hook in the first second, a countdown
from C to a hidden number 1, a reveal, "Comment PCT". Steady motion only.

## Music

`python3 music-bed.py out.wav 12` makes an original, royalty-free background track of that many
seconds (100 bpm, soft pad, bass and light drums). Mux it under a video with ffmpeg and
`-af loudnorm=I=-16:TP=-1.5`. No voice-overs for now: the owner will use a separate app for those.
