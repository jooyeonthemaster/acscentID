# AC'SCENT 키오스크 — 안드로이드 앱

프린터가 없는 안드로이드 기기(첫 기기: SUNMI `TOSS_Front` · RK3399 · 800×1280 세로 · Android 11 Phh-Treble GSI)에서
우리 키오스크 화면(`/kiosk`)을 전체 화면으로 돌리는 웹뷰 앱. 결과(영수증)는 **인쇄 대신 휴대폰 QR** 로 받는다.

## 앱이 하는 일

- 전체 화면 · 화면 꺼짐 막기 · 뒤로 가기 막기 · 우리 사이트(`*.acscent.co.kr`, `localhost`, 설정한 시작 주소) 밖으로 나가지 않기
- 카메라 · 마이크를 묻지 않고 허용(우리 주소만), 영상 · 소리를 터치 없이 재생, 영상 대기 그림(회색 재생 단추) 없앰
- 배율: 매장 키오스크의 설계 크기 **CSS 560×996** 이 화면에 잘림 없이 다 들어가게(800×1280 → CSS 622×996). 남는 폭은 각 화면 바탕 · 영상이 채운다
- 웹에 `window.AcscentAndroid` 를 건다 → 웹(`src/lib/kiosk/kiosk-bridge.ts` `androidBridge`)이 "프린터 없는 매장 기기"로 돈다
  - DEMO 워터마크 없음, 기본 운영 모드 **SCENT! 하린 루트**(`ai-perfumer-harin`) — 관리자 창에서 이 기기 모드를 고르면 그쪽이 먼저
  - 결과 · 영수증 버튼이 **휴대폰으로 받기** → 영수증 원판을 올리고(`/api/kiosk/share`, 24시간) QR 을 띄운다
  - 조향 번호(발권 번호)는 앱이 그날 0001 부터 매긴다 — 손님 휴대폰의 레시피에 찍혀 직원이 보고 조향한다
- 인터넷이 끊기거나 서버가 5xx 면 안내 화면 → 15초마다 다시 연결. 웹뷰가 죽으면 새로 만든다
- **새 배포 자동 반영**: 10분마다 시작 주소의 배포 번호(Vercel `dpl_…`)를 확인하고, 바뀌었으면 5분 동안 터치가 없을 때 새로고침한다(손님이 쓰는 중에는 안 바뀜). 웹 화면 수정은 main 에 올리면 기기가 알아서 받는다
- **앱 자동 업데이트**: 켜고 2분 뒤, 그 뒤 30분마다 `https://www.acscent.co.kr/kiosk-android/latest.json` 을 보고, 새 버전이면
  5분 동안 터치가 없을 때 APK 를 받아(SHA-256 확인) 깐다. 깔리면 앱이 다시 뜬다. 배포는 아래 '앱 업데이트 배포'
- **기기 관리자(device owner)**: `install.sh` 가 한 번 정한다 → 업데이트가 **묻지 않고** 깔리고, **키오스크 잠금**(상태 표시줄 · 홈 · 최근 앱 막기,
  잠금 화면 끔, 홈 앱 고정)이 걸린다. 기기 관리자가 아니면 업데이트 때 안드로이드 설치 확인 창이 뜬다(직원이 한 번 누름)
- 전원을 켜면 바로 뜬다(홈 앱 + 부팅 수신)

## 관리

- **관리 메뉴**: 화면 **왼쪽 위 모서리를 4초 안에 7번**(오른쪽 위는 웹 관리자 창) → PIN(기본 `110619`) → 새로고침 · 시작 주소 바꾸기 · 캐시 지우기 ·
  **앱 업데이트 지금 확인** · 안드로이드 설정(잠금을 잠시 풂, 돌아오면 다시) · 앱 닫기 · **키오스크 잠금 · 기기 관리자 해제**
- 웹 관리자 창(기존 키오스크와 같은 오른쪽 위 핫스팟)의 **앱 종료** 도 이 관리 메뉴를 연다
- adb 로 설정(기기에 저장):
  ```bash
  adb shell am start -n kr.co.acscent.kiosk/.MainActivity --es url https://www.acscent.co.kr/kiosk
  #  --es mode ai-perfumer-harin   기본 운영 모드
  #  --es pin 110619               관리 메뉴 PIN
  #  --ei cssWidth 560             화면 CSS 폭 고정(-1 이면 자동: 560×996 이 다 들어가게 — 기본)
  #  --ez clearCache true          캐시 · 저장소 지우기   --ez reset true  설정 지우기
  #  --ez admin true               관리 메뉴 PIN 창 열기
  #  --ez checkUpdate true         앱 업데이트 바로 확인   --es updateUrl <latest.json 주소>
  ```
