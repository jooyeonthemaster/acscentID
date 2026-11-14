# 펀그라운드 별내 견적 데모 (/booth-demo/funground)

2026-11-14. 남양주 「펀그라운드 별내」(9~19세 청소년 공공시설) 상설 체험기 견적(A안 26-217 · B안 26-218)에 붙이는 전용 데모.
고객이 링크에서 각 안의 프로그램을 직접 눌러 본다. 설치 기기는 32인치 **가로** 터치스크린 1대(카메라 · 4×6 포토 프린터 · 영수증 프린터 · PC). 2026-11-14 처음엔 세로로 만들었다가 같은 날 사용자 지시로 **모든 화면을 가로**로 바꿨다(1920×1080 기준, 부스 프로그램은 1280×720 기준).

## 주소
- 랜딩 `/booth-demo/funground` — A안 / B안 탭(`#a` · `#b`), 카드마다 단계(1단계 · 12월 / 2단계 · 1월)와 제작 구분(기존 프로그램 · 기존 · 고쳐 씀 · 새로 제작).
- 워터마크 없는 판 `/booth-demo/funground/clean?k=…` — 랜딩 바닥글 「관리자 · 워터마크 없는 링크」에서 관리자 비밀번호 6자리 + 기간(7 · 30 · 90일)으로 만든다(포토부스 · 키오스크 데모와 같은 서명, `src/lib/demo-clean.ts`). 여기서 연 화면은 모두 `demo=clean&k=…`.
- 시작 화면(프로그램 고르기) `/booth-demo/funground/start?plan=a|b&demo=1` — 설치 기기의 첫 화면. 고른 프로그램을 같은 16:9 화면 칸에 띄운다(iframe). 「프로그램 고르기」 단추는 화면 칸 위 빈 띠에(없으면 왼쪽 아래).
- 전용 화면(가로 1920×1080, `src/components/funground/FgStage.tsx` · 두 칸 `.fg-split`): `/booth-demo/funground/saju?engine=ai|local` · `/career` · `/color` · `/theme`.
- 부스 프로그램은 기존 주소에 `site=funground` 를 붙여 연다: `/booth?mode=<id>&demo=1&site=funground`. AI 진단은 키오스크 프로그램의 노트북 가로판 `/kiosk/pc/color|career?demo=1`(docs/kiosk-pc.md — 결과는 영수증 대신 휴대폰 QR; 데모 주소로 열면 DEMO 워터마크, `PcScreen`).
- 로케일 라우팅 밖(`middleware.ts`), `robots: noindex`. 목록 · 주소 규칙은 `src/lib/funground/demo.ts`(`FUNGROUND_PROGRAMS`).

## 노트북으로 확인하기
- 고객이 노트북 크롬 브라우저로 열어(2026-11-14 크롬으로 확인 · 사파리는 아직 확인 안 함) 노트북 카메라 · 마이크로 끝까지 해 볼 수 있다. 모든 화면이 16:9 가로라 노트북 창에 거의 꽉 차게 보인다(전체 화면이면 가장 크게).
- 카메라 권한을 처음 한 번 묻는다(시작 화면 안에서 연 프로그램도 같은 사이트라 한 번). 거절하면 화면마다 「주소창에서 카메라(뮤직비디오는 카메라 · 마이크) 권한을 허용」 안내와 다시 연결 단추.
- 펀그라운드에서 연 부스 프로그램은 웹캠만 쓴다 — DSLR 브리지(127.0.0.1:9120)를 찾지 않는다(크롬의 로컬 네트워크 권한 창 · 대기 없음, `fungroundWebcamOnly`). 설치 기기는 주소에 `camera=dslr`.

## 프로그램
| 안 | 번호 | 프로그램 | 단계 | 구분 | 화면 | 여는 곳 |
|---|---|---|---|---|---|---|
| A | 1 | 아이돌 메이크업 IDOL! | 1 | 기존 | 가로 | `/booth?mode=idol-makeup` |
| A | 2 | 패션 타임머신 ERA! | 1 | 기존 | 가로 | `fashion-time` |
| A | 3 | 졸업 포토부스 GRAD! | 1 | 기존 | 가로 | `graduation` |
| A | 4 | 팬 포토카드 WITH! | 1 | 기존 | 가로 | `fan-card` |
| A | 5 | 판타지 모험 QUEST! | 2 | 새로 | 가로 | `quest` (catalog `site: 'funground'`) |
| A | 6 | 스포츠 스타 MVP! | 2 | 새로 | 가로 | `mvp` (catalog `site: 'funground'`) |
| A | 7 | AI 진단 — 퍼스널 컬러 / 미래 직업(둘 중 하나) | 1 | 기존 | 가로 | `/kiosk/pc/color` · `/kiosk/pc/career` |
| A | 8 | AI 포춘 FORTUNE! | 1 | 고쳐 씀 | 가로 | `/booth-demo/funground/saju?engine=ai` |
| B | 1 | 테마 포토 THEME! | 2 | 새로 | 가로 | `/booth-demo/funground/theme` |
| B | 2 | 퍼스널 컬러 COLOR! | 2 | 고쳐 씀 | 가로 | `/booth-demo/funground/color` |
| B | 3 | 사주 SAJU! | 1 | 고쳐 씀 | 가로 | `/booth-demo/funground/saju?engine=local` |
| B | 4 | 미래 직업 탐색 NEXT! | 1 | 고쳐 씀 | 가로 | `/booth-demo/funground/career` |
| B | 5 | 뮤직비디오 MV! | 1 | 기존 | 가로 | `/booth?mode=music-video` |

