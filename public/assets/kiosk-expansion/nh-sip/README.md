# SIP! 게임판 그림(연말 시상식 AI 소믈리에 실험판, 2026-11-17)

오리지널 캐릭터 「해나」(소믈리에)와 1인칭 3D 렌더풍 장소 6곳 — 포도밭 입구 · 포도밭 · 수확 · 와이너리 · 저장고 · 시음실.
Gemini 3 Pro Image(R&D 키)로 캐릭터 시트를 먼저 만들고 그 시트를 넣어 같은 얼굴 · 옷을 유지했다(원본 2K 는 design-review/nh-sip-art, 저장소 밖). 글자 · 로고 없음. 화면용 720×1290 WebP.

- `{gate,vineyard,harvest,winery,cellar,tasting}.webp` — 해나가 들어간 장면(`&lab=game`, SipGameMode.tsx)
- `plate-*.webp` — 해나를 지운 배경판, `hana-*.webp` — 해나 포즈(투명, 높이 1400), `go-*.webp` — 그 장소로 가는 1인칭 길(빨리감기 이동)
  → `&lab=motion`(SipMotion.tsx)
- `loop-*.mp4` · `vault-loop.mp4` — 장소 반복 영상(Wan 3.0, 첫 · 끝 프레임 같은 그림), `move-*.mp4` — 그 장소로 가는 1인칭 이동 영상(끝 프레임 = 그 장소 반복 영상 첫 프레임). 소리 없음