- 웹뷰 원격 디버깅: 맥 Chrome `chrome://inspect` (USB 연결 시)

## 맥 준비 (한 번)

`~/Library/Android` 아래에 JDK 17(Temurin) · Android SDK(cmdline-tools, platform-tools, platforms;android-34, build-tools;34.0.0).
2026-11-21 이 맥에는 깔아 두었다. 새 맥이면:

```bash
mkdir -p ~/Library/Android/jdk ~/Library/Android/sdk && cd ~/Library/Android
curl -L -o jdk.tgz "https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jdk/hotspot/normal/eclipse" && tar -xzf jdk.tgz -C jdk
curl -L -o ct.zip https://dl.google.com/android/repository/commandlinetools-mac-13114758_latest.zip && unzip -q ct.zip -d sdk/tmp && mkdir -p sdk/cmdline-tools && mv sdk/tmp/cmdline-tools sdk/cmdline-tools/latest
export JAVA_HOME=$(ls -d ~/Library/Android/jdk/*/Contents/Home)
yes | sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=$PWD/sdk --licenses
sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=$PWD/sdk "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

## 서명 키 (중요 · 백업)

자동 업데이트는 **처음 깐 앱과 같은 키로 서명한 APK 만** 깔린다(안드로이드가 확인 — 사이트의 파일이 바뀌어도 다른 앱으로 바뀌지 않는다).
키는 저장소 밖에 있다(2026-11-21 만듦, 인증서 SHA-256 `16:42:69:A1:…:EE:D0`):

- `~/Library/Android/acscent-kiosk-release.jks` — 키
- `~/Library/Android/acscent-kiosk-signing.properties` — 경로 · 비밀번호

**두 파일을 안전한 곳(비밀번호 관리자 · 회사 드라이브 비공개 폴더)에 백업한다.** 잃어버리면 기기마다 USB 로 앱을 지우고 다시 깔아야 한다.
다른 맥에서 빌드하려면 두 파일을 같은 자리에 두거나 `ACSCENT_KIOSK_SIGNING=<properties 경로>` 를 준다.

## 처음 설치 (기기마다 한 번)

기기를 USB 로 꽂고(USB 디버깅 켜기 · 이 맥 허용), 기기에 로그인된 계정이 없게(기기 관리자 조건):

```bash
tools/kiosk-android/install.sh                              # 운영 사이트
tools/kiosk-android/install.sh http://localhost:3014/kiosk  # 맥 개발 서버(npx next dev --webpack -p 3014)
```

배포 서명으로 빌드해 깔고(예전 디버그 서명 앱이 있으면 지우고), 홈 앱 · 화면 켜 두기 · 잠금 화면 끄기 · **기기 관리자**까지 정한다.
APK 는 `tools/kiosk-android/release/acscent-kiosk.apk` · `public/kiosk-android/acscent-kiosk-<버전>.apk` 에도 있다.

## 앱 업데이트 배포 (그 뒤로는 USB 없이)

```bash
tools/kiosk-android/publish.sh          # 버전 올려(1.1.0 → 1.1.1) 배포 서명 빌드 → public/kiosk-android/ 에 APK · latest.json
git add tools/kiosk-android public/kiosk-android && git commit -m "..." && git push   # main → Vercel 배포
```

기기들은 30분 안에, 손님이 없을 때 스스로 깐다. 바로 받게 하려면 관리 메뉴의 **앱 업데이트 지금 확인**.
웹 화면(`src/`)만 고친 거라면 앱 배포는 필요 없다 — 기기가 새 배포를 알아서 새로고침한다.

## 주의

- 이 앱이 쓰는 웹 기능(안드로이드 브리지 · 휴대폰 QR 영수증 · 공유 종류 `scent`/`receipt`)은 **운영에 배포된 뒤에야** 운영 주소에서 동작한다.
  배포 전에는 운영 주소로 열면 예전처럼(DEMO 워터마크 · 매장 모드 · PNG 저장) 보인다.
- 발권 번호는 기기마다 따로 매긴다(기기 두 대면 번호가 겹칠 수 있다).
- 기기 관리자인 앱은 지울 수 없다 — 지우려면 관리 메뉴에서 **기기 관리자 해제** 뒤에.
- `./gradlew assembleDebug`(디버그 서명)로 만든 APK 는 운영 기기(배포 서명) 위에 덮어 깔리지 않는다 — 개발용.
