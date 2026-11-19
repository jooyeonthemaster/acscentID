#!/bin/bash
# ffmpeg 경로를 찍는다 — PATH 에 있으면 그것, 없으면 ~/.cache/kiosk-video-flow/venv 에 imageio-ffmpeg 를 깔아 그 안의 것(처음 한 번 1분쯤)
if command -v ffmpeg >/dev/null 2>&1; then command -v ffmpeg; exit 0; fi
V="$HOME/.cache/kiosk-video-flow/venv"
if [ ! -x "$V/bin/python" ]; then python3 -m venv "$V" >&2 && "$V/bin/pip" install -q imageio-ffmpeg >&2; fi
"$V/bin/python" -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"
