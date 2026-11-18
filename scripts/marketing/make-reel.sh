#!/usr/bin/env bash
# One BadgeFit reel from your own run and workout clips, no talking: the hook as text, the
# cartoon goal card, two ad lines, then "Comment PCT". Every clip is steadied, framed to
# 1080x1920, 30 fps and muted (add music inside Instagram or TikTok).
# Usage: ./make-reel.sh in/ cards/ out/reel.mp4   (clips in in/, any names, used in name order;
# fewer than five clips are reused in turn)
set -euo pipefail
IN=${1:-in}; C=${2:-cards}; OUT=${3:-out/reel.mp4}
mapfile -t CLIPS < <(ls "$IN"/*.{mp4,mov,MOV,MP4} 2>/dev/null | sort)
[ ${#CLIPS[@]} -gt 0 ] || { echo "no clips in $IN"; exit 1; }
CARDS=(hook goal ad1 ad2 ask); SECS=(4 4 5 5 4)
V='deshake,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1'
ARGS=(); F=""; n=${#CLIPS[@]}
for i in 0 1 2 3 4; do ARGS+=(-i "${CLIPS[$((i % n))]}"); done
for i in 0 1 2 3 4; do ARGS+=(-loop 1 -t "${SECS[$i]}" -i "$C/${CARDS[$i]}.png"); done
for i in 0 1 2 3 4; do
  F+="[$i:v]$V,trim=0:${SECS[$i]},setpts=PTS-STARTPTS[b$i];[$((i + 5)):v]format=rgba,fade=t=in:st=0:d=0.3:alpha=1[o$i];[b$i][o$i]overlay=0:0:shortest=1[v$i];"
done
F+="[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[v]"
ffmpeg -hide_banner -loglevel error -y "${ARGS[@]}" -f lavfi -t 22 -i anullsrc=r=48000:cl=stereo -filter_complex "$F" \
  -map "[v]" -map 10:a -shortest -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "$OUT"
echo "made $OUT"
