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

## 프로그램 (2026-11-14 최종 — 사용자 지시)
| 안 | 프로그램 | 단계 | 구분 | 여는 곳 | 1회 비용 |
|---|---|---|---|---|---|
| A | COLOR! AI 퍼스널 컬러 | 1 | 기존 | `/kiosk/pc/color` | 약 $0.0036 |
| A | NEXT! AI 미래 직업 탐색(관상 사진 포함) | 1 | 기존 | `/kiosk/pc/career` | 약 $0.0017 |
| A | FORTUNE! AI 포춘 | 1 | 고쳐 씀 | `/booth-demo/funground/saju?engine=ai` | 약 $0.0022 |
| A | FUTURE NEWS! 2046 별내 신문 | 2 | 새로 | `/booth-demo/funground/news?engine=ai` | 약 $0.001 |
| A | DREAM! 꿈의 직업 포토 | 2 | 새로 | `/booth?mode=dream&site=funground` | $0.018 |
| B | COLOR! 퍼스널 컬러(기기 안 판정) | 2 | 고쳐 씀 | `/booth-demo/funground/color` | $0 |
| B | NEXT! 미래 직업 탐색(질문 8 + 결과 카드용 사진) | 1 | 고쳐 씀 | `/booth-demo/funground/career` | $0 |
| B | FORTUNE! 포춘(만세력 + 미리 쓴 문장) | 1 | 고쳐 씀 | `/booth-demo/funground/saju?engine=local` | $0 |
| B | FUTURE NEWS! 2046 별내 신문(미리 쓴 기사) | 2 | 새로 | `/booth-demo/funground/news?engine=local` | $0 |

LATER! 타임캡슐(A안 GPT Image 2.6 Sunburst 1장 약 $0.045 · B안 기기 안 합성)은 같은 날 더 싼 FUTURE NEWS! · DREAM! 으로 바꾸며 데모 목록에서 뺐다 — 코드 · 화면은 남아 주소로만 열린다(`/booth?mode=timecapsule&site=funground`, `/booth-demo/funground/later`).

**새 프로그램 메모(2026-11-14, LATER! 보다 싼 대안으로 만들어 비교한 뒤 채택)**
| 안 | 프로그램 | 단계 | 구분 | 여는 곳 | 1회 비용 |
|---|---|---|---|---|---|
| A | FUTURE NEWS! 2046 별내 신문 — 사진(기기 안 오리기) + 질문 3 → AI 기자가 1면 기사 | 2 | 새로 | `/booth-demo/funground/news?engine=ai` | 글 1회 약 $0.002 |
| A | DREAM! 꿈의 직업 포토 — 6직업 × 2장면, 옷 · 일터만 바꿈(1~4명) | 2 | 새로 | `/booth?mode=dream&site=funground` (Seedream) | $0.018 |
| B | FUTURE NEWS! — 기사는 미리 쓴 틀(`news-template.ts`) | 2 | 새로 | `/booth-demo/funground/news?engine=local` | $0 |

DREAM! 가상 어린이 시험(5건, 2026-11-14): 얼굴 유사도 0.80~0.95, 1~4명 모두 유지, 나이 그대로. 우주비행사는 「깃발 · 패치 없음」을 적어도 Seedream 이 우주복에 국기를 그려(3번 시험) 천문학자(천문대)로 바꿨다.

뺀 프로그램(IDOL! · ERA! · GRAD! · WITH! · QUEST! · MVP! · THEME! · MV!)의 코드는 남아 있고 주소로만 열린다. B안 LATER! 는 THEME! 합성 코드를 쓴다.

## 1회 비용 (2026-11-14 실측, usage.cost)
| 프로그램 | A안 | B안 |
|---|---|---|
| LATER! | GPT Image 2.6 Sunburst 1장 $0.041~0.048 | AI 호출 없음 $0 (배경 그림은 만들 때 한 번 $0.28) |
| COLOR! | gemini-3-flash-preview 분석 1회 약 $0.0036 | $0 |
| NEXT! | gemini-3-flash-preview 풀이 1회 약 $0.0017 | $0 |
| FORTUNE! | gemini-2.5-flash 풀이 1회 약 $0.0022 | $0 |
QR 받기 업로드는 우리 서버 저장소라 AI 비용이 없다. COLOR! · NEXT! 는 키오스크 경로라 사이트 기본 키(`OPENROUTER_API_KEY`)로 나간다(나머지 A안은 펀그라운드 키).

