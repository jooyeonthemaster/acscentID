# 사주 향수 프로그램 — 마스터 설계 문서

> **프로그램명(가칭)**: 사주 분석 퍼퓸 — 브랜드 컨셉명 「운명의 조향(調香)」
> **이 문서가 단일 진실 공급원(SSOT)이다.** 모든 구현 에이전트는 이 문서를 먼저 읽는다.
> 코드베이스 분석 맵: 스크래치패드 `maps/*.md` (프롬프트에 경로 제공됨)

---

## 0. 식별자 (전 시스템 공통 — 절대 변경 금지)

| 축 | 값 |
|---|---|
| program slug (라우팅/admin_products) | `saju` |
| product_type (커머스/DB/ProductType 유니온) | `saju_perfume` |
| input type (쿼리파람 `?type=`) | `saju` |
| review program_type | `saju_perfume` |
| result 라우팅 | `/result?type=saju` (전용 결과 페이지) |
| 공개 경로 | `/programs/saju`, `/input?type=saju&mode=online` |
| 인쇄 배경 SVG | `public/background/3-1.svg` (최애), `3-2.svg` (나) |

- targetType: 기존 `'idol' | 'self'` 재사용 — **idol = 최애의 사주, self = 나의 사주**
- 가격: `admin_product_pricing` 시드 10ml/50ml 각 ₩48,000 (image_analysis와 동일; 관리자에서 조정 가능)
- **admin_products 시드는 `is_active=false`** — 사용자가 관리자에서 켜기 전까지 공개 노출 없음 (`?adminPreview=1`로 테스트)

## 1. 경험 컨셉 — 「자정의 조향소」

**세계관**: 자정, 오래된 한옥 조향소. 명리학자이자 조향사인 존재가 만세력을 펼치고
당신의 여덟 글자(八字)를 읽어 부족한 기운을 채우는 향을 조제한다.
사주는 "운명 감정"이 아니라 **"기운의 조향"** — 향이 곧 처방이라는 서사.

**절대 금지**: 보라색 그라데이션 미스틱 슬롭, 점집 키치(부적/무당 클리셰), 기존 옐로 키치 톤의 기계적 재사용, 뻔한 별자리 아이콘.

### 비주얼 언어 (사주 프로그램 전용 — 입력/결과/보고서 공통)
- **팔레트**: 먹색 자정 `#0C0E16`(배경), 한지 크림 `#F5EFE2`(카드/보고서), 주사(辰砂) 레드 `#C0392B`~`#A93226`(낙관/강조), 금박 `#C9A227`~`#E8C766`(운명선/파티클), 청묵 `#2C3E50`(보조), 오행 5색(목 `#3E7C4F` / 화 `#C0392B` / 토 `#C9A227` / 금 `#B8B8B0` / 수 `#2C3E60`)
- **타이포**: 한글 세리프(명조) — `next/font` Noto Serif KR(400/600/900). 한자 병기 적극 사용(四柱, 五行, 用神, 日柱). 낙관(도장) 모티프 = 프로그램 로고
- **모티프**: 만세력 격자, 8개의 패(글자 카드), 오행 상생 고리(목→화→토→금→수 순환), 금가루, 붓획, 한지 질감, 세로쓰기 라벨
- **모션**: 느리고 무게 있는 이징(`[0.22,1,0.36,1]`, 0.8s+), 패가 뒤집히는 3D flip, 금박 파티클 부유, 스크롤 시차. 팝/바운스 금지
- **모바일 셸**: 기존 관례 유지 — `max-w-[455px] mx-auto`, 하단 고정 액션 바 높이 유지. 그 안에서 화면을 넓게 쓰는 시원한 레이아웃 (좁은 카드에 텍스트 욱여넣기 금지, 문장 중간 어색한 줄바꿈 금지 — `break-keep` 전면 적용)

### 톤앤매너 (카피)
- 반말 금지. **"~하오", "~이니" 체가 아니라** — 현대적 존댓말 + 명리 용어를 정확히 쓰되 즉시 풀어주는 이중 문장. 예: "당신의 일간은 병화(丙火), 한낮의 태양입니다."
- 오글거림 방지: 과장 감탄사/이모지 남발 금지. 절제된 확신의 어조. 단, 최애(idol) 모드는 온도를 약간 높여 팬의 설렘을 존중하는 부드러운 톤.

## 2. 사용자 플로우

### 2.1 입력 위저드 (`/input?type=saju`) — "문진(問診)"
chemistry 패턴(자체 폴더, 자체 훅, 페이즈 머신). 단계:

