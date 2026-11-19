#!/bin/bash
# 생성 원본 → 화면용 mp4: 소리 빼고(생성 모델이 generate_audio:false 여도 소리 트랙을 붙인다) · 크기 맞춰 자르고 · 30fps · H.264 · faststart(받으면서 바로 재생)
#   encode.sh <원본 mp4 또는 폴더> <내보낼 폴더> [가로=720] [세로=1280] [crf=23]
# 폴더면 그 안의 *.mp4 전부. 이름은 그대로. 끝에 파일마다 크기를 찍는다.
set -e
FF=$("$(dirname "$0")/ff.sh")
IN="$1"; OUT="$2"; W="${3:-720}"; H="${4:-1280}"; CRF="${5:-23}"
[ -z "$IN" ] || [ -z "$OUT" ] && { echo "사용: encode.sh <원본|폴더> <내보낼 폴더> [가로] [세로] [crf]"; exit 1; }
mkdir -p "$OUT"
if [ -d "$IN" ]; then FILES=("$IN"/*.mp4); else FILES=("$IN"); fi
for f in "${FILES[@]}"; do
  n=$(basename "$f")
  "$FF" -y -loglevel error -i "$f" -vf "fps=30,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1" \
    -an -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p -movflags +faststart "$OUT/$n"
  printf '%s %s KB\n' "$n" "$(( $(stat -f %z "$OUT/$n" 2>/dev/null || stat -c %s "$OUT/$n") / 1024 ))"
done