## 사진 · 결과물 받기(모든 프로그램)
- 모든 프로그램은 사진을 찍는다(2026-11-14 사용자 지시). 포춘 · 미래 직업(B)은 사진을 결과 카드에만 쓴다 — AI 포춘도 사진을 AI 에 보내지 않는다.
- 마지막 「인쇄하기」: 설치 기기는 프린터로 바로, 노트북 · 폰은 **인쇄 미리보기 창 + QR**(`src/components/funground/FgResultSheet.tsx`). 결과물은 4×6 사진(1200×1800).
  - QR: 창을 열 때 결과 그림을 우리 서버에 올린다(`/api/kiosk/share`, 받기 종류 `funground`, 24시간 보관 — AI 호출 아님). 폰은 `/kiosk/get/<token>`(머리 「FUN GROUND」)에서 저장. 「이 기기에 저장」도 있다.
  - 사용자 결정: B안 결과도 QR 로 받는다 — B안 설명은 「외부 AI 서비스 안 씀 · 처리는 기기 안 · QR로 받기를 누른 결과만 24시간 보관」.
  - A안 LATER!(부스 프로그램)는 저장 화면의 인쇄하기가 같은 미리보기 창(+ 부스 저장 QR, `PhotoFlow` SaveStep, `site=funground` + 브라우저일 때만). A안 COLOR! · NEXT!(노트북판)는 데모 주소일 때만 「휴대폰으로 받기」 대신 「인쇄하기」 미리보기.
  - 데모 상한: 받기 업로드는 키오스크 데모 몫(하루 200).

## A안 — AI 생성형
- **LATER!**(`/booth?mode=timecapsule&site=funground`): 펀그라운드 생성(`src/lib/booth/image-models.ts`)은 `FUNGROUND_PRIMARY.timecapsule = GPT Image 2.6 Sunburst`(`openai/gpt-image-2.6-sunburst`, images API) → 예비 Gemini 2.5 Flash Image. 2026-11-14 사용자 결정으로 Gemini 3 Pro Image($0.138)에서 바꿨다 — 가상 어린이 5건 비교에서 얼굴 유사도(ArcFace 0.61~0.81 vs 0.55~0.75) · 나이 반영 모두 나았고, Seedream 5.0 Flash 는 나이를 거의 안 바꾸고 남매 중 한 명을 뺐다. 실측 1장 $0.041~0.048 · 23~41초 · 1024×1536(인화 원판보다 15% 작아 조금 키워 찍힌다). 프롬프트 끝에 `fungroundRules('timecapsule')`. 데모 상한(부스 데모와 함께 하루 40장) → 하루 최대 약 $1.9.
- **COLOR! · NEXT!**: 키오스크 노트북판 그대로(AI 분석 — 기존 키). 데모 주소일 때만 결과의 「휴대폰으로 받기」가 「인쇄하기」 미리보기(`src/app/kiosk/pc/PrintPreview.tsx`, `demo-link.ts`, `data-kiosk-demo`) — 행사 노트북 링크는 그대로.
- **FORTUNE!**(`/api/funground/fortune`, `src/lib/funground/saju-fortune.ts`): 서버에서 만세력 → `google/gemini-2.5-flash` 가 공부 · 친구 · 진로 · 꿈 풀이(향 처방 없음). 실패 · 금지어면 B안 문장 엔진으로(`fallback: true`). 사진은 카드에만 — AI 에 보내지 않는다(요청은 생일만). 상한은 키오스크 데모 몫(하루 150).
- 키: `OPENROUTER_FUNGROUND_API_KEY` = 오픈라우터 **STUDIO_FUNGROUND_DONGJU**(2026-11-14, 월 $250 · 매달 초기화) — 로컬 `.env.local` · Vercel Production. ERP 「API 비용」 붙일 곳 PJ-2612-09, 「AI 사용료」 주인 동주.
- 사진형 6종 Seedream 설정(`FUNGROUND_PRIMARY` 의 idol-makeup 등 · QUEST! · MVP!)은 데모 목록에서 뺐지만 코드에 남아 있다.