## A안 — AI 생성형
- **생성 모델**(`src/lib/booth/image-models.ts`): 펀그라운드 데모(요청 `site: 'funground'` + 데모 표)의 사진형 6종(`FUNGROUND_PRIMARY`)은 Seedream 5.0 Flash(`bytedance-seed/seedream-5-0-flash`, `POST /api/v1/images` + `input_references`) → 실패 · 시간 초과(60초)면 Gemini 2.5 Flash Image(chat completions, 45초). 응답의 `usage.cost` 를 로그에 남긴다(`[funground-image] 생성 <모델> <프로그램> <옵션> 얼굴N <초> cost=…`). 매장 · 행사 · 다른 데모는 예전 그대로(`idol-generate.ts`).
- 키는 `OPENROUTER_FUNGROUND_API_KEY` 하나만 — 오픈라우터 키 **STUDIO_FUNGROUND_DONGJU**(2026-11-14 만듦, 월 $250 · 매달 초기화). 로컬 `.env.local` · Vercel Production 에 넣었고, ERP 「API 비용」 붙일 곳 = PJ-2612-09 펀그라운드 별내, 「AI 사용료」 키 주인 = 동주. 없으면 503 「펀그라운드 데모용 AI 키가 아직 설정되지 않았어요」.
- 펀그라운드 생성에는 프롬프트 끝에 `FUNGROUND_RULES`(`prompts.ts`)를 붙인다: 9~19세 나이 그대로 · 어른처럼 만들지 않음 · 안경 유지(시험에서 Seedream 이 아이돌 메이크업에서 안경을 벗겼다).
- QUEST! · MVP! 는 펀그라운드 전용(`site`) — 운영 모드 목록 · `/booth-demo` 랜딩에 넣지 않고, 데모 표로만 생성한다(아니면 403). 시작 그림(`public/assets/booth-programs/quest.webp` · `mvp.webp`)은 Seedream 글→그림으로 만든 가상 청소년 예시(2026-11-14, 장당 $0.018).
- 데모 상한은 기존 부스 데모와 함께 센다(`src/lib/booth/demo-server.ts`): **1분 3장 · 하루(KST) 40장**. Seedream 장당 $0.018 → 하루 최대 약 $0.72(예비 모델로 넘어가면 장당 약 $0.04 더).
- AI 포춘(`/api/funground/fortune`, `src/lib/funground/saju-fortune.ts`): 서버에서 만세력을 계산하고 `google/gemini-2.5-flash` 가 공부 · 친구 · 진로 · 꿈으로 풀이(향 처방 없음). 키가 없거나 실패 · 금지어(연애 · 돈 · 외모 · 점수 …)면 B안 문장 엔진 결과로(`fallback: true`). 상한은 키오스크 데모 몫(`takeKioskUsage(…, 'analysis')`, 하루 150).
- 사진은 생성 동안만 AI 서비스로 가고, 결과 · 원본을 데모 서버에 남기지 않는다(촬영 기록 없음, 폰으로 받기를 누를 때만 기존 데모처럼 7일 보관).

## B안 — 기기 안 처리형(외부 AI API 0)
- 테마 포토 THEME!(`src/app/booth-demo/funground/theme/` · `src/lib/funground/theme-photo.ts` · `theme-art.ts`): 웹캠(설치 때는 주소 `camera=dslr` → DSLR 브리지 127.0.0.1:9120) → `cutoutPerson`(selfie_multiclass · u2netp, 기기 안)으로 사람만 → 테마 배경 + 사람 + 앞 장식(사람을 가리지 않게 자리를 피함) + 아래 도장(FUN GROUND 별내 · 날짜) → 4×6 1200×1800. 옷 · 얼굴은 손대지 않는다(색 맞춤도 끔). 1~4명. 결과 화면에서 다른 테마로 바로 바꿔 볼 수 있다. 배경 6장 `public/assets/booth-programs/funground-theme/<id>.webp` 은 `scripts/funground-theme-backgrounds.ts` 로 한 번 만들었다(2026-11-14, Gemini 3 Pro Image 2K, 약 $0.8) — 파일이 없으면 코드 그림으로 대신한다. 데모 실행 중에는 API 를 부르지 않는다.
- 퍼스널 컬러 COLOR!(`src/app/booth-demo/funground/color/` · `src/lib/funground/color-judge.ts` · `color-texts.ts`): 키오스크와 같은 기기 안 측정(`garment.worker` · `measureColors`) + 숫자 규칙 `diagnoseFromMeasure`(`src/lib/kiosk/color-rules.ts` 로 옮김 — 브라우저에서 쓰려고. `color-analysis.ts` 는 다시 내보내 키오스크 동작 그대로). 측정이 없거나 규칙이 답을 못 내면(null) · 머리카락을 못 재면 이유별 「다시 찍기」. 8유형 청소년용 문장(별명 · 요약 · 특징 3 · 어울리는 색 12 · 조언)은 미리 써 두었다. 색을 누르면 사진 속 옷 색이 바뀐다. `npm run test:funground-color`.
  - **알려진 문제**: 규칙이 피부 L* 35 미만을 「조명 탓」으로 보고 null 을 낸다(키오스크는 이때 AI 가 정한다). B안에는 AI 가 없어서 **피부색이 어두운 손님은 조명이 좋아도 늘 「다시 찍기」**가 된다(시험 사진 p3: L 26.6). 두 번째부터 「직원에게 알려 주세요」를 덧붙였을 뿐 규칙은 그대로다 — 기기 안 규칙을 새로 정할지(예: 사진 전체가 밝은데 얼굴이 어두우면 딥) 결정이 필요하다.
  - 분할 모델 · 엔진은 우리 `public/`(`/models/selfie_multiclass_256x256.tflite` 16MB · `/mediapipe/wasm/*` 9.5MB)에서 받아 브라우저 캐시에 둔다 — 설치 때 한 번 열어 미리 받아 둔다.
