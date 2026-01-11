# CHANGELOG

## 2026-01-12 03:30 - [UPDATE] 마이페이지 기본 탭 변경 및 삭제 버튼 개선

**Changed Files**:
- src/app/mypage/page.tsx (224 lines)
- src/app/mypage/components/SavedAnalysisList.tsx (345 lines → 359 lines)

**Changes**:
- 마이페이지 진입 시 기본 활성 탭을 "내 레시피" → "분석 결과"로 변경
- URL 파라미터 `?tab=recipes`로 내 레시피 탭 직접 접근 가능
- 분석 결과 카드에 삭제 버튼을 항상 표시 (호버 아님)
- 삭제 버튼 위치를 이미지 위 → 정보 영역 오른쪽으로 이동 (클릭 문제 해결)

**Reason**:
- 사용자 요청: "마이페이지에서 처음 들어가면 분석 결과가 기본적으로 먼저 뜨게 해줘"
- 사용자 요청: "호버시 삭제가 아니라 처음부터 삭제 버튼이 보이게 해줘"
- 사용자 버그 리포트: "삭제 버튼 눌러도 클릭이 안 된다"

**Impact**:
- 마이페이지 UX 개선 (분석 결과 먼저 표시)
- 삭제 버튼 접근성 개선 (항상 보임, 클릭 가능)

---

## 2026-01-12 03:15 - [FIX] 커스텀 스크롤바 CSS 우선순위 수정

**Changed Files**:
- src/app/globals.css (411 lines → 418 lines)

**Changes**:
- 스크롤바 스타일을 `@layer base` 밖으로 이동
- Tailwind CSS layer 우선순위 문제 해결

**Reason**:
- `@layer base` 안의 CSS는 Tailwind의 layer 우선순위 때문에 브라우저 기본 스타일보다 낮은 우선순위를 가짐
- 결과적으로 커스텀 스크롤바가 적용되지 않고 기본 회색 스크롤바가 표시됨

**Tried But Failed Approaches**:
- ❌ `@layer base` 내에 전역 스크롤바 스타일 정의: layer 우선순위로 인해 적용 안 됨

**Impact**:
- 전역 커스텀 스크롤바가 정상적으로 적용됨

---

## 2026-01-12 02:30 - [UPDATE] 직접 입력하기 버튼 스크롤 영역 분리 및 스크롤바 스타일 추가

**Changed Files**:
- src/app/input/components/Step2.tsx (57 lines)
- src/app/input/components/Step3.tsx (57 lines)
- src/app/input/components/Step4.tsx (57 lines)
- src/app/globals.css (330 lines → 411 lines)

**Changes**:
- Step2, Step3, Step4에서 CustomInputToggle 컴포넌트를 overflow-y-auto 영역 밖으로 이동
- 선택 칩 목록만 스크롤되고 직접 입력하기 버튼은 항상 하단에 고정
- 전역 스크롤바 스타일 추가 (custom-scrollbar, custom-scrollbar-auto, custom-scrollbar-dark)
- 스크롤바: 6px 너비, 그라데이션 thumb, 둥근 모서리, 호버 효과

**Reason**:
- 사용자 요청: "직접 입력하기는 스크롤 밖으로 빼줘"
- 사용자 요청: "전역 스타일로 스크롤 모양 좀 이쁘게 개선해봐"

**Impact**:
- 선택 항목이 많을 때도 직접 입력 버튼이 항상 보임
- 깔끔하고 모던한 스크롤바 UI 적용 가능

---

## 2026-01-12 02:00 - [FIX] 모바일 입력 폼 레이아웃 잘림 현상 수정

**Changed Files**:
- src/app/input/page.tsx
- src/app/input/components/Step1.tsx

**Changes**:
- 작은 화면(< 640px)에서 CrazyTyper 숨김 (`hidden sm:flex lg:hidden`)
- 상단 패딩 축소 (`pt-28` → `pt-24`)
- main 컨테이너 정렬 변경 (`justify-center` → `justify-start`)
- 전체적인 패딩 축소 (`px-6` → `px-4`, `pb-6` → `pb-4`)
- Step1 여백 축소 (`space-y-6` → `space-y-4`, `mt-6` → `mt-4`)
- ProgressBar 패딩 최적화

**Reason**:
- iPhone SE (375x667) 등 작은 화면에서 스크롤 없이 모든 요소가 한 화면에 담기도록 요청
- 기존 레이아웃이 약 778px 높이를 요구하여 667px 화면에서 잘림

**Impact**:
- 375x667 화면에서 모든 폼 요소가 스크롤 없이 표시됨
- 640px 이상 화면에서는 CrazyTyper 유지

---

## 2026-01-12 01:30 - [FIX] PC 레이아웃 이미지 움찔거림 현상 수정 (2차)

**Changed Files**:
- src/app/result/components/ResultPageMain.tsx

**Changes**:
- PC 좌측 사이드바에서 `max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin` 제거
- 스크롤바 동적 표시/숨김으로 인한 레이아웃 시프트 제거

**Reason**:
- 사용자 보고: "PC에서만 이미지가 계속 움찔거린다"
- 원인: overflow-y-auto + scrollbar-thin이 콘텐츠에 따라 스크롤바 표시/숨김 반복
- 스크롤바 너비만큼 레이아웃이 계속 재계산됨

**Tried But Failed Approaches**:
- ❌ 배경 blob CSS 애니메이션 변경: PC에서 여전히 문제 (모바일은 해결)

**Impact**:
- PC 레이아웃 사이드바 안정화

---

## 2026-01-12 01:25 - [FIX] 결과 페이지 배경 애니메이션 성능 최적화

**Changed Files**:
- src/app/result/components/ResultPageMain.tsx
- src/app/globals.css (CSS 애니메이션 추가)

**Changes**:
- 배경 blob 회전 애니메이션을 framer-motion에서 CSS @keyframes로 변경
- motion.div → 일반 div + CSS animate 클래스

**Impact**:
- GPU 가속 CSS 애니메이션으로 성능 향상

---

## 2026-01-12 01:15 - [STYLE] 피드백 입력 섹션 시각적 강조 개선

**Changed Files**:
- src/app/result/components/feedback/FeedbackStep3NL.tsx (Before: 173 lines → After: ~185 lines)

**Changes**:
- 피드백 입력 영역에 그라데이션 배경 카드 추가 (from-violet-50 to-purple-50)
- textarea 배경을 흰색으로, 테두리 강조 (purple-200)
- 작성 유도 힌트 아이콘 및 텍스트 강조
- AI 피드백 활용 안내 문구 시각적 개선

**Reason**:
- 사용자 요청: "피드백 입력 부분이 좀 더 잘 보였으면 좋겠어"
- 기존: 다른 섹션들에 비해 배경 없이 단조로움
- 개선: 다른 카드들과 일관된 시각적 강조

**Impact**:
- 피드백 입력 영역이 더 눈에 띄어 사용자 입력 유도 개선

---

## 2026-01-12 01:00 - [FIX] PC 레이아웃 좌측 이미지 카드와 우측 탭 높이 정렬

**Changed Files**:
- src/app/result/components/ResultPageMain.tsx (Before: 552 lines → After: 556 lines)