1. **입문(入門)** — 최애/나 선택 (targetType idol/self, 기본 self), 오프라인이면 PIN 4자리. 이름(최애 이름 or 내 이름), 성별
2. **목적(所望)** — 무엇이 궁금한가: `종합(총운)` / `연애운` / `재물운` / `직업·진로운` / `궁합` 중 하나 (단일 선택). 각각 전용 한자 낙관 아이콘
3. **생시(生時)** — 생년월일(양력/음력+윤달 토글), 태어난 시간(12지시 선택 UI: 자시~해시 + "시간 모름" = 삼주 분석), 성별은 1에서 수집됨
4. **(궁합 전용) 상대(相對)** — 상대방 이름/성별/생년월일/시간(모름 허용)/관계(연인·썸·부부·친구·동료 등 선택지)
5. **고민 한 줄(心願)** — 선택 입력: 지금 마음에 걸리는 것 한 문장 (AI가 서사에 직조). 뻔한 다지선다 성격 질문 금지 — 이 프로그램은 생시가 곧 데이터다
6. **확인(封印)** — 입력 요약을 "사주 단자(單子)" 형태로 보여주고 봉인(제출)

- 제출 → **만세력 계산은 클라이언트/서버 코드로 즉시** (`src/lib/saju/`) → `/api/analyze/saju` POST
- **분석 로딩 오버레이**: "괘를 뽑는 의식" — 만세력이 넘어가고, 8개의 패가 하나씩 뒤집히며 원국이 완성되는 애니메이션 (계산된 실제 팔자 글자가 뒤집힘!). 인용구 로테이션은 명리 격언으로
- 모드 계약 준수: `mode`/`service_mode`/`qr_code` 파싱, 오프라인 PIN, 비회원 차단 AuthModal(closeable=false), QR 뒤로가기 루프 가드, `useLocaleSwitchState` 고유 storageKey `input-form:saju:...`
- **이미지 업로드 없음** — 생년월일시가 데이터의 전부라는 순수성이 컨셉. (localStorage `userImage` 미설정 허용 처리)

### 2.2 결과 페이지 (`/result?type=saju`) — "두루마리"
ChemistryResultRouter에 `type=saju` 분기 추가 → 전용 풀페이지. **탭이 아니라 세로 스크롤 서사** (章 구조). 섹션:

1. **序 — 밤하늘**: 어둠, 별 파티클이 흩어져 있다가 스크롤에 따라 8글자로 응집. "당신이 태어난 순간, 하늘에는 여덟 글자가 새겨졌습니다"
2. **一章 — 원국(命式)**: 만세력 명식표가 펼쳐짐 (년/월/일/시 4기둥 × 천간/지지, 각 글자에 오행 색). 일주 하이라이트
3. **二章 — 일간(日干)**: "당신의 중심 글자" — 일간 아키타입 대서사 (병화=한낮의 태양 등). 큰 한자 + 서사 텍스트
4. **三章 — 오행의 흐름**: 오행 분포 시각화 (상생 고리 다이어그램, 과다/부족이 시각적으로 드러남). 부족한 기운 = 어둡게 꺼진 고리
5. **四章 — 소망의 운(목적별)**: 선택한 목적(연애/재물/직업/종합)의 깊은 해석. 궁합이면 두 원국이 마주보는 합충 시각화 + 관계 서사
6. **五章 — 용신(用神)의 계시**: "당신에게 필요한 기운" — 꺼져 있던 고리에 불이 들어오는 연출. 여기서 향으로 전환: "이 기운은 향이 될 수 있습니다"
7. **終章 — 운명의 향 공개**: 향수 리빌 (병 + 노트 3단 = 기운의 3층 구조로 재해석: 탑=겉으로 드러나는 기운/미들=중심 기운/베이스=뿌리 기운). **왜 이 향인가** — 용신 오행→노트 논리를 명시적으로 서술
8. **처방전(리츄얼)**: 뿌리는 시간/상황 가이드(사주 논리로: "화 기운이 필요한 그대, 해가 기우는 오후에"), 올해의 흐름 한 줄
9. 하단 고정 액션 바: online = 장바구니/바로구매/공유, offline = 피드백/공유 (기존 계약 그대로, 사주 스킨)

