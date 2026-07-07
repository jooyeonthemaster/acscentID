# AI 파이프라인 레시피

모범 구현: `src/lib/gemini/saju-prompt-builder.ts` + `saju-response-parser.ts` + `src/app/api/analyze/saju/route.ts` + `src/app/api/saju/chart/route.ts`. 새 프로그램은 이 4파일을 먼저 읽고 병렬 구조로 만든다.

## 아키텍처 원칙

1. **코드가 계산, AI는 해석**: 결정론적 데이터(차트/점수/매칭 후보)는 서버가 계산해 프롬프트에 주입하고, 출력의 해당 필드는 **AI 응답을 버리고 서버 계산값으로 덮어쓴다**. 프롬프트에 "이미 정확히 계산된 결과다. 재계산 금지, 해석만. 서술에 실제 값 인용" 명시.
2. **스냅샷 자립**: 계산 결과는 `<X>AnalysisResult`에 스냅샷으로 포함 → analysis_data에 저장 → 재열람/인쇄/번역이 재계산 없이 동작.
3. **유니버설 코어**: traits(10키, 1-10 정수 — 0은 파서 하드실패)/scentCategories(6키)/dominantColors/personalColor(enum)/analysis/matchingKeywords[5 긍정]/matchingPerfumes[정확히 1, perfumeId는 "AC'SCENT NN", score 0.85-1.0]/comparisonAnalysis(reflectionDetails 4괄호 구조 【】 — ComparisonTab 파싱 호환)/scentRecommendation. 이걸 지키면 `parseGeminiResponse` 재사용 + persona 하이드레이션 + 인쇄 기본분기 + 재고차감이 공짜.

## 라우트 계약 (`/api/analyze/<x>`)

- `requireAuthenticatedUser()` → 401. `consumeDailyAnalysisLimit(productType)` — **serviceMode==='offline'이면 우회** (클라이언트 플래그, 기존 관례). 한도는 Gemini 호출 **전에** 소모됨.
- 모델: `getModelWithConfig({ maxOutputTokens: 12288~16384, temperature: 0.7~0.85 })` — 서사 많으면 크게 (기본 8192는 대형 스키마에서 JSON 중간 절단 → 파싱 실패). `withTimeout` 60s.
- **safetySettings**: 운세/관계 등 민감 톤 콘텐츠는 기본 필터에 걸려 빈 응답이 될 수 있음 — getModelWithConfig의 optional safetySettings 파라미터(saju가 추가함)로 라우트 한정 `BLOCK_ONLY_HIGH` 4종. 기존 호출자 영향 없음.
- **교정 재시도 1회**: 파싱/검증 실패 시 에러 메시지를 프롬프트에 덧붙여 재호출 (feedback-customize 패턴). 파서 에러 메시지는 한국어 서술형으로 (재시도 프롬프트 품질 = 에러 메시지 품질).
- 실패 계약: `{ success: true, data }` | 500 `{ success: false, fallback: mock }` — **mock은 프로그램 전용으로** 작성 (고정 입력을 엔진으로 실계산한 정합 mock — 톤/스키마 불일치 mock은 UI를 깨뜨림).
- 로깅: 요청ID `<X>-${Date.now()}-rand` + 배너 로그 관례 유지 (비용분석 라우트가 endpoint 문자열로 분류함 — cost-analysis 버킷과 이름 맞출 것).

## 경량 계산 API (로딩 오버레이용)

계산형 프로그램은 `/api/<x>/chart` 같은 무인증 순수계산 엔드포인트를 따로 — 제출 직후 오버레이가 실데이터(예: 8글자)를 즉시 표시할 수 있게. 검증은 입력 범위만, Gemini 없음, 한도 없음.

## 프롬프트 빌더 구조 (saju 18섹션 패턴)

역할 정의(세계관+톤 규칙) → targetType 분기(idol/self 톤 견본 원문) → 절대 원칙(재계산 금지 등) → 사용자 입력 직조 → 계산 데이터 JSON 주입 → (조건부) 상대/추가 데이터 → 도메인 지식 표(CONTENT.md에서) → 서사 규칙 → 향 연결 논법(진단→근거→감각 번역→실제 노트) → 목적별 지침(**선택된 것만 포함** — 토큰 절약) → 금지 클리셰 목록 → 후보 향수(코드가 좁힌 우선 후보 + 30종 전체는 **컴팩트 1줄 포맷** — feedback-prompt.ts의 formatPerfumeDatabase 방식, pretty JSON 금지) → 수치/색 규칙 → 분량 규칙(필드별 문장수 명시 — 타입 주석과 일치) → 주석 pseudo-JSON 스키마 → worked example(perfumeId는 플레이스홀더로 — 편향 방지) → 최종 제약(JSON 이스케이프 등).

- ko가 소스. 비ko는 라우트에서 `wrapPromptWithLocale` 적용.
- 폼 enum은 빌더 안에서 한국어 라벨로 변환 (graduation의 toKorean 패턴).

## 파서

- 추출: 균형 괄호 스캐너 (chemistry-response-parser의 extractJsonPayload 패턴 — 미export라 복제).
- 유니버설 코어는 `parseGeminiResponse`에 위임 (persona 하이드레이션 포함), 프로그램 블록은 자체 검증: 필수 필드 비어있음/배열 길이 정확성(예: keyInsights 정확히 3)/enum 드리프트는 **요청값으로 강제 덮어쓰기**/점수 클램프/조건부 블록(모드에 안 맞으면 폐기).

## 로케일/번역 확장 (누락 시 침묵열화)

1. `src/lib/gemini/locale-prompt-wrapper.ts`: 4개 로케일 FINAL CHECK 문자열에 새 서사 필드명 추가 — 안 하면 en/ja/zh/es 출력에 한국어 누출.
2. `src/app/api/translate/image-result/route.ts`: 새 서사 필드를 번역 목록에, **계산 스냅샷·enum·한자 필드는 번역 전 구조분해로 물리 제거 후 재부착** (saju가 sajuChart를 이렇게 보호). 사용자 입력 이름은 protectedNames.

## 도메인 엔진 (계산형일 때, `src/lib/<x>/`)

- 순수 함수, Date.now() 의존 금지(입력 주도), 외부 정본 대비 자체검증 스크립트(`__selftest__.ts`, `npx tsx`로 실행) — 앵커 케이스는 웹 리서치로 실증한 값 사용.
- npm 라이브러리 채택 시: `npm view`로 실재/버전/라이선스 확인 + 채택 전 독립 검증(신생 패키지는 자체 회귀 테스트를 검증용으로 유지). 서버 전용 import 권장(번들). README.md에 관례 결정 기록.