**Changes**:
- 타이틀 섹션("당신만의 향기를 찾았어요!")을 양쪽 컬럼 위로 분리
- 새로운 PC 전용 wrapper div 추가 (`lg:flex lg:flex-row lg:items-start`)
- 좌측 사이드바: 이미지 카드부터 시작 (타이틀 제거)
- 우측 콘텐츠: 탭 네비게이션부터 시작
- 결과: 좌측 이미지 카드 상단 = 우측 탭 네비게이션 상단 (높이 일치)

**Reason**:
- 사용자 요청: "왼쪽 이미지 섹션을 오른쪽 탭 네비게이션과 높이를 맞춰줘"
- 기존에는 왼쪽에 타이틀이 있어서 이미지가 탭보다 아래에 위치했음

**Impact**:
- ✅ PC 레이아웃: 좌측 이미지 카드와 우측 탭 네비게이션이 같은 높이에서 시작
- ✅ PC 레이아웃: 타이틀은 양쪽 컬럼 위에 공통으로 표시
- ✅ 모바일 레이아웃: 영향 없음 (기존 유지)

---

## 2026-01-12 00:30 - [UPDATE] 분석 결과 페이지 PC 전용 레이아웃 추가

**Changed Files**:
- src/app/result/components/ResultPageMain.tsx (PC/모바일 분기 레이아웃)
- src/app/result/components/TabNavigation.tsx (Before: ~117 lines → After: ~117 lines)
- src/app/result/components/AnalysisTab.tsx (Before: ~350 lines → After: ~350 lines)
- src/app/result/components/PerfumeTab.tsx (Before: ~242 lines → After: ~380 lines)
- src/app/result/components/ComparisonTab.tsx (Before: ~264 lines → After: ~340 lines)

**Changes**:
- **ResultPageMain.tsx**: PC용 2컬럼 레이아웃 추가
  - 좌측: 사용자 이미지 + 트위터 ID + 액션 버튼 (sticky sidebar)
  - 우측: 탭 네비게이션 + 탭 콘텐츠 (flex-1 확장)
  - lg: breakpoint(1024px) 기준 PC/모바일 분기
- **TabNavigation.tsx**: `isDesktop` prop 추가
  - PC: 가로 3열 균등 배치 (grid-cols-3)
  - 모바일: 기존 2+1 행 배치 유지
- **AnalysisTab.tsx**: `isDesktop` prop 추가
  - PC: 2컬럼 그리드 (좌: 이미지 분위기, 특성 차트, 컬러 타입 / 우: 스타일 분석, 매칭 키워드)
  - 각 섹션 카드 래핑 (bg-white/40, rounded-2xl, border)
  - Separator 모바일에서만 표시
- **PerfumeTab.tsx**: `isDesktop` prop 추가
  - PC: 헤더 카드 확장 (더 큰 매칭률 원형, 키워드 6개)
  - 향 노트 + 프로필 2컬럼 배치
  - 스토리 + 사용 추천 2컬럼 배치
  - 사용 가이드 3컬럼 그리드
- **ComparisonTab.tsx**: `isDesktop` prop 추가
  - PC: AI 해석 + 유저 요약 2컬럼 배치
  - 비교 분석 카드 2x2 그리드 배치

**Reason**:
- 사용자 요청: "PC 레이아웃에서는 가로도 전체 활용해서 PC용 레이아웃으로 만들어줘"
- 모바일 레이아웃은 이미 완성도 높음 → 그대로 유지
- PC에서는 넓은 화면을 활용하지 못하고 있었음

**Impact**:
- ✅ PC (1024px+): 가로 전체 활용하는 2컬럼 레이아웃
- ✅ 모바일: 기존 레이아웃 100% 유지
- ✅ 모든 기존 데이터/기능 완벽 유지
- ✅ 반응형 전환 자연스럽게 동작

---

## 2026-01-11 23:30 - [FIX] 마이페이지 기존 결과 상세보기 시 중복 저장 버그 수정

**Changed Files**:
- src/app/result/hooks/useResultData.ts (Before: 185 lines → After: 185 lines)
- src/app/result/hooks/useAutoSave.ts (Before: 250 lines → After: 260 lines)
- src/app/result/components/ResultPageMain.tsx (Before: 430 lines → After: 432 lines)

**Changes**:
- `useResultData`에서 URL의 `id` 파라미터를 `existingResultId`로 반환
- `useAutoSave`에 `existingResultId` 파라미터 추가
- URL에 `id`가 있으면 (기존 저장된 결과 조회 중) 자동 저장 스킵
- 콘솔 로그 추가: `[AutoSave] Viewing existing result, skipping save`

**Reason**:
- 사용자 버그 리포트: "마이페이지에서 기존 분석 결과를 클릭하면 동일한 내용이 중복되어 쌓임"
- 문제 흐름:
  1. 마이페이지 → 분석 결과 클릭 → `/result?id=xxx` 이동
  2. `useResultData`가 URL의 `id`로 DB에서 데이터 가져옴
  3. `useAutoSave`가 실행되면서 "새로운 결과"로 판단하여 다시 저장 시도
  4. 중복 데이터 생성!
- 근본 원인: `useAutoSave`가 localStorage의 `savedResultId`만 확인하고, URL의 `id`는 확인하지 않음

**Impact**:
- ✅ 기존 저장된 결과 조회 시 중복 저장 방지
- ✅ 새로운 분석은 기존처럼 자동 저장
- ✅ 마이페이지 데이터 정합성 유지

---

## 2026-01-11 - [UPDATE] AI 프롬프트에 캐릭터 배경 지식 활용 기능 추가

**Changed Files**:
- src/lib/gemini/prompt-builder.ts (Before: 202 lines → After: ~240 lines)

**Changes**:
- Gemini AI가 유명 캐릭터/아이돌을 인식하면 배경 지식을 적극 활용하도록 프롬프트 개선
- 새로운 "캐릭터/아이돌 인식 및 배경 지식 활용" 섹션 추가
  - 공식 설정 (성격, 능력, 배경 스토리, 관계도)
  - 작품 속 명장면, 명대사
  - 팬덤 사이 유명한 별명, 밈, 특징
  - 원작의 분위기, 콘셉트
- 예시 추가:
  - "명탐정 코난" → 천재 탐정, 쿨한 추리, "진실은 언제나 하나!"
  - "BTS 지민" → 춤신춤왕, 부산 사투리, ARMY 사이 별명
  - "원신 레이든 쇼군" → 번개 신, 영원 추구, 단팥죽 좋아함
- 안전장치: 캐릭터를 모르거나 확신 없으면 이미지 분석에만 집중

**Reason**:
- 사용자 요청: "코난을 입력하면 실제 코난을 알고 있다는 가정하에 주접을 날리는게 가능할까?"
- 현재는 이미지만 분석, 캐릭터의 스토리/설정은 활용 안 함
- Gemini 3.0은 유명 캐릭터/아이돌 지식 보유, 이를 활용하면 더 깊이 있는 주접 가능

**Impact**:
- 유명 캐릭터: 공식 설정 기반 풍부한 주접 멘트 생성
  - 예: "코난의 쿨한 추리력처럼 이 향도 날카롭고 이성적이야! 🔍✨"
- K-pop 아이돌: 실제 멤버 특징 반영 (춤, 성격, 별명)
- 마이너 캐릭터: 기존처럼 이미지만 분석 (환각 방지)
- 표면적 분석 → 깊이 있는 팬 언어

