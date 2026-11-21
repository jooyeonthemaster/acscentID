#!/bin/bash
# 앱 새 버전 배포 — 배포 키로 빌드해 public/kiosk-android 에 올린다.
# 그다음 git commit · push(main) 하면 Vercel 배포 뒤 기기들이 30분 안에, 손님이 없을 때(5분 무터치) 스스로 업데이트한다.
#   ./publish.sh            버전을 하나 올려(1.1.0 → 1.1.1) 배포
#   ./publish.sh 1.2.0      버전 이름을 정해서
#   ./publish.sh --keep     지금 버전(version.properties) 그대로 배포(처음 한 번)
set -euo pipefail
cd "$(dirname "$0")"

export JAVA_HOME="${JAVA_HOME:-$(ls -d "$HOME"/Library/Android/jdk/*/Contents/Home | head -1)}"
SIGNING="${ACSCENT_KIOSK_SIGNING:-$HOME/Library/Android/acscent-kiosk-signing.properties}"
[ -f "$SIGNING" ] || { echo "배포 서명 키가 없습니다: $SIGNING (README '서명 키')"; exit 1; }
[ -f local.properties ] || echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties

code=$(grep '^versionCode=' version.properties | cut -d= -f2)
name=$(grep '^versionName=' version.properties | cut -d= -f2)
if [ "${1:-}" != "--keep" ]; then
  code=$((code + 1))
  name="${1:-$(echo "$name" | awk -F. '{printf "%s.%s.%s", $1, $2, $3 + 1}')}"
  printf 'versionCode=%s\nversionName=%s\n' "$code" "$name" > version.properties
fi

./gradlew assembleRelease -q
APK=app/build/outputs/apk/release/app-release.apk
OUT=../../public/kiosk-android
mkdir -p "$OUT" release
rm -f "$OUT"/acscent-kiosk-*.apk
cp "$APK" "$OUT/acscent-kiosk-$code.apk"
cp "$APK" release/acscent-kiosk.apk
SHA=$(shasum -a 256 "$APK" | cut -d' ' -f1)
SIZE=$(wc -c < "$APK" | tr -d ' ')
cat > "$OUT/latest.json" <<JSON
{
  "versionCode": $code,
  "versionName": "$name",
  "url": "/kiosk-android/acscent-kiosk-$code.apk",
  "sha256": "$SHA",
  "size": $SIZE,
  "publishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
echo "v$name ($code) 준비 완료 → public/kiosk-android/"
echo "이제 git add tools/kiosk-android/version.properties public/kiosk-android && git commit && git push"