- 스크롤 인터랙션: framer-motion `useScroll`/`useTransform` 기반 — 오버레이 확장, 시차, 글자 응집, 고리 점화. **각 섹션은 전담 디자인 에이전트가 깎는다**
- 저장: `POST /api/results` (product_type `saju_perfume`, analysis_data에 유니버설 코어 + sajuAnalysis). useAutoSave 분기 추가. 오프라인 재고 차감은 matchingPerfumes[0] 코어 유지로 호환
- DB 재열람(`?id=`) / 마이페이지 재접근 / 로케일 전환 번역 모두 지원

### 2.3 QR 오프라인
- admin QR 발급에 `saju_perfume` 추가 → `/qr/[code]` 리다이렉트 스위치에 case 추가 → `/input?type=saju&mode=qr&qr_code=...`
- 오프라인: PIN 수집, 일일 한도 우회, 결과 저장 시 재고 차감, 하단 바 = 피드백 모드
- **피드백 루프는 기존 재사용**: 사주 추천도 30종 중 1종이므로 FeedbackModal + `/api/feedback/customize` 그대로 동작 (레시피 = 3향료 10방울)

## 3. 사주 계산 엔진 — `src/lib/saju/` (순수 TS, 의존성 0)

**대원칙: AI는 사주를 계산하지 않는다. 코드가 계산하고 AI는 해석만 한다.**

- `calendar.ts` — 율리우스일 기반 일진(60갑자) 계산, 시두법(일간→시천간), 년두법/월두법
- `solar-terms.ts` — 절기 경계 데이터(1930–2035, 12절 시각). 년주 경계=입춘, 월주 경계=절입 시각
- `lunar.ts` — 음력→양력 변환 테이블(1930–2035, 윤달 포함)
- `chart.ts` — `computeSajuChart(birth: {date, time?, calendar, isLeapMonth?, gender})` → `SajuChart`:
  - `pillars` (년/월/일/시 각 `{gan, ji, ganHanja, jiHanja, ganElement, jiElement, jiAnimal}`; 시간 모름 → hour null)
  - `elementCount` (목화토금수 각 개수, 지장간 가중 포함 여부는 리서치 반영)
  - `dayMaster` (일간 + 강약 판정), `yongsin` (용신 오행 + 판정 근거 키), `sipseong` (십성 분포), `jijiRelations` (합충형해파 — 궁합용)
- `scent-map.ts` — **오행→향 매핑 SSOT**: 30종 향수 각각에 `{primaryElement, secondaryElement, rationale}` 태깅 테이블 + 용신 오행별 후보 향수 목록 도출 함수
- 정확도 검증: 유명 생년월일 케이스(검증 가능한 만세력 대조) 유닛 수준 자체 검증 스크립트 포함

## 4. AI 설계 — `/api/analyze/saju/route.ts` (chemistry 패턴)

- 인증(`requireAuthenticatedUser`) + 일일 한도(offline 우회) + `{success,data}|{fallback}` 계약 유지
- `getModelWithConfig({ maxOutputTokens: 16384, temperature: 0.85 })` — 서사량 큼. 타임아웃 60s
- 프롬프트 빌더 `src/lib/gemini/saju-prompt-builder.ts`:
  - 역할: "당신은 수십 년 명리를 공부한 조향사" — 계산된 `SajuChart`가 JSON으로 주입됨 (**"이 명식은 이미 정확히 계산된 것. 재계산 금지, 해석만"** 명시)
  - 용신 오행 → 후보 향수 목록(`scent-map.ts`이 좁혀준 5~8종)을 우선 후보로 제시하되 30종 전체 DB도 제공 — 근거 서술은 반드시 오행 논리로
  - 목적별(연애/재물/직업/종합/궁합) 해석 지시 분기 + 궁합이면 두 명식 + 관계 유형 주입
  - 천편일률 방지 규칙: 명식의 **구체 글자**를 반드시 인용해 서술("일지에 유금(酉金)이 앉아…"), 금지어 목록(뻔한 운세 문구), 목적과 무관한 총론 금지, targetType별 톤 분기
  - 출력 = 유니버설 코어(traits/scentCategories/personalColor/analysis/matchingKeywords/matchingPerfumes[1]/comparisonAnalysis/scentRecommendation — parseGeminiResponse 호환) + `sajuAnalysis` 확장 블록