---

## 2026-01-11 - [REFACTOR] 향수 카드 디자인 개선 - 시각적 어필 + 가독성 확보

**Changed Files**:
- src/app/result/components/PerfumeTab.tsx (Before: ~225 lines → After: ~200 lines)

**Changes**:
- 밝은 배경(bg-white) 유지하되 향수 색상을 포인트로 활용
- 향수 primaryColor를 배경과 테두리에만 적용, **텍스트는 모두 검정 고정**
  - 테두리: 2px solid primaryColor
  - 그림자: 향수 색상 기반 soft shadow
  - 배지: primaryColor 20% 투명도 배경 + **검정 텍스트 (text-slate-700)**
  - 키워드: primaryColor 20% 배경 + 40% 테두리 + **검정 텍스트 (text-slate-700)**
  - 매칭률: primaryColor 원형 진행바 + **검정 숫자 (text-slate-800)**
- 배경 데코: primaryColor/secondaryColor blur 효과 (opacity 20%/15%)
- 모든 텍스트 검정 고정으로 가독성 보장
  - 배지/키워드: text-slate-700
  - 메인 텍스트: text-slate-800
  - 보조 텍스트: text-slate-600, text-slate-500

**Reason**:
- 이전 단순 디자인이 시각적으로 심심함
- 향수 색상을 텍스트에 적용했더니 밝은 색(노랑, 핑크)이 흰 배경에서 안 보임
- 사용자 피드백: "하... ㅅㅂ 텍스트가 노랑색이니 또 하나도 안 읽히잖아"
- 해결: 향수 색상은 배경/테두리만, 텍스트는 무조건 검정

**Impact**:
- 각 향수가 고유 색상으로 시각적으로 구분됨
- **모든 텍스트 가독성 100% 보장** (밝은 배경 + 검정 텍스트)
- 색상 포인트로 프리미엄한 느낌 유지

---

## 2026-01-11 - [FIX] 마이페이지에서 주접 멘트가 달라지는 타이밍 버그 수정

**Changed Files**:
- src/app/result/hooks/useAutoSave.ts (Before: 249 lines → After: 249 lines)

**Changes**:
- 자동 저장 조건에 `twitterName` 존재 여부 체크 추가
- `analysisResult && twitterName` 둘 다 있을 때만 저장 실행

**Reason**:
- 문제: 마이페이지에서 과거 분석 결과를 볼 때 주접 멘트가 처음과 달라짐
- 원인: `twitterName`이 비동기로 생성되는 동안 빈 문자열로 DB 저장
  - useResultData: twitterName을 useEffect 안에서 비동기 생성
  - useAutoSave: analysisResult만 체크하고 즉시 저장 실행
  - twitterName이 빈 문자열 ''일 때 DB에 저장됨
  - 나중에 불러올 때: DB의 빈 twitter_name → generateTwitterName() 재실행 → 새 랜덤 멘트 생성
- 해결: twitterName이 생성될 때까지 저장 대기

**Impact**:
- 처음 분석한 주접 멘트가 마이페이지에서도 동일하게 유지됨
- twitterName이 DB에 제대로 저장됨

---

## 2026-01-11 - [FIX] 밝은 배경색 향수 카드 텍스트 가시성 개선

**Changed Files**:
- src/utils/colorUtils.ts (신규, 37 lines)
- src/app/result/components/PerfumeTab.tsx (Before: 220 lines → After: ~225 lines)

