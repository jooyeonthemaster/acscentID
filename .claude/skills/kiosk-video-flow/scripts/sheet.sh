#!/bin/bash
# 밀착 인화(contact sheet) — 영상 하나가 한 줄, 0.5초마다 한 칸. 얼굴 · 옷이 같은지, 처음 자세로 돌아와 끝나는지 눈으로 본다.
#   sheet.sh <출력.jpg> <영상.mp4> [영상.mp4 …]      (영상은 같은 길이일 때 칸이 맞는다 — 4초면 8칸)
set -e
FF=$("$(dirname "$0")/ff.sh")
OUT="$1"; shift
[ $# -eq 0 ] && { echo "사용: sheet.sh <출력.jpg> <영상.mp4> …"; exit 1; }
IN=(); FC=""; L=""
i=0
for f in "$@"; do IN+=(-i "$f"); FC+="[$i:v]fps=2,scale=120:-1,tile=8x1[r$i];"; L+="[r$i]"; i=$((i+1)); done
if [ $i -eq 1 ]; then FC="${FC%;}"; MAP="[r0]"; else FC+="${L}vstack=$i[o]"; MAP="[o]"; fi
"$FF" -y -loglevel error "${IN[@]}" -filter_complex "$FC" -map "$MAP" -frames:v 1 "$OUT"
echo "$OUT"
