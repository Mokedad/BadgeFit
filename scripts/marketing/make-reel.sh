#!/usr/bin/env bash
# One BadgeFit reel: chat (caption, then the cartoon card), two montage shots with the ad lines,
# and the ask. Every clip is steadied, framed to 1080x1920, 30 fps. Montage shots are muted (add
# music inside Instagram or TikTok). Usage: ./make-reel.sh in/ cards/ out/reel.mp4
set -euo pipefail
IN=${1:-in}; C=${2:-cards}; OUT=${3:-out/reel.mp4}
V='deshake,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1'
ov(){ echo "[$1:v]$V,trim=$2:$3,setpts=PTS-STARTPTS[b$4];[$5:v]format=rgba,fade=t=in:st=0:d=0.3:alpha=1[o$4];[b$4][o$4]overlay=0:0:shortest=1[v$4]"; }
ffmpeg -hide_banner -loglevel error -y \
  -i "$IN/chat.mp4" -i "$IN/run1.mp4" -i "$IN/run2.mp4" -i "$IN/ask.mp4" \
  -loop 1 -t 5 -i "$C/chat.png" -loop 1 -t 4 -i "$C/goal.png" -loop 1 -t 6 -i "$C/ad1.png" -loop 1 -t 6 -i "$C/ad2.png" -loop 1 -t 4 -i "$C/ask.png" \
  -f lavfi -t 12 -i anullsrc=r=48000:cl=stereo \
  -filter_complex "
$(ov 0 0 5 1 4);
$(ov 0 5 9 2 5);
$(ov 1 0 6 3 6);
$(ov 2 0 6 4 7);
$(ov 3 0 4 5 8);
[0:a]atrim=0:9,asetpts=PTS-STARTPTS,aresample=48000[a1];
[9:a]atrim=0:12,asetpts=PTS-STARTPTS[a2];
[3:a]atrim=0:4,asetpts=PTS-STARTPTS,aresample=48000[a3];
[v1][v2][v3][v4][v5]concat=n=5:v=1:a=0[v];
[a1][a2][a3]concat=n=3:v=0:a=1[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$OUT"
echo "made $OUT"