- 사주(`src/lib/funground/saju-reading.ts`): `computeSajuChart` + 미리 쓴 문장 55개(일간 10 · 많은 오행 5 · 적은 오행 5 · 용신 5 · 2027 흐름 10 · 청소년 주제 15 · 행운 5)에서 고른다. 같은 입력 → 같은 결과. `npm run test:funground-saju`.
- 미래 직업(`src/lib/funground/career.ts` · `career-combos.ts`): 관상 사진 단계를 빼고 질문 8개(활동 · MBTI · 상황 5 · 새 질문 「자유 시간 한 시간」). 직업은 기존 규칙표(`data.ts` 16직업), 풀이는 축 조합 12개. `data.ts` 의 `exploreCareers` 에 선택 인자 `extra` 를 더했다(기본값이면 studio-career 결과 그대로 — 210만 조합으로 확인). `npm run test:funground-career`.
- 뮤직비디오: 기존 그대로. 데모는 이용권 없이 연다. `site=funground` 면 영상을 올리지 않고 「QR로 받기는 설치 때 연결」 안내(운영 영상 보관 버킷 `photobooth-media` 없음 — `supabase/migrations/20261015_photobooth_programs.sql` 미적용).
- AI 표기: 테마 포토(AI 인물 인식) · 퍼스널 컬러(AI 인식 기반)만 「AI」. 사주 · 미래 직업 · 뮤직비디오는 「체험 프로그램」.
- 외부 호출 확인(2026-11-14, Playwright 로 페이지 열기 → 결과까지 요청 기록): 다섯 모두 OpenRouter · `/api/kiosk/*` · `/api/funground/*` · `/api/photobooth/program|media|result` 요청 0. 남는 것은 사이트 공통 레이아웃의 `/api/auth/session` · 다음 우편번호 스크립트 · Supabase 방문 통계(주소만, 사진 없음)와 우리 서버의 그림 · 모델 파일. B안 설치를 「밖으로 아무것도 안 나감」으로 하려면 이 공통 요청을 `/booth-demo/funground` 에서 끄는 일이 남는다(공통 파일 `src/app/layout.tsx` · 분석).

## 문구 원칙(9~19세)
외모 평가 · 점수 · 순위 없음. 퍼스널 컬러는 「어울리는 색」만. 사주 · 미래 직업은 「재미로 보는 풀이」를 화면에 늘 보인다. 연애 · 재물 같은 말은 빼거나 순화.

## 그림
랜딩 카드 그림 `public/assets/booth-demo/funground/<key>.webp` — 모두 16:9 960×540(전용 화면은 1920×1080, 부스는 1280×720, 진단은 노트북판을 찍어 줄임, 워터마크를 걷고). 기존 부스 프로그램은 기존 데모 그림을 복사했다. 머리말 그림 `start-a.webp` · `start-b.webp` 은 시작 화면. 랜딩의 기기 그림(`.fl-device`)은 벽 매입 가로 화면.

## 설치 전에 남은 일
- DSLR 브리지(데모는 웹캠), 4×6 포토 프린터 · 영수증 프린터 연결, 실제 펀그라운드 색 · 로고.
- 운영 펀그라운드 키(Vercel `OPENROUTER_FUNGROUND_API_KEY`), 아이 얼굴 유사도 재시험(메모 seedream-booth-test-2026-11 — 지금 시험은 가상 성인 사진).
- MV! QR 받기: 운영 DB 마이그레이션 20261015 적용 여부(사용자 결정).
- B안 퍼스널 컬러의 어두운 피부 판정(위 '알려진 문제'), 실제 아이 얼굴로 컬러 · THEME! 시험.
- `scripts/verify-photobooth-programs.mjs` 는 이번 일 전부터 옛 14종 목록을 기대해 2건 실패한다(DRAW! · 주거복지 · ANSAN 추가분) — 고쳐야 한다.
