# CHANGELOG

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
