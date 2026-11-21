#!/bin/bash
# AC'SCENT 키오스크 안드로이드 앱 — USB 로 꽂힌 기기에 배포 서명 앱을 깔고, 기기 관리자(자동 업데이트 · 키오스크 잠금)로 만든다.
# 한 번만 하면 된다. 그 뒤 앱 업데이트는 publish.sh → push 로 기기가 스스로 받는다.
#   ./install.sh                 운영 사이트(https://www.acscent.co.kr/kiosk)
#   ./install.sh http://localhost:3014/kiosk   맥의 개발 서버(USB 로 포트를 잇는다)
# 필요: ~/Library/Android/{jdk,sdk} · 배포 서명 키(README.md '맥 준비' · '서명 키')
set -euo pipefail
cd "$(dirname "$0")"

URL="${1:-https://www.acscent.co.kr/kiosk}"
export JAVA_HOME="${JAVA_HOME:-$(ls -d "$HOME"/Library/Android/jdk/*/Contents/Home | head -1)}"
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
PKG=kr.co.acscent.kiosk
SIGNING="${ACSCENT_KIOSK_SIGNING:-$HOME/Library/Android/acscent-kiosk-signing.properties}"
[ -f "$SIGNING" ] || { echo "배포 서명 키가 없습니다: $SIGNING (README '서명 키')"; exit 1; }

[ -f local.properties ] || echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
./gradlew assembleRelease -q
APK=app/build/outputs/apk/release/app-release.apk
mkdir -p release && cp "$APK" release/acscent-kiosk.apk

# 서명이 다른 예전 앱(개발용 디버그 서명)이 깔려 있으면 지우고 깐다 — 기기 관리자인 앱은 지울 수 없다(관리 메뉴에서 먼저 해제)
OUT=$("$ADB" install -r -g "$APK" 2>&1) || true
echo "$OUT" | tail -1
if echo "$OUT" | grep -q "INSTALL_FAILED_UPDATE_INCOMPATIBLE"; then
  echo "서명이 다른 예전 앱을 지우고 다시 깝니다(이 기기 설정 · 발권 번호가 처음으로 돌아갑니다)"
  "$ADB" uninstall $PKG
  "$ADB" install -g "$APK"
elif ! echo "$OUT" | grep -q "Success"; then
  echo "설치 실패"; exit 1
fi

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

# 기기 관리자(device owner) — 묻지 않는 자동 업데이트 · 키오스크 잠금. 기기에 구글 계정 등이 로그인돼 있으면 안 된다
if "$ADB" shell dpm list-owners 2>/dev/null | grep -q "$PKG"; then
  echo "이미 기기 관리자입니다"
else
  DPM=$("$ADB" shell dpm set-device-owner $PKG/.AdminReceiver 2>&1) || true
  if echo "$DPM" | grep -qi "success"; then
    echo "기기 관리자로 정했습니다 — 자동 업데이트가 묻지 않고 깔리고 키오스크 잠금이 걸립니다"
  else
    echo "기기 관리자로 정하지 못했습니다: $(echo "$DPM" | tail -1)"
    echo "  · 기기에 로그인된 계정(설정 → 계정)이 있으면 지우고 다시 실행하세요. 그래도 안 되면 공장 초기화 뒤 계정 없이 다시."
    echo "  · 그동안 앱 자동 업데이트는 설치 확인 창이 뜨는 방식으로 돕니다(직원이 한 번 누름)."
  fi
fi

case "$URL" in
  http://localhost:*|http://127.0.0.1:*)
    PORT="${URL#http://*:}"; PORT="${PORT%%/*}"
    "$ADB" reverse tcp:$PORT tcp:$PORT
    echo "개발 서버 포트 $PORT 를 USB 로 이었습니다(케이블을 뽑으면 끊깁니다)"
    ;;
esac

"$ADB" shell am force-stop $PKG || true
"$ADB" shell am start -n $PKG/.MainActivity --es url "$URL"
echo "설치 완료 → $URL"
