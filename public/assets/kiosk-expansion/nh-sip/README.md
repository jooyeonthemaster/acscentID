# SIP! 게임판 그림(연말 시상식 AI 소믈리에 실험판, 2026-11-17)

오리지널 캐릭터 「해나」(소믈리에)와 1인칭 3D 렌더풍 장소 6곳 — 포도밭 입구 · 포도밭 · 수확 · 와이너리 · 저장고 · 시음실.
Gemini 3 Pro Image(R&D 키)로 캐릭터 시트를 먼저 만들고 그 시트를 넣어 같은 얼굴 · 옷을 유지했다(원본 2K 는 design-review/nh-sip-art, 저장소 밖). 글자 · 로고 없음. 화면용 720×1290 WebP.

- `{gate,vineyard,harvest,winery,cellar,tasting}.webp` — 해나가 들어간 장면(`&lab=game`, SipGameMode.tsx)
- `plate-*.webp` — 해나를 지운 배경판, `hana-*.webp` — 해나 포즈(투명, 높이 1400), `go-*.webp` — 그 장소로 가는 1인칭 길 — 그림으로 움직이던 옛 실험판 2 의 것(2026-11-18 부터 화면에서 쓰지 않음)
- 영상판(`&lab=video` · `&lab=motion`, SipMotion.tsx) — 모두 Wan 3.0, 소리 없음, 720×1280 H.264
  - `hi-<장소>.mp4` — 도착 인사 동작(4초, 한 번), `idle-<장소>-1|2.mp4` — 대기(4초, 무작위로 이어 틀기). 첫 · 끝 프레임 = 그 장소 그림(저장고는 `vault`)
  - `move-<장소>.mp4` — 그 장소로 가는 1인칭 이동 영상(8초, 첫 프레임 = 떠나는 장소 그림 · 끝 프레임 = 도착 장소 그림)

## 영수증 새로(2026-11-18 사용자 지시) — 맨 위 '포도밭에 선 나' 검정 도장 · 맨 아래 해나 사인
- 그리는 곳 `src/app/kiosk/experience/expansion/sip-receipt.ts`(kx-receipt 의 render 길 — SIP! 영상판 · 게임판만, 다른 체험 영수증은 그대로).
  차례: SIP! · 날짜 → 도장 그림(흑백 + 잉크 빠짐 결, 살짝 기울임) → 오늘의 한 잔(큰 번호 · 이름 · 영문 · 종류) → 고른 맛(점 다섯) → 해나의 한마디 → 휴대폰 QR → 해나 사인(크게) · Sommelier.
- 도장 그림: 기념사진을 찍는 순간 `POST /api/kiosk/experience/sip-stamp`(지시문 `src/lib/kiosk/expansion/sip-stamp.ts`, 운영 그림 모델 gemini-2.5-flash-image · 장당 약 $0.04, 하루 상한은 다른 그림과 함께). 사진을 건너뛰었거나 아직 · 못 그렸으면 `receipt-stamp-default.png`(사람 없는 포도밭).
- `hana-signature.png`(검정 · 투명 바탕) · `receipt-stamp-default.png`(흑백) — Gemini 3 Pro Image, R&D 키, 원본 `design-review/nh-sip-art/receipt`.
- 수장고 고르기 조각 `pick-cellar.mp4`(8초) — 해나가 와인을 뽑아 라벨을 들여다보고 다시 넣는다. 첫 판은 '촛불에 비춰 본다'에서 병 입구에 불이 붙어 다시 만들었다. 도착 인사 뒤 한 번, 다 본 뒤에 시음실로(SipMotion AFTER_HI · SipGameMode).