**Changes**:
- 배경색 밝기 기반 동적 텍스트 색상 계산 함수 추가 (`getContrastTextColor`)
- Luminance 계산 로직 구현 (WCAG 표준 기반)
- PerfumeTab 향수 카드에서 배경색에 따라 텍스트 색상 자동 선택
  - 밝은 배경 (luminance > 0.5): 어두운 텍스트 (#1E293B)
  - 어두운 배경 (luminance ≤ 0.5): 흰색 텍스트 (#FFFFFF)

**Reason**:
- 문제: AC'SCENT 02, 03, 09, 13, 22 등 밝은 배경색 향수에서 흰색 텍스트가 거의 보이지 않음
- 원인: PerfumeTab에서 동적 배경색 사용, 텍스트는 항상 `text-white` 고정
- 해결: 배경색 밝기를 계산하여 텍스트 색상을 자동으로 선택

**Impact**:
- 모든 향수(30개)에서 텍스트 가시성 자동 보장
- 새 향수 추가 시에도 별도 작업 없이 자동 적용
- WCAG 접근성 기준 준수

---

## 2025-01-07 - [FIX] Next.js 빌드 에러 수정 (useSearchParams Suspense boundary)

**Changed Files**:
- src/app/result/page.tsx (Before: 6 lines → After: 35 lines)

**Changes**:
- `ResultPageMain` 컴포넌트를 `<Suspense>` boundary로 감싸기
- `ResultLoading` 로딩 컴포넌트 추가 (기존 스타일 유지)

**Reason**:
- 빌드 에러: `useSearchParams() should be wrapped in a suspense boundary at page "/result"`
- Next.js App Router에서 `useSearchParams()` 사용 시 Suspense 필수

**Impact**:
- 빌드 성공
- `/result` 페이지 초기 로딩 시 로딩 UI 표시

---

## 2025-01-06 - [UPDATE] 마이페이지 갤러리 카드에 확정 레시피 표시

**Changed Files**:
- src/app/api/user/data/route.ts (Before: 129 lines → After: ~150 lines)
- src/app/mypage/components/SavedAnalysisList.tsx (Before: 287 lines → After: ~300 lines)
- src/app/mypage/page.tsx (타입 수정)

**Changes**:
- **API 수정**: 분석 결과 조회 시 연결된 확정 레시피(result_id) 함께 조회
- **갤러리 카드 수정**: perfume_brand 태그 대신 확정 레시피 granules 표시
  - 레시피가 있으면: "블랙베리 40%", "시트러스 30%" 등 향료 태그 표시
  - 레시피가 없으면: 기존 perfume_brand 표시

**Reason**:
- 사용자 요청: 갤러리 카드에서 주접 멘트 대신 확정한 레시피 표시
- UX 개선: 어떤 레시피를 확정했는지 한눈에 확인 가능

**Impact**:
- 마이페이지 분석 결과 갤러리에서 확정 레시피 바로 확인 가능
- 레시피 미확정 분석은 기존대로 브랜드명 표시

---

## 2025-12-30 - [FIX] Kakao 로그인 후 세션 유지 안되는 문제 수정 (2차 수정)

**Changed Files**:
- src/lib/supabase/client.ts (Before: 42 lines → After: 43 lines)
- src/lib/supabase/server.ts (신규, 31 lines)
- src/app/api/auth/kakao/route.ts (import 수정)
- package.json (@supabase/ssr 의존성 추가)

**Changes**:
- **클라이언트도 쿠키 기반으로 변경 (2차 수정)**
  - `createClient` → `createBrowserClient`로 변경
  - 클라이언트에서도 쿠키에 저장된 세션을 읽을 수 있게 됨

- **@supabase/ssr 패키지 설치 및 쿠키 기반 세션 관리 (1차 수정)**
  - `@supabase/ssr` 패키지 추가
  - `src/lib/supabase/server.ts` 파일 생성 (서버 전용)
  - `createServerSupabaseClientWithCookies()` 함수로 쿠키 기반 세션 생성
  - Kakao 로그인 라우트에서 새 함수 사용

**Reason**:
- 버그: Kakao 로그인 후에도 Header에서 "로그인" 버튼이 계속 표시됨
- 1차 원인: 서버 `createServerSupabaseClient()`가 `persistSession: false`라 쿠키에 세션 미저장
- 2차 원인: 클라이언트 `createClient`가 localStorage만 확인, 쿠키의 세션을 읽지 못함

**Tried But Failed Approaches**:
- ❌ 서버만 쿠키 기반으로 변경: 클라이언트가 여전히 localStorage만 확인해서 실패

**Impact**:
- 서버-클라이언트 간 세션 동기화 완료
- Kakao 로그인 후 즉시 Header에 로그인 상태 표시
- 세션이 쿠키에 저장되어 페이지 새로고침 후에도 로그인 유지

---

## 2025-12-30 - [UPDATE] 로그인 UX 개선 및 비회원 시작하기 기능 추가

**Changed Files**:
- src/components/layout/Header.tsx (Before: 273 lines → After: 273 lines)
- src/app/api/auth/kakao/route.ts (Before: 181 lines → After: 181 lines)
- src/app/page.tsx (Before: 277 lines → After: 345 lines)
- src/components/auth/AuthModal.tsx (Before: 141 lines → After: 142 lines)

**Changes**:
- **Header에 로그인 상태 표시 추가**
  - 로그인 시: 녹색 "로그인됨" 배지 + 아바타 표시
  - 비로그인 시: 노란색 "로그인" 버튼 표시 (데스크탑)
  - 햄버거 메뉴에서도 로그인 상태 확인 가능

- **Kakao 기존 사용자 재로그인 처리 개선**
  - 기존: 매번 새 비밀번호 생성 → 기존 사용자 로그인 실패
  - 변경: Kakao ID 기반 고정 비밀번호 생성 (`generateKakaoPassword`)
  - 로그인 시도 → 실패 시 회원가입 순서로 변경
  - 기존 사용자 프로필 정보 자동 업데이트

- **메인 페이지 로그인 체크 모달 추가**
  - 분석 기능 클릭 시 비로그인 사용자에게 안내 모달 표시
  - 로그인 혜택 안내 (분석 결과 자동 저장, 마이페이지에서 확인)
  - 비회원 경고 (페이지 나가면 결과 사라짐)

- **비회원 시작하기 기능 추가**
  - "비회원으로 시작하기 (저장 안됨)" 버튼
  - 로그인 없이 분석 기능 사용 가능
  - 로그인/회원가입 버튼과 함께 선택지 제공

**Reason**:
- 사용자 요청: 로그인 상태가 메인 페이지에서 표시되지 않음
- 사용자 요청: 카카오 기존 사용자 재가입 시 오류 발생
- 사용자 요청: 분석 기능 사용 전 로그인 안내 및 비회원 옵션 제공

**Impact**:
- 로그인 상태 가시성 향상 (Header에서 즉시 확인)
- Kakao 로그인 안정성 개선 (기존 사용자 재로그인 가능)
- 사용자 선택권 증가 (로그인 vs 비회원)
- 비로그인 사용자에게 데이터 미저장 경고 제공

---

## 2025-12-21 - [ADD] 분석 결과 자동 저장 및 Supabase Storage 연동

**Changed Files**:
- supabase-storage-migration.sql (신규, SQL 마이그레이션)
- src/lib/image/compressor.ts (Before: 132 lines → After: 236 lines)
- src/lib/supabase/storage.ts (신규, 104 lines)
- src/app/api/upload/route.ts (신규, 89 lines)
- src/app/api/results/route.ts (Before: 67 lines → After: 71 lines)
- src/app/result/hooks/useAutoSave.ts (신규, 166 lines)
- src/components/auth/AuthModal.tsx (Before: 141 lines → After: 141 lines)
- src/app/result/components/ResultPageMain.tsx (Before: 370 lines → After: 422 lines)

**Changes**:
- 분석 완료 시 자동으로 결과 저장 (공유 버튼 클릭 불필요)
- Supabase Storage `analysis-images` 버켓으로 이미지 저장
- 이미지 압축 최적화 (800x960, 품질 0.7, 최대 500KB 목표)
- 익명 사용자: fingerprint로 저장 → 로그인 시 자동 연동
- 로그인 사용자: user_id로 즉시 저장
- 결과 페이지에 저장 상태 배지 표시 (저장 중 / 저장됨)
- 익명 사용자 로그인 유도 모달 추가
- link_fingerprint_data RPC 업데이트 (analysis_results도 연동)

**Reason**:
- 마이페이지에서 분석 결과가 표시되지 않는 문제 해결
- 기존: user_id 없이 저장 → 마이페이지에서 조회 불가
- 이미지를 base64로 DB에 저장하던 비효율 개선

**Impact**:
- 마이페이지 "분석 결과" 탭에서 이전 분석 결과 확인 가능
- 이미지가 Supabase Storage에 저장되어 용량/속도 최적화
- 익명으로 분석 후 로그인하면 데이터 자동 연동

**SQL 실행 필요**:
- `supabase-storage-migration.sql` 파일을 Supabase SQL Editor에서 실행 필요

---

## 2025-12-19 - [UPDATE] Gemini 모델 업그레이드 (2.0 → 3.0 Flash)

**Changed Files**:
- src/lib/gemini/client.ts (Before: 41 lines → After: 41 lines)

**Changes**:
- AI 분석 모델을 `gemini-2.0-flash-exp`에서 `gemini-3-flash-preview`로 업그레이드
- Gemini 3.0 Flash 주요 개선사항:
  - 출력 토큰 한도: 8,192 → 65,536 (필요시 확장 가능)
  - 사고(Thinking) 기능 지원
  - URL 컨텍스트 지원
  - 지식 기준: 2025년 1월

**Reason**:
- 최신 Gemini 3.0 Flash 모델 출시에 따른 업그레이드

**Impact**:
- 이미지 분석 및 향수 추천 품질 향상 기대
- 피드백 기반 커스텀 레시피 생성 품질 향상 기대

---

## 2025-12-14 - [STYLE] RetryFeedbackGuide 디자인 개선

**Changed Files**:
- src/app/result/components/feedback/RetryFeedbackGuide.tsx

**Changes**:
- 헤더 아이콘에 스프링 애니메이션 추가 + 그림자 효과
- 안내 메시지 더 간결하게 정리 (Info 아이콘 → Sparkles 아이콘)
- 이전 피드백 요약 카드 디자인 개선 (카드 안에 카드 구조)
- 추천 향 유지 비율 프로그레스 바에 애니메이션 추가
- 플로우 안내 디자인 개선 (숫자 원형 배지 + 컴팩트 레이아웃)
- 불필요한 카테고리 조정 섹션 제거 (사용하지 않는 기능)
- 전체적으로 더 깔끔하고 모던한 레이아웃

**Reason**:
- 사용자 요청: 디자인 레이아웃 개선

**Impact**:
- 재피드백 안내 화면 UX 개선

---

## 2025-12-14 - [UPDATE] 레시피 확정 페이지 단위 변경 (g → ml)

**Changed Files**:
- src/app/result/components/feedback/RecipeConfirm.tsx

**Changes**:
- 향료 계량 단위를 g(그램)에서 ml(밀리리터)로 변경
- 향료 컬러 박스, 용량 표시, 합계, 클립보드 복사 텍스트 모두 ml 단위로 통일
- 계량 팁 메시지 수정: "정밀 저울" → "스포이드나 피펫"

**Reason**:
- 사용자 요청: g 단위 필요 없음, ml 단위만 표시

**Impact**:
- RecipeConfirm 컴포넌트에서 모든 용량 표시가 ml 단위로 통일됨

---

## 2025-12-14 - [FIX] 밝은 배경색 향료 카드 텍스트 가시성 개선

**Changed Files**:
- src/app/result/components/feedback/FeedbackSuccess.tsx (밝은 배경 텍스트 색상 수정)
- src/app/result/components/feedback/RecipeConfirm.tsx (밝은 배경 텍스트 색상 수정)

**Changes**:
- 화이트로즈(AC'SCENT 22) 등 밝은 배경색 향료 카드에서 텍스트가 보이지 않는 문제 수정
- YIQ 밝기 공식을 사용한 `isLightColor()` 함수 추가
- 밝은 배경(brightness > 180): 어두운 텍스트(text-slate-800) + 테두리(border-slate-200) 적용
- 어두운 배경: 기존 흰색 텍스트(text-white) 유지

**Reason**:
- AC'SCENT 22 (화이트로즈)는 primaryColor가 #FFFFFF로 흰색
- 기존 코드는 모든 향료에 흰색 텍스트를 적용해 흰색 배경에서 텍스트가 보이지 않았음

**Impact**:
- 모든 향료 색상에서 텍스트 가시성 보장
- FeedbackSuccess와 RecipeConfirm 두 화면 모두 수정됨

---

## 2025-12-14 - [ADD] 레시피 확정 및 재피드백 기능 추가

**Changed Files**:
- src/types/feedback.ts (용량별 계산 타입 및 함수 추가)
- src/app/result/components/feedback/FeedbackSuccess.tsx (확정/재피드백 버튼 추가)
- src/app/result/components/feedback/RecipeConfirm.tsx (신규 - 레시피 확정 페이지)
- src/app/result/components/feedback/RetryFeedbackGuide.tsx (신규 - 재피드백 안내 모달)
- src/app/result/components/feedback/FeedbackStep1.tsx (이전 피드백 표시 추가)
- src/app/result/components/feedback/FeedbackStep2New.tsx (이전 피드백 표시 추가)
- src/app/result/components/FeedbackModal.tsx (뷰 상태 관리 및 플로우 통합)

**Changes**:
- **레시피 확정 기능**
  - 레시피 완성 후 "레시피 확정하기" 버튼으로 용량별 계량 페이지 이동
  - 3가지 제품 타입 선택: 향수 10ml (향료 2ml), 향수 50ml (향료 10ml), 디퓨저 5ml (향료 5ml)
  - 각 향료별 비율에 따라 ml 및 g 단위로 정확한 계량 표시
  - 레시피 복사 기능 (텍스트 클립보드 복사)

- **재피드백 기능**
  - "다시 피드백 기록하기" 버튼으로 새 피드백 시작
  - 재피드백 안내 모달에서 이전 피드백 내역 확인 가능
  - Step 1, Step 2에서 이전 선택 내용 참고 표시
  - 처음 추천받은 향수 기준으로 피드백 재기록

- **새 타입 정의**
  - ProductType: 'perfume_10ml' | 'perfume_50ml' | 'diffuser_5ml'
  - PRODUCT_TYPES: 제품별 용량 정보 배열
  - GranuleAmount: 향료별 계산 결과 (ml, g)
  - calculateGranuleAmounts(): 비율 → 실제 용량 계산 함수

**Reason**:
- 사용자가 테스트 레시피를 마음에 들어하면 실제 제품 제작을 위한 정확한 계량 필요
- 레시피가 마음에 안 들면 새로운 피드백으로 다시 시도할 수 있어야 함
- 재피드백 시 이전 선택 내용 참고하여 더 나은 레시피 생성 가능

**Impact**:
- 피드백 완성 후 2가지 선택지 제공 (확정 vs 재시도)
- 완전한 레시피 → 제품 제작 워크플로우 완성
- UX 개선: 사용자가 원하는 결과를 얻을 때까지 반복 가능

---

## 2025-12-14 - [UPDATE] 닫힌 카테고리 토글에 선택 향료 미리보기 추가

**Changed Files**:
- src/app/result/components/feedback/FeedbackStep2New.tsx (선택 향료 미리보기 기능)

**Changes**:
- **닫힌 카테고리 토글에 선택된 향료 미리보기 표시**
  - 카테고리가 닫혀있을 때, 해당 카테고리에서 선택된 향료가 있으면 표시
  - 형식: "AC'SCENT 02 15%" 형태의 배지 스타일
  - 선택된 향료가 있는 카테고리는 연한 앰버 배경 + 앰버 테두리로 강조
  - 기존 카테고리 설명 텍스트는 미리보기로 대체됨

**Reason**:
- 사용자가 카테고리를 닫아도 어떤 향료를 선택했는지 한눈에 확인 가능
- 여러 카테고리를 탐색할 때 이미 선택한 항목을 쉽게 추적

**Impact**:
- 피드백 Step 2 UX 개선
- 사용자가 선택 상태를 더 직관적으로 파악 가능

---

## 2025-12-14 - [FIX] 향 밸런스 계산 버그 및 캐릭터 이름 혼동 수정

**Changed Files**:
- src/lib/gemini/feedback-prompt.ts (프롬프트 계산식 명확화)
- src/app/result/components/ResultPageMain.tsx (characterName 전달 제거)

**Changes**:
- **향 밸런스 변화 ±0 버그 수정**
  - 원인: AI에게 원본 향수 점수를 명확히 제공하지 않아 originalScore = newScore로 출력
  - 수정: 프롬프트에 원본 향수의 6개 카테고리 점수를 0-100 스케일로 명시적 제공
  - categoryChanges JSON 형식에 실제 originalScore 값 예시 추가
  - 변화량 규칙 명확화: increased면 +10 이상, decreased면 -10 이상, maintained면 ±5 이내
- **캐릭터 이름 vs 주접 멘트 혼동 수정**
  - 원인: twitterName("도시적... 당신을 만난 건 운명이었어요...")을 characterName으로 잘못 전달
  - twitterName은 랜덤 주접 멘트 생성기에서 나오는 값으로, 캐릭터 이름이 아님
  - 수정: characterName 파라미터 전달 제거 (시스템에 실제 캐릭터 이름 개념 없음)

**Reason**:
- 사용자 버그 리포트: "향 밸런스 변화에 아무것도 변화된게 없다고 뜬다"
- 사용자 버그 리포트: "'도시적... 당신을 만난 건 운명이었어요...' 멘트를 계속 반복... 캐릭터 이름으로 착각하는 것 같아"

**Tried But Failed Approaches**:
- ❌ JSON 예시에서 originalScore 값을 "원래점수(0-100)"로 표시 → AI가 실제 숫자 대신 그대로 출력

**Impact**:
- 향 밸런스 차트가 실제 변화량을 정확히 표시
- AI가 주접 멘트를 캐릭터 이름으로 오인하지 않음

---

## 2025-12-14 - [UPDATE] 피드백 레시피 UI/UX 대폭 개선

**Changed Files**:
- src/lib/gemini/feedback-prompt.ts (프롬프트 개선: 반복 문구 방지, 테스트 방법, categoryChanges)
- src/types/feedback.ts (CategoryChange 타입에 originalScore, newScore 추가)
- src/app/result/components/feedback/FeedbackSuccess.tsx (UI 전면 개편)

**Changes**:
- **프롬프트 반복 문구 방지**
  - 각 향료의 reason이 서로 다르게 생성되도록 명시
  - "같은 문장/표현 반복 금지" 규칙 추가
  - 다양한 reason 예시 제공
- **테스트 방법 수정 (시약병 + 시향지 방식)**
  - 이전: 손목에 뿌리고 기다리는 방식 (잘못됨)
  - 변경: 시약병에 방울 넣고 → 시향지 담그고 → 시향지로 향 맡기
- **향 밸런스 변화 시각화 개선**
  - categoryChanges에 6개 카테고리 모두 포함하도록 명시
  - originalScore, newScore 필드 추가 (0-100 점수)
  - 듀얼 바 차트로 기존/변경 점수 비교 시각화
  - 카테고리별 색상 적용 (시트러스=노랑, 플로럴=핑크 등)
  - 변화량 표시 (+10, -5 등)
- **FeedbackSuccess UI 컴팩트화**
  - 전체적으로 여백/사이즈 축소
  - 아이콘 과도 사용 제거
  - 깔끔한 프로덕션 수준 디자인

**Reason**:
- 사용자 버그 리포트: 같은 문장이 모든 향료에 반복됨
- 사용자 피드백: 테스트 방법이 잘못됨 (시약병+시향지 방식이어야 함)
- 사용자 요청: 향 밸런스 변화가 제대로 표시 안 됨, 전문적 비교 분석 필요

**Impact**:
- AI가 각 향료별 고유한 설명 생성
- 올바른 향수 테스트 방법 안내
- 기존 향 대비 변화를 시각적으로 명확하게 보여줌

---

## 2025-12-14 - [UPDATE] 프롬프트 캐릭터 이름 언급 방식 자연스럽게 수정

**Changed Files**:
- src/lib/gemini/feedback-prompt.ts (프롬프트 자연스러운 톤으로 수정)

**Changes**:
- **캐릭터 이름 언급 방식 자연스럽게 변경**
  - 이전: 모든 필드에 캐릭터 이름을 강제로 언급하도록 명시
  - 이후: 자연스럽게 언급하도록 안내, 강제 아닌 권장으로 변경
  - "ㅇㅇ(최애)" 플레이스홀더 사용 금지는 유지
- **필드별 강제 언급 제거**
  - reason, fanComment, overallExplanation, fanMessage 등에서 캐릭터 이름 강제 언급 제거
  - AI가 자연스럽게 주접 스타일로 캐릭터를 언급하도록 유도

**Reason**:
- 사용자 피드백: "모든 텍스트에서 강제로 캐릭터 이름을 직접 언급할 필요는 없어. 자연스럽게 주접을 떨어야지"
- 너무 강제적인 언급이 오히려 부자연스러운 결과물을 생성

**Impact**:
- AI가 더 자연스러운 팬 스타일 주접 텍스트 생성
- 캐릭터 이름은 적절한 곳에서 자연스럽게 언급됨

---

## 2025-12-14 - [FIX] 피드백 레시피 생성 시 캐릭터 이름 미전달 버그 수정

**Changed Files**:
- src/lib/gemini/feedback-prompt.ts (캐릭터 이름 파라미터 추가, 프롬프트 대폭 수정)
- src/app/api/feedback/customize/route.ts (characterName 파라미터 추가)
- src/app/result/hooks/useFeedbackForm.ts (characterName 전달)
- src/app/result/components/FeedbackModal.tsx (characterName prop 추가)
- src/app/result/components/ResultPageMain.tsx (twitterName을 characterName으로 전달)

**Changes**:
- **피드백 레시피 생성 시 캐릭터 이름이 "ㅇㅇ(최애)"로 출력되던 버그 수정**
  - 원인: 프롬프트에 캐릭터 이름 정보가 전달되지 않음
  - 수정: twitterName(캐릭터 이름)을 FeedbackModal → useFeedbackForm → API → 프롬프트로 전달
- **프롬프트에 캐릭터 이름 강조 섹션 추가**
  - 캐릭터 이름이 있을 경우 모든 텍스트에서 직접 언급하도록 명시
  - "ㅇㅇ(최애)" 같은 플레이스홀더 사용 금지 명시
  - 예시도 캐릭터 이름을 포함한 버전으로 변경

**Reason**:
- 사용자 버그 리포트: AI 레시피 생성 결과에 실제 캐릭터 이름 대신 "ㅇㅇ(최애)"가 출력됨
- 원래 분석 결과에서 캐릭터 이름을 알고 있지만, 피드백 기능에 전달되지 않았음

**Impact**:
- 피드백 레시피 생성 시 실제 캐릭터 이름 (예: "리바이", "아이유")이 출력됨
- 주접 멘트가 캐릭터 맞춤형으로 생성됨

---

## 2025-12-14 - [FIX] 슬라이더 동시 움직임 버그 수정 및 비율 상태 상단 고정

**Changed Files**:
- src/app/result/components/feedback/FeedbackStep2New.tsx (Before: 440 lines → After: 407 lines)
- src/app/result/components/FeedbackModal.tsx (Before: 330 lines → After: 378 lines)

**Changes**:
- **슬라이더 동시 움직임 버그 수정**
  - 각 향료 슬라이더에 고유 id와 name 속성 추가 (`ratio-slider-${scent.id}`)
  - 두 개의 추가 향료 비율을 독립적으로 조절 가능하게 수정
- **현재 비율 상태 상단 고정**
  - Step 2에서 현재 비율 상태 표시를 모달 상단에 sticky로 고정
  - 스크롤해도 항상 비율 상태를 확인하며 향료 선택 가능
  - 범례 추가 (색상 dot + 텍스트로 추천 향/추가 향료 구분)
  - FeedbackStep2New에서 중복 비율 상태 표시 제거

**Reason**:
- 사용자 버그 리포트: 두 개의 향료 슬라이더가 동시에 움직이는 문제
- 사용자 요청: 스크롤하면서도 비율 상태를 계속 확인할 수 있도록

**Impact**:
- 향료 비율 조절 UX 개선 (독립적 조절 가능)
- 비율 상태 가시성 향상 (상단 고정으로 항상 확인 가능)

---

## 2025-12-14 - [REFACTOR] 피드백 모달 3단계 → 2단계 통합 및 UX 개선

**Changed Files**:
- src/app/result/components/feedback/FeedbackStep2New.tsx (신규 생성 - 292 lines)
- src/app/result/components/FeedbackModal.tsx (Before: 339 lines → After: 330 lines)
- src/app/result/hooks/useFeedbackForm.ts (수정)
- src/types/feedback.ts (이전 세션에서 수정)
- src/app/result/components/feedback/FeedbackStep1.tsx (이전 세션에서 수정)
- src/lib/gemini/feedback-prompt.ts (이전 세션에서 수정)

**Changes**:
- **피드백 모달 3단계 → 2단계로 통합**
  - 기존: Step 1(잔향률) → Step 2(카테고리 선호) → Step 3(향료 추가)
  - 변경: Step 1(추천 향 비율) → Step 2(향료 선택 통합)
- **새로운 FeedbackStep2New 컴포넌트 생성**
  - 상단에 추천 향수 정보 표시 (이름, 카테고리, 선택 비율)
  - 6개 카테고리를 아코디언 형태로 표시
  - 카테고리 펼치면 해당 카테고리의 실제 향수 목록 표시
  - 최대 2개 추가 향료 선택 가능 + 비율 슬라이더
  - 추가 메모 섹션 포함
- **"잔향률" 개념 → "추천 향 비율" 개념으로 변경**
  - 이전: 잔향이 얼마나 오래 지속되는지 선택
  - 변경: 추천받은 향을 얼마나 유지할지 선택 (나머지는 새 향료로 채움)
  - RETENTION_MESSAGES 전면 수정
  - Gemini 프롬프트도 새 개념에 맞게 수정
- **useFeedbackForm 훅 단계 로직 수정**
  - nextStep: step < 3 → step < 2
  - submit 성공 시: setStep(4) → setStep(3)

**Reason**:
- 사용자 피드백: "잔향률"은 잘못된 개념, 실제로는 "추천 향을 얼마나 유지할지" 선택하는 기능
- 오프라인 향수 공방에서 추천 향을 맡아보고 해당 향 비율을 결정하는 UX
- 예: 20% 선택 → 추천 향 20% + 새 향료 80%
- 기존 Step 2(카테고리 선호도 증가/유지/감소)는 불필요하다고 판단하여 제거
- 기존 Step 3의 향료 검색 기능이 실제 데이터를 제대로 불러오지 않는 문제 해결

**Impact**:
- 피드백 입력 단계 간소화 (3단계 → 2단계)
- 향료 선택 UX 대폭 개선 (카테고리별 아코디언으로 직관적 탐색)
- 실제 30가지 AC'SCENT 향료 데이터 정상 표시
- AI 프롬프트가 새 비율 개념에 맞춰 레시피 생성

---

## 2025-12-13 - [FIX] 주접 멘트 캐릭터 맞춤화 강화

**Changed Files**:
- src/lib/gemini/prompt-builder.ts (Before: 179 lines → After: 201 lines)

**Changes**:
- `matchReason`, `noteComments`, `usageGuide` 필드 프롬프트 대폭 강화
  - 모든 필드에서 캐릭터 이름과 구체적 특성(눈빛, 표정, 의상, 행동) 반드시 언급하도록 지시
  - 탑노트: 캐릭터의 첫인상/눈빛/표정과 연결 (예: "리바이의 차갑게 내려깐 눈빛처럼...")
  - 미들노트: 캐릭터의 성격/분위기/행동 패턴과 연결 (예: "리바이의 냉철한 판단력처럼...")
  - 베이스노트: 캐릭터의 숨겨진 매력/깊은 면과 연결 (예: "리바이의 숨은 상처처럼...")
  - 사용 가이드: 캐릭터의 세계관/장면과 연결 (예: "리바이처럼 결단의 순간에 뿌려!")
  - 사용 팁: 캐릭터의 구체적 장면/모먼트와 연결 (예: "리바이가 칼 뽑는 장면 떠올리면서...")
- 예시 응답 2개 추가 (시크/다크 캐릭터용, 밝고 귀여운 캐릭터용)

**Reason**:
- 사용자 피드백: 주접 멘트가 너무 일반적이고 캐릭터와 연결이 약함
- 이전: "우리 애 생각하면서 출근할 때 뿌려!" (일반적)
- 이후: "리바이처럼 결단의 순간에 뿌려! 중요한 미팅 전에 이 향 뿌리면 리바이의 카리스마가 빙의된 느낌!" (구체적)

**Impact**:
- 향수 스토리, 사용 추천, 사용 가이드 모두 캐릭터 고유 특성과 직접 연결
- 캐릭터 이름과 특정 장면/행동을 언급하여 몰입감 극대화
- 시크한 캐릭터/밝은 캐릭터 모두에 맞춤화된 멘트 생성

---

## 2025-12-13 - [FIX] AI 이미지 분석 우선순위 강화 및 API 로깅 개선

**Changed Files**:
- src/lib/gemini/prompt-builder.ts (Before: 168 lines → After: 179 lines)
- src/app/api/analyze/route.ts (Before: 185 lines → After: 261 lines)

**Changes**:
- 프롬프트에 "이미지 분석 최우선 원칙" 섹션 추가
  - 이미지 분석 필수 체크리스트 (헤어, 눈빛, 표정, 의상, 포즈, 배경 등)
  - 분석 우선순위: 이미지 70% + 유저 선택 30%
  - 이미지와 유저 선택 불일치 시 comparisonAnalysis에서 상세 분석 지시
- `imageInterpretation` 필드 요구사항 강화
  - 구체적 분석 항목 명시 (①헤어 ②눈빛/표정 ③의상/장비 ④포즈 ⑤분위기)
  - 팬 응답 무시하고 순수 이미지 분석 강조
- API route에 상세 디버깅 로그 추가
  - 요청 ID 기반 추적 시스템
  - 입력 데이터 상세 로깅 (이름, 스타일, 이미지 첨부 여부)
  - AI 응답 미리보기 (imageInterpretation, traits, perfumeId)
  - 파싱 결과 요약 로깅
  - 에러 발생 시 상세 스택 트레이스

**Reason**:
- 사용자 버그 리포트: 리바이(진격의 거인) 이미지 업로드 시 "귀여운", "밝은" 등 완전히 다른 분석 결과 반환
- 원인 분석: AI가 이미지를 무시하고 유저의 폼 선택만 기반으로 분석
- 디버깅 어려움: 기존 로그가 너무 단순해서 문제 추적 불가

**Impact**:
- AI가 이미지를 철저히 분석한 후 결과 생성
- 이미지와 유저 선택이 다를 경우 comparisonAnalysis에서 차이점 상세 분석
- 서버 로그에서 분석 과정 전체 추적 가능

---

## 2025-12-13 - [UPDATE] 탭 순서 변경 및 주접 멘트 동적 생성

**Changed Files**:
- src/app/result/components/TabNavigation.tsx
- src/app/result/components/ResultPageMain.tsx
- src/types/analysis.ts
- src/lib/gemini/prompt-builder.ts
- src/lib/gemini/response-parser.ts
- src/app/result/components/PerfumeNotes.tsx
- src/app/result/components/PerfumeTab.tsx
- src/app/api/analyze/route.ts

**Changes**:
- 탭 순서 변경: "향수 추천" 탭이 먼저 표시되도록 변경
- 기본 활성 탭: 'analysis' → 'perfume'으로 변경
- ScentNote 타입에 fanComment 필드 추가
- UsageGuide 인터페이스 추가 (situation, tips)
- 프롬프트에 noteComments, usageGuide 필드 추가
- response-parser에서 AI 생성 주접 멘트 파싱 및 persona에 연결
- PerfumeNotes에서 AI 생성 주접 멘트 표시 (탑/미들/베이스 노트)
- PerfumeTab에서 동적 사용 가이드 표시

**Reason**:
- 사용자 요청: 향수 추천 탭 먼저 보여주기
- 사용자 요청: 하드코딩된 향 노트 설명 대신 AI 생성 주접 멘트로 대체
- 예시: "스모키블렌드 우드 => 리바이의 카리스마 첫인상을 표현하는 탑노트"

**Impact**:
- 결과 페이지 진입 시 향수 추천 먼저 표시
- 향 노트별로 아이돌/캐릭터와 연결된 주접 멘트 동적 생성
- 사용 가이드도 아이돌 관련 내용으로 동적 생성

---

## 2025-12-12 - [REFACTOR] Input 페이지 컴포넌트 분리 및 이미지 압축 기능 추가

**Changed Files**:
- src/app/input/page.tsx (Before: 845 lines → After: 229 lines) ✅ **73% 감소**
- src/app/input/types.ts (신규 생성 - 54 lines)
- src/app/input/constants.ts (신규 생성 - 22 lines)
- src/app/input/hooks/useInputForm.ts (신규 생성 - 159 lines)
- src/app/input/components/StepHeader.tsx (신규 생성 - 28 lines)
- src/app/input/components/InputField.tsx (신규 생성 - 43 lines)
- src/app/input/components/SelectChip.tsx (신규 생성 - 32 lines)
- src/app/input/components/Step1.tsx (신규 생성 - 77 lines)
- src/app/input/components/Step2.tsx (신규 생성 - 62 lines)
- src/app/input/components/Step3.tsx (신규 생성 - 62 lines)
- src/app/input/components/Step4.tsx (신규 생성 - 62 lines)
- src/app/input/components/Step5.tsx (신규 생성 - 111 lines)
- src/app/input/components/index.ts (신규 생성 - 9 lines)
- src/lib/image/compressor.ts (신규 생성 - 97 lines)

**Changes**:
- 845줄 모놀리식 파일을 13개 모듈로 분리
- 타입/상수/훅/컴포넌트 관심사 분리 적용
- 이미지 압축 유틸리티 추가 (Canvas API 기반)
  - 최대 크기: 800x960px (5:6 비율 유지)
  - JPEG 품질: 80%
  - 업로드 시 자동 압축 적용
- 압축 중 로딩 인디케이터 표시
- useCallback으로 함수 메모이제이션 최적화

**Reason**:
- 코드 분석 결과 input/page.tsx가 845줄로 권장 한계(500줄) 초과
- 이미지 압축 없이 원본 base64 전송으로 성능 저하 가능성

**Impact**:
- 코드 유지보수성 대폭 향상
- 이미지 업로드 성능 개선 (파일 크기 50-80% 감소 예상)
- 각 컴포넌트 독립적 테스트 가능
- 재사용 가능한 UI 컴포넌트 (InputField, SelectChip 등)

**File Structure After Refactoring**:
```
src/app/input/
├── page.tsx          (229 lines - 메인 레이아웃)
├── types.ts          (54 lines - 타입 정의)
├── constants.ts      (22 lines - 상수)
├── hooks/
│   └── useInputForm.ts (159 lines - 폼 로직)
└── components/
    ├── index.ts      (배럴 파일)
    ├── StepHeader.tsx
    ├── InputField.tsx
    ├── SelectChip.tsx
    ├── Step1.tsx ~ Step5.tsx
```

---

## 2025-12-10 21:00 - [ADD] 토스트 컴포넌트 및 향료 데이터 추가

**Changed Files**:
- src/components/ui/toast.tsx (신규 생성)
- src/data/perfumes.ts (신규 생성)
- src/app/layout.tsx
- src/app/input/page.tsx

**Changes**:
- Toast 컴포넌트 생성 (success, error, info 타입 지원)
- ToastProvider를 layout.tsx에 추가
- input 페이지의 alert() → showToast()로 변경
- 30가지 향료 데이터 파일 생성 (idforidol_fixed 프로젝트에서 가져옴)
- 향료별 특성(characteristics), 성격(traits), 키워드, 컬러 등 포함
- 메타데이터 업데이트 (title: "AC'SCENT IDENTITY")

**Reason**:
- 사용자 요청: alert 대신 감각적인 토스트/모달 사용
- 실제 향료 데이터를 프로젝트에 통합

**Impact**:
- UX 개선 (부드러운 토스트 알림)
- 향료 추천 기능 구현을 위한 데이터 준비 완료

---

## 2025-12-10 16:30 - [UPDATE] 스텝 2, 3, 4에 주관식 입력 옵션 추가

**Changed Files**:
- src/app/input/page.tsx (Before: ~540 lines → After: ~760 lines)

**Changes**:
- FormDataType에 customStyle, customPersonality, customCharm 필드 추가
- charmPoints를 string에서 string[]로 변경 (복수 선택 지원)
- Step 2 (스타일 선택): "+ 직접 입력하기" 토글 버튼 추가
- Step 3 (성격 선택): "+ 직접 입력하기" 토글 버튼 추가
- Step 4 (매력 포인트): 객관식 선택 (CHARM_POINTS 배열) + 주관식 입력 옵션 추가
- CHARM_POINTS 상수 추가 ("눈웃음", "목소리", "손", "분위기", "눈빛", "미소", "말투", "제스처")
- toggleCharmPoint 함수 추가
- isStepValid 함수 업데이트 (주관식 입력도 유효성 검사에 포함)

**Reason**:
- 사용자 요청: 스타일, 성격, 매력 포인트에 주관식 응답 옵션 추가
- 매력 포인트를 객관식 + 주관식 병행 형태로 변경

**Impact**:
- 폼 유효성 검사 로직 변경
- 더 다양한 사용자 입력 수집 가능

---

## 2025-12-10 16:00 - [UPDATE] 멀티스텝 입력 폼 구현

**Changed Files**:
- src/app/input/page.tsx (Before: 234 lines → After: ~450 lines)

**Changes**:
- 단일 페이지 폼 → 5단계 멀티스텝 폼으로 변경
- Step 1: 기본 정보 (PIN, 이름, 성별)
- Step 2: 최애 스타일 선택 (복수 선택)
- Step 3: 최애 성격 선택 (복수 선택)
- Step 4: 매력 포인트 자유 작성
- Step 5: 이미지 업로드 (5:6 비율 안내)
- 프로그레스 바, 단계 인디케이터 추가
- 이전/다음 네비게이션 구현

**Reason**:
- 사용자 요청: 상세한 최애 정보 수집을 위한 단계별 입력 플로우

**Impact**:
- 입력 페이지 전체 UX 변경
- 더 풍부한 데이터 수집 가능

---

## 2025-12-10 15:30 - [UPDATE] 홈 페이지 레이아웃 변경

**Changed Files**:
- src/app/page.tsx (Before: 271 lines → After: ~250 lines)

**Changes**:
- 2열 Bento Grid → 1열 세로 나열 레이아웃 변경
- 이미지를 카드 밖으로 분리 (이미지 위에 카드 오버레이)
- 카드 배경 위에 텍스트 배치 구조로 변경

**Reason**:
- 사용자 요청: 세로 레이아웃, 이미지와 카드 분리, 이미지 위 텍스트 오버레이

**Impact**:
- 홈 페이지 UI 전체 변경
- 모바일 스크롤 경험 개선
