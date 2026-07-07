# UI 계약 및 관례

모범 구현: `src/app/[locale]/input/saju/`(위저드), `src/app/[locale]/result/components/saju/`(결과), `src/components/saju/`(공유), PrintableReport의 SajuPrintReport 분기(인쇄).

## 목차
1. 컨셉 세계관 규칙 · 2. 입력 위저드 계약 · 3. 로딩 오버레이 계약 · 4. 결과 페이지 계약 · 5. 인쇄 보고서 계약 · 6. dev 하네스 패턴 · 7. 텍스트 무결성 규칙

## 1. 컨셉 세계관 규칙

- **유지**: `max-w-[455px] mx-auto` 모바일 셸, 전역 Header(`showBack backHref="back" compact`), 하단 고정 바 높이 계약, 로그인 게이트.
- **자유**: 프로그램 내부 팔레트/타이포/모션/컴포넌트는 완전 신규 가능. 전용 폰트는 `src/app/layout.tsx`에 next/font로 추가(기존 것 제거 금지).
- **금지**: 보라 그라데이션 미스틱 슬롭, 바운스 이징, 좁은 카드에 텍스트 욱여넣기, 이모지 남발(컨셉이 요구하지 않는 한), 기존 옐로 키치의 기계적 재사용(세계관 프로그램일 때).
- 커스텀 CSS 클래스는 globals.css에 추가하되 **pitfalls.md §1(비레이어 클래스가 유틸리티를 덮어쓰는 문제)** 필독.

## 2. 입력 위저드 계약 (use<X>Form이 전부 재현해야 함)

- **쿼리파람**: `type`, `mode`('online'|'qr'), `service_mode`, `qr_code`. 모드 해석은 useInputForm 방식 채택: `isOnline = mode==='online' || (serviceMode==='online' && mode!=='qr')`.
- **오프라인 전용**: 4자리 PIN 입력(길이만 검증), payload와 localStorage userInfo에 오프라인일 때만 포함.
- **인증 게이트**: 비로그인 시 `<AuthModal isOpen closeable={false} showGuestOption={false} redirectPath={현재 searchParams 보존 경로}>` — 게이트 중 next/submit 조기 반환. **온라인/오프라인 카피 분기 주의** (qrLoginTitle을 온라인에 하드코딩하는 실수 재발 금지).
- **QR 뒤로가기 루프 가드**: qr_code 존재 시 history.pushState + popstate에서 '/'로 이탈, 결과 이동은 router.replace.
- **로케일 전환 보존**: `useLocaleSwitchState({ storageKey: 'input-form:<x>:${mode}:${serviceMode}:${qrCode}' })` — storageKey 고유 필수.
- **이미지**: 필요 시 compressImage 후 `POST /api/upload`로 사전 업로드, localStorage에는 URL 저장 (base64는 모바일 쿼터 초과).
- **일일 한도**: `/api/analyze/<x>` 429 `DAILY_ANALYSIS_LIMIT_EXCEEDED` 코드를 클라이언트에서 특별 처리 (useInputForm 참조).
- **결과 핸드오프 (localStorage 계약)**: `analysisResult`(전체 결과 JSON) / `analysisResultLocale` / `productType` / `programType` / `serviceMode` / `qrCode` / `userInfo`{name,gender,(pin)} / `analysisTargetType` + `savedResultId` **제거**. 이후 `router.push('/result?type=<x>')`.
- 옵션 값은 constants.ts의 canonical 문자열, 표시 라벨은 i18n — 순서 재배열 시 양쪽 동기화.

## 3. 로딩 오버레이 계약

- props `{ isVisible, isComplete, onDoorOpened, ... }` — isComplete=true 후 마무리 연출이 끝나면 onDoorOpened 1회 호출(ref 가드), 호출부가 결과로 내비게이트.
- 루트 `fixed inset-0 z-[99999]`, **isVisible 동안 body 스크롤 잠금** (`document.body.style.overflow='hidden'` + 복원).
- 전역 BottomNav는 `/input` 경로에서 원래 미렌더(`isFocusedExperiencePath`) — 오버레이가 네비 위에 못 뜨는 문제는 레이아웃 `main`의 `relative z-10` 스태킹 컨텍스트 때문이며 실플로우에선 무해. dev 하네스에서만 `setMobileOverlayOpen`으로 숨김.
- 진행 바는 0→90%를 예상시간에 걸쳐, 완료 시 100%. 실데이터(계산 API 응답)를 연출에 쓰면 몰입도가 급상승 (사주의 8패 플립).
- 인용구 로테이션은 i18n 키 (`<x>.loading.*`).