## B안 — 기기 안 처리형(외부 AI API 0)
- **LATER!**(`/booth-demo/funground/later`, `src/lib/funground/later-photo.ts` · `later-art.ts`): 10 · 20년 뒤 → 미래 장면(우주 정거장 · 미래 도시 · 하늘 위 학교) → 미래의 나에게 한마디(6개) → 촬영 → 기기 안 사람 분리(THEME! 합성 코드 `theme-photo.ts`) → 4×6(편지 카드 · 「20XX년 X월 X일에 다시 열어 보세요」). 얼굴은 바꾸지 않는다. 배경 `public/assets/booth-programs/funground-later/{city,sky}.webp`(2026-11-14 한 번 생성, $0.28 — `scripts/funground-later-backgrounds.ts`), 우주 정거장은 THEME! 의 `space.webp`.
- **COLOR!**(`/booth-demo/funground/color`): 키오스크와 같은 기기 안 측정 + 숫자 규칙(`src/lib/kiosk/color-rules.ts`), 애매하면 이유별 「다시 찍기」, 8유형 청소년 문장(`color-texts.ts`). 결과 4×6 카드(`color/color-print.ts`).
  - **알려진 문제**: 피부 L* 35 미만을 「조명 탓」으로 보고 null → B안에서는 **피부색이 어두운 손님이 늘 「다시 찍기」**. 규칙을 정해야 한다.
  - 분할 모델 · 엔진은 우리 `public/`(`/models` · `/mediapipe/wasm` · `/onnxruntime`)에서 받는다 — 설치 때 한 번 열어 둔다.
- **NEXT!**(`/booth-demo/funground/career`): 사진(결과 카드용, 관상 분석 없음) → 질문 8개 → 기존 규칙표 16직업 + 축 조합 풀이 12개(`career-combos.ts`) → 4×6 카드(`career/career-print.ts`). `npm run test:funground-career`.
- **FORTUNE!**(`/booth-demo/funground/saju?engine=local`): 사진 → 생년월일 → `computeSajuChart` + 미리 쓴 문장 55개(`saju-reading.ts`) → 4×6 사주 카드(`saju-card.ts`). `npm run test:funground-saju`.
- AI 표기: LATER!(AI 인물 인식) · COLOR!(AI 인식 기반)만 「AI」, NEXT! · FORTUNE! 은 「체험 프로그램」.
- 외부 호출(Playwright 기록): OpenRouter · AI API 요청 0. 「인쇄하기」 창을 열 때만 `/api/kiosk/share` 업로드 1회. 나머지는 사이트 공통(로그인 세션 · 우편번호 스크립트 · Supabase 방문 통계)과 우리 서버의 그림 · 모델 파일.

## 문구 원칙
외모 평가 · 점수 · 순위 없음. 퍼스널 컬러는 「어울리는 색」만. 사주 · 미래 직업은 「재미로 보는 풀이」를 화면에 늘 보인다. 연애 · 재물 같은 말은 빼거나 순화.

## 그림
랜딩 카드 그림 `public/assets/booth-demo/funground/<key>.webp` — 모두 16:9 960×540(전용 화면은 1920×1080, 부스는 1280×720, 진단은 노트북판을 찍어 줄임, 워터마크를 걷고). 기존 부스 프로그램은 기존 데모 그림을 복사했다. 머리말 그림 `start-a.webp` · `start-b.webp` 은 시작 화면. 랜딩의 기기 그림(`.fl-device`)은 벽 매입 가로 화면.

## 설치 전에 남은 일
- DSLR 브리지(데모는 웹캠), 4×6 포토 프린터 · 영수증 프린터 연결, 실제 펀그라운드 색 · 로고.
- 운영 펀그라운드 키(Vercel `OPENROUTER_FUNGROUND_API_KEY`), 아이 얼굴 유사도 재시험(메모 seedream-booth-test-2026-11 — 지금 시험은 가상 성인 사진).
- B안 퍼스널 컬러의 어두운 피부 판정(위 '알려진 문제'), 실제 아이 얼굴로 컬러 · LATER!(A 나이 들기 · B 합성) 시험.
- `scripts/verify-photobooth-programs.mjs` 는 이번 일 전부터 옛 14종 목록을 기대해 2건 실패한다(DRAW! · 주거복지 · ANSAN 추가분) — 고쳐야 한다.
