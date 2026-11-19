# 키오스크 영상판 영수증 그림 (2026-11-18)

COLOR! · DRAW! · MAKEUP! 영상판 영수증(`src/app/kiosk/video/video-receipt.ts`) — SIP! 영상판 영수증과 같은 짜임: 맨 위 도장, 맨 아래 길잡이의 큰 사인.

- `sign-seoha.png` · `sign-moru.png` · `sign-ian.png` — 서하(만년필 필기체) · 모루(붓) · 이안(마커) 사인, 검정 · 투명 바탕, 폭 900.
- `stamp-default-color.png` · `stamp-default-makeup.png` — 사람 없는 기본 도장(사진이 없거나 AI 도장을 못 받았을 때), 흑백 660×660.
- 손님 도장: COLOR! 는 진단을 시작할 때, MAKEUP! 는 얼굴을 찾은 뒤(머리 모양을 바꾸면 다시) `POST /api/kiosk/experience/video-stamp`(지시문 `src/lib/kiosk/video-stamp.ts`, 운영 그림 모델 · 장당 약 $0.04). 영수증 창은 최대 45초 기다린다.
- DRAW! 는 AI 도장을 만들지 않고 손님의 캐리커처를 선화 도장으로 바꿔 찍는다(`src/app/kiosk/experience/kx-stamp.ts` 의 artStamp, 사용자 지시).
- 만든 곳: Gemini 3 Pro Image(사인 · 기본 도장, 각 $0.137), R&D 키. 원본 · 도구 `design-review/kiosk-cast/receipt` · `tools/video-receipt-art.mjs`, 견본 시험(가상 인물) `test-color.png` · `test-makeup.png`. 합계 약 $0.94.
