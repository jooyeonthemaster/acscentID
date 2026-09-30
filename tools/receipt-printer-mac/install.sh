#!/bin/bash
# 맥 개발 PC에 OKPOS OK30 영수증 프린터를 'OK30' 이름으로 등록한다 (매장 윈도우 PC와 무관).
# 사용: sudo ./install.sh
set -euo pipefail
cd "$(dirname "$0")"
[ "$(id -u)" = 0 ] || { echo "sudo 로 실행하세요: sudo $0"; exit 1; }
URI=$(lpinfo -v 2>/dev/null | awk '/usb:\/\/SEWOO/{print $2; exit}')
[ -n "$URI" ] || { echo "프린터가 USB 로 보이지 않습니다 (전원·케이블 확인)"; exit 1; }
[ -x rastertook30 ] || clang -O2 -o rastertook30 rastertook30.c -lcups
install -d -o root -g wheel -m 755 /Library/Printers/ACSCENT/Filter
install -o root -g wheel -m 755 rastertook30 /Library/Printers/ACSCENT/Filter/rastertook30
lpadmin -p OK30 -E -v "$URI" -P OK30.ppd -D "OKPOS OK30" -L "개발용 맥"
echo "등록 완료: $URI"
lpstat -p OK30
