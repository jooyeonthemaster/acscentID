# FACE! 관상 영상판 영상(연말 시상식, 2026-11-18)

오리지널 캐릭터 도화서 화원 「선」이 손님을 화실로 안내해 초상을 그려 족자에 걸어 주는 영상(주소 `&lab=video`, `src/app/booth/programs/video-stage.tsx`).
짜임은 `.claude/skills/kiosk-video-flow` — 장면마다 조각 영상, 장면 사이 이동 영상, 모든 조각의 첫 · 끝 프레임 = 그 장면 그림. 캐릭터 · 장면 그림은 Gemini 3 Pro Image, 영상은 Wan 3.0 1080p(R&D 키). 원본 design-review/nh-face-art(저장소 밖). 글자 · 로고 · 소리 없음.

- 장면 그림(`courtyard` 마당 · `studio` 화실 · `painting` 그리기 · `scroll` 빈 족자 `.webp`) — 조각 영상의 첫 · 끝 프레임, 영상이 안 될 때 보인다
- `hi-<장면>`(도착 인사 4초) · `idle-<장면>-1|2`(대기 4초, 무작위로 이어 틀기)
- `move-<도착 장면>`: `move-studio`(마당 → 화실, 화원이 걸어 나가고 걸어 들어온다) · `move-painting`(화판 뒤로) · `move-scroll`(낙관 · 족자 걸기) · `move-courtyard`(족자를 건네고 마당으로 배웅)