- `sajuAnalysis` 스키마(초안 — 프롬프트 에이전트가 정밀화):
  `dayMasterReading{archetypeTitle, hanja, narrative}`, `pillarsReading{year,month,day,hour: {label, meaning}}`, `elementFlow{dominant, lacking, yongsin, yongsinReason, flowNarrative}`, `purposeReading{purpose, title, narrative, keyInsights[3], timingAdvice}`, `compatibility?{score, relationDynamic, harmonyPoints[], frictionPoints[], adviceNarrative}`, `scentDestiny{whyNarrative, elementBridge, topMeaning, middleMeaning, baseMeaning, ritualGuide}`, `yearlyFlow{thisYear}`
- 파서: `extractJsonPayload`(chemistry의 균형 괄호 스캐너) 재사용 + 사주 필드 검증 + **사주 전용 mock fallback**
- locale: ko가 소스, `wrapPromptWithLocale` + FINAL CHECK 4개 로케일 문자열에 사주 필드명 추가 + `/api/translate/image-result` 필드 목록 확장

## 5. 인쇄 보고서 — PrintableReport `saju_perfume` 분기

- 캔버스 계약 준수: `842×595px`, 배경 SVG `viewBox 0 0 842.25 595.499986`, 라벨은 벡터 패스로 굽고 값만 픽셀 절대 배치, `@page A4 landscape margin 0`, bulk-print 호환(`standalonePrintStyles` prop)
- **디자인**: 한지 크림 바탕 + 먹/주사/금박. 좌측 = 命式(명식표: 4주 8자 격자, 오행 색 도트) + 오행 분포 미니 차트 + 용신 낙관(도장), 우측 = SCENT PROFILE(탑/미들/베이스 = 겉기운/중심기운/뿌리기운) + 6계열 향 차트 + 처방(시간/계절) + 목적 운세 한 줄
- 최애(3-1) vs 나(3-2) 변형: 최애 = 금박 장식+컬러 오행, 나 = 먹 단색 젠(zen) 미니멀 (기존 1-1/1-2 관계와 동일한 문법)
- 텍스트 오버플로: 모든 값 슬롯에 slice/line-clamp/maxHeight/break-keep 명시 — **최장 텍스트 케이스로 검증 필수**
- Korean-only 인쇄 관례 유지 (기존과 동일)

## 6. 통합 체크리스트 (완전성 검수 확정본 — 빠짐없이)

마이그레이션 1건(4개 whitelist CHECK + 3개 ref CHECK + reviews CHECK + admin_products/pricing 시드), cart.ts/admin.ts 타입 유니온·Record 전부, analysis.ts 타입, catalog.ts, program-seo.ts(5로케일), PRODUCT_TYPE_TO_SLUG(+qr page 사본), FALLBACK_PRODUCTS, MobileBottomNav(ALL_PROGRAM_LINKS + CTA 분기 + AuthModal redirectPath — chemistry 누락 버그도 수정), MobileMenuSheet, 홈 ALL_PRODUCTS 카드, sitemap.ts, programs/saju 랜딩(page+layout), input 라우터+INPUT_TYPE_TO_SLUG, qr/[code] 스위치, admin/qr QR_PRODUCT_TYPES, analyze/saju API, locale-prompt-wrapper 4로케일, translate 라우트, result 라우터+useResultData+useAutoSave, PrintableReport 분기+SVG 2종, cart API validateItem, orders API ref 분기, checkout 라벨, fragrance-usage.ts(ProgramType/VOLUME/PROGRAM_TYPE_MAP), admin/analysis 필터+라벨+CSV, admin/orders 뱃지+사이즈+Excel(+OrderTable 사본), analytics/datacenter/cost-analysis 분류, members 라벨, admin/chat 스키마 프롬프트, email/notion 라벨, 리뷰 6개 TS 유니온+admin reviews+generate 라벨, mypage OrderHistory 유니온, i18n 5로케일 전체 네임스페이스.

※ 상세 라인 번호는 `maps/critic.md`의 INTEGRATION CHECKLIST 참조.

## 7. 구현 순서

- **Phase A (기반)**: saju lib → 타입 → 프롬프트/API → 마이그레이션 파일 → 레지스트리/네비/라우팅/i18n 골격 (컴파일 가능 상태 확보)
- **Phase B (병렬 팬아웃)**: 입력 위저드 / 결과 섹션별(9섹션 × 전담 에이전트) / 인쇄 보고서+SVG / 랜딩 / 관리자 / 마이페이지·체크아웃 라벨
- **Phase C (검증 루프)**: `npx tsc --noEmit` + `next build` + Playwright 화면 검증(모바일 뷰포트) + 보고서 인쇄 픽셀 검수(최장 텍스트) — 발견→수정→재검증 반복
