# 키오스크 로컬 인쇄 브리지

매장 PC에서 **Electron 셸 없이** 영수증을 실물로 뽑기 위한 구성입니다.
브라우저는 USB 프린터에 바이트를 직접 보낼 수 없으므로, 같은 PC에서 이 작은 서비스를 띄우고
키오스크 화면이 `localhost`로 인쇄를 부탁합니다. 화면 코드는 `window.kiosk`(Electron 셸)와
동일한 계약(`printReceipt` / `nextTicket`)을 쓰므로, 나중에 셸을 올려도 앱은 그대로입니다.

```
[키오스크 화면] --(POST /print, PNG 원판)--> [인쇄 브리지] --(ESC/POS raw)--> [USB 감열 프린터]
```

---

## 1. 프린터를 OS에 등록한다

libusb를 쓰지 않고 **OS 프린터 큐의 raw 전송**을 씁니다. 드라이버 문제가 가장 적습니다.

**macOS**
1. 시스템 설정 → 프린터 및 스캐너 → USB 프린터 추가
   드라이버는 `Generic` → `Generic PostScript`가 아니라 **`Generic` → `Raw`** 또는
   제조사가 제공하는 POS 드라이버를 고릅니다.
2. 등록된 이름 확인:
   ```bash
   lpstat -p
   # printer POS80 is idle.  ← 이 'POS80'이 KIOSK_PRINTER 값
   ```

**Windows**
1. 프린터 설치 후 **공유**를 켜고 공유 이름을 짧게 지정합니다 (예: `POS80`).
2. `KIOSK_PRINTER=\\localhost\POS80` 형태로 씁니다.

## 2. 헤드 도트 폭을 확인한다

영수증 원판은 기본 **512dot**으로 그려집니다. 80mm 감열기는 **576dot**인 기종이 많습니다.

- 프린터 사양서에서 "dots/line"을 확인하거나, 셀프 테스트 인쇄(용지함 열고 FEED 누른 채 전원)로
  출력되는 폭을 봅니다.
- **576이면** `KIOSK_PRINTER_DOTS=576`을 주세요. 브리지가 원판을 가운데 정렬로 패딩합니다
  (확대하지 않습니다 — 글자가 흐려지므로).
- 원판 자체를 576으로 그리고 싶으면 `renderKioskReceipt(data, { width: 576 })`로 바꿉니다.

## 3. 브리지 실행

이 저장소의 `node_modules`를 그대로 쓰므로 추가 설치가 없습니다(sharp 사용).

```bash
# 먼저 인쇄 없이 점검 — 파일만 만들어 봅니다
KIOSK_PRINT_DRY_RUN=1 node tools/kiosk-print-bridge/server.mjs

# 실제 인쇄
KIOSK_PRINTER="POS80" KIOSK_PRINTER_DOTS=512 node tools/kiosk-print-bridge/server.mjs
```

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `KIOSK_PRINTER` | (없음) | OS에 등록된 프린터 이름 / Windows 공유 경로 |
| `KIOSK_PRINTER_DOTS` | `512` | 프린터 헤드 도트 폭 |
| `KIOSK_PRINT_PORT` | `9110` | 브리지 포트 |
| `KIOSK_PRINT_THRESHOLD` | `170` | 흑백 임계값 (낮출수록 진해짐) |
| `KIOSK_PRINT_DRY_RUN` | — | `1`이면 전송 없이 `~/.acscent-kiosk/spool`에 파일만 |

동작 확인:
```bash
curl http://127.0.0.1:9110/health
# {"ok":true,"printer":"POS80","dots":512,"dryRun":false}
```

## 4. 키오스크 화면을 브리지에 연결

`.env.local`에 한 줄 추가하고 Next를 재시작합니다.

```
NEXT_PUBLIC_KIOSK_PRINT_BRIDGE=http://127.0.0.1:9110
```

일회성 테스트는 주소창에 붙여도 됩니다: `http://localhost:3000/kiosk?printer=http://127.0.0.1:9110`

연결되면 영수증 모달의 버튼이 `PNG 저장` → **`인쇄하기`** 로 바뀌고, 발권 번호가 영수증 원판에
찍혀 나옵니다. 출력에 성공하면 관리자 `/admin/kiosk`의 해당 기록이 **영수증 출력**으로 바뀝니다.

## 5. 매장 구성 (권장)

- **로컬 Next 서버**로 띄웁니다: `npm run build && npm run start`
  `/api/kiosk/analyze`가 **로컬호스트는 기본 허용**이라, 무인증 AI 엔드포인트를 인터넷에 여는
  `KIOSK_ALLOW_REMOTE=1` 없이 운영할 수 있습니다.
  폰 QR 업로드는 그대로 동작합니다 — 사진은 Supabase Storage를 경유하므로 로컬 서버가 받아옵니다.
- 크롬 키오스크 모드:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --kiosk --incognito --disable-pinch --overscroll-history-navigation=0 \
    --autoplay-policy=no-user-gesture-required \
    "http://localhost:3000/kiosk"
  ```
  1080×1920 세로 화면에서는 브라우저 확대를 **약 193%** 로 맞춥니다(CSS 560px 기준 설계).
- 절전/화면보호기 끄기, 자동 로그인, 부팅 시 브리지·Next·크롬 자동 실행.
- 매장 PC에 `SUPABASE_SERVICE_ROLE_KEY`와 AI 키가 놓입니다. 디스크 암호화와 물리 잠금이 필요합니다.

## 문제가 생기면

| 증상 | 확인 |
|---|---|
| 버튼이 계속 `PNG 저장` | `NEXT_PUBLIC_KIOSK_PRINT_BRIDGE` 반영 후 재빌드했는지, `?printer=` 로 임시 확인 |
| `인쇄 서비스에 연결할 수 없습니다` | 브리지가 떠 있는지(`/health`), 포트 충돌 |
| 인쇄는 되는데 내용이 밀림/잘림 | `KIOSK_PRINTER_DOTS` 값이 실제 헤드 폭과 다른 경우 |
| 글자가 흐리거나 뭉개짐 | `KIOSK_PRINT_THRESHOLD`를 150~190 사이에서 조정 |
| 종이는 나오는데 백지 | 드라이버가 raw가 아닐 가능성 — `lp -o raw`가 먹는 큐인지 확인 |

`~/.acscent-kiosk/spool`에 최근 20장의 전송 원본(.bin)이 남습니다. 인쇄가 이상할 때
이 파일을 되짚어 보면 화면 문제인지 프린터 문제인지 가려집니다.
