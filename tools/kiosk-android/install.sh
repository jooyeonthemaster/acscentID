#!/bin/bash
# AC'SCENT 키오스크 안드로이드 앱 — 빌드하고 USB 로 꽂힌 기기에 깔아 키오스크로 만든다.
#   ./install.sh                 운영 사이트(https://www.acscent.co.kr/kiosk)
#   ./install.sh http://localhost:3014/kiosk   맥의 개발 서버(USB 로 포트를 잇는다)
# 필요: ~/Library/Android/{jdk,sdk} (README.md '맥 준비')
set -euo pipefail
cd "$(dirname "$0")"

URL="${1:-https://www.acscent.co.kr/kiosk}"
export JAVA_HOME="${JAVA_HOME:-$(ls -d "$HOME"/Library/Android/jdk/*/Contents/Home | head -1)}"
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
PKG=kr.co.acscent.kiosk

[ -f local.properties ] || echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
./gradlew assembleDebug -q
APK=app/build/outputs/apk/debug/app-debug.apk
mkdir -p release && cp "$APK" release/acscent-kiosk.apk

"$ADB" install -r -g "$APK"
# 카메라 · 마이크 권한(설치할 때 -g 로 이미 주지만 한 번 더)
"$ADB" shell pm grant $PKG android.permission.CAMERA || true
"$ADB" shell pm grant $PKG android.permission.RECORD_AUDIO || true
# 홈 앱으로 — 전원을 켜면 바로 키오스크, 홈 버튼을 눌러도 키오스크
"$ADB" shell cmd package set-home-activity $PKG/.MainActivity || true
# 부팅 직후 스스로 화면을 띄울 수 있게(Android 10+ 백그라운드 실행 제한)
"$ADB" shell appops set $PKG SYSTEM_ALERT_WINDOW allow || true
# 화면이 꺼지지 않게 · 잠금 화면 끄기 · 전체 화면 안내 한 번 보기 처리
"$ADB" shell locksettings set-disabled true || true
"$ADB" shell svc power stayon true || true
"$ADB" shell settings put system screen_off_timeout 2147483647 || true
"$ADB" shell settings put secure lockscreen.disabled 1 || true
"$ADB" shell settings put secure immersive_mode_confirmations confirmed || true

case "$URL" in
  http://localhost:*|http://127.0.0.1:*)
    PORT="${URL#http://*:}"; PORT="${PORT%%/*}"
    "$ADB" reverse tcp:$PORT tcp:$PORT
    echo "개발 서버 포트 $PORT 를 USB 로 이었습니다(케이블을 뽑으면 끊깁니다)"
    ;;
esac

"$ADB" shell am start -n $PKG/.MainActivity --es url "$URL"
echo "설치 완료 → $URL"
