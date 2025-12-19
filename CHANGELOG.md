# CHANGELOG

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