## 4. 결과 페이지 계약

- 라우터: `ChemistryResultRouter`에 `?type=<x>` 분기 → 전용 풀페이지. 데이터는 `useResultData` 재사용(localStorage + `?id=` DB 로드 + 로케일 번역 파이프라인 공짜) — is<X>Mode 파생 플래그 추가.
- **저장**: useAutoSave에 product_type 분기 추가 (기본값 image_analysis 오저장 함정). 이미지 없는 프로그램은 user_image 부재 허용 확인.
- **하단 바**: ResultBottomActions의 높이·계약 유지(스킨만 교체): online = 장바구니/바로구매(체크아웃 localStorage 키 `checkoutProductType/checkoutAnalysisId/checkoutSelectedSize/checkoutRecipe` 동일 기록)/공유, offline = 피드백(기존 FeedbackModal 콜백)/기록/공유. serviceMode 미보존 시 클라 기본값이 'offline'이라 구매 버튼이 사라지는 함정 주의.
- **스크롤 서사**: sticky+useScroll 연동 섹션은 페이지당 최대 2개, 나머지는 `whileInView once`. reduced-motion 폴백. 섹션 파일 분할 + `sections/types.ts`에 prop 계약(병렬 에이전트 분업의 축).
- 모달류(Share/Feedback/Auth)는 기존 컴포넌트 그대로 배선, 재스킨 금지.

## 5. 인쇄 보고서 계약 (PrintableReport)

- 캔버스: `w-[842px] h-[595px]` 고정 div, 배경 SVG `absolute inset-0 object-fill`, 값은 픽셀 절대 배치. `@media print { @page { size: A4 landscape; margin: 0 } }` + visibility 트릭 + `print-color-adjust: exact` — 기존 분기 복사.
- 분기 위치: **chemistry/traits-폴백 검사보다 앞에** `product_type === '<ptype>'`.
- 변형: `target_type==='self'` → 먹 단색 젠 / idol → 장식+컬러 (배경 SVG 2종 `<n>-1/-2.svg`).
- **배경 SVG는 장식 전용, 라벨은 HTML** (saju부터의 신관례 — 기존 1-1/2-2는 라벨이 패스로 구워져 있으나 신규는 유지보수를 위해 HTML 라벨).
- 오버플로: 모든 슬롯에 명시적 클램프(slice + 말줄임/WebkitLineClamp/maxHeight+overflow-hidden/truncate/break-keep). **글자 단위 절단 금지 — 말줄임표 부착 또는 어절 경계**. 최장 텍스트 픽스처로 검수.
- bulk-print 호환: `standalonePrintStyles` prop 패턴 유지 (전역 print CSS 중복 주입 금지).
- 인쇄물 라벨은 Korean-only가 기존 관례. 폰트는 로드된 next/font 변수 사용 (`var(--font-noto-serif-kr)` 등 — Pretendard는 선언만 있고 미로드인 함정).

## 6. dev 하네스 패턴

프로덕션 404 가드된 검수 전용 페이지 — 인쇄/오버레이처럼 실플로우로 도달하기 비싼 화면의 반복 검수용:
```tsx
// src/app/[locale]/dev/<x>-print/page.tsx
'use client'
// process.env.NODE_ENV === 'production' → notFound()
// setMobileOverlayOpen('dev-<x>-harness', true) — 전역 네비 숨김 (cleanup 포함)
// scripts/fixtures/<x>-sample.json 주입, ?variant=self|idol 쿼리로 변형 전환
```
결과 페이지 검수는 하네스 대신 localStorage 주입: `/ko`에서 browser_evaluate로 §2의 핸드오프 키 세팅 → `/result?type=<x>` 이동 (로그인 불필요).

## 7. 텍스트 무결성 규칙 (사용자 최우선 불만)

- 산문 렌더 전면 `break-keep`. 행간 넉넉히 (서사 본문 1.8+).
- 한자 병기 토큰(`시(時)`)이 괄호 앞에서 줄바꿈 → word-joiner(⁠)로 접합. 고아 단어는  로 묶기.
- 좁은 칼럼에 서사 금지 — 서사는 전폭, 클램프는 메타데이터에만.
- 카드 안 내용이 좁은 영역에 욱여넣어지는 레이아웃 금지 — 화면을 넓게 시원하게.
