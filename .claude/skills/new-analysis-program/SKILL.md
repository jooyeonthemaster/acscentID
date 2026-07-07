---
name: new-analysis-program
description: AC'SCENT(PPUDUCKXSPOT) 코드베이스에 새 AI 분석 프로그램(향수 추천 프로그램)을 처음부터 끝까지 추가하는 완전한 개발 프로세스. 사용자가 "새 분석 프로그램", "새 프로그램 추가", "OO 분석 퍼퓸 만들자", "타로/MBTI/별자리 같은 새 컨셉 프로그램" 등을 요청하면 사용. 식별자 설계 → 설계문서 3종 → 기반 통합(60+ 지점) → AI 파이프라인 → 컨셉 UI(입력/로딩/결과/인쇄) → 검증 루프 → 다크 런칭 배포까지 전 단계의 체크리스트·계약·함정을 제공한다. 기존 프로그램(idol-image/chemistry/graduation/saju)의 수정에도 부분 참조 가능.
---

# 새 분석 프로그램 추가 (AC'SCENT)

사주 프로그램(`saju`, 2026-07)을 만들며 검증된 전 과정. **살아있는 모범 구현 = saju** — 모든 단계에서 "saju는 어떻게 했나"를 grep으로 확인하며 진행하라 (이 문서의 파일 경로가 리팩터링으로 어긋났어도 saju 코드가 진실이다).

## 참조 파일 (필요 시점에 로드)

| 파일 | 언제 읽나 |
|---|---|
| [references/integration-checklist.md](references/integration-checklist.md) | Phase A 시작 전 — 통합 지점 전체 목록 (파일·컴파일강제 여부 포함) |
| [references/ai-pipeline.md](references/ai-pipeline.md) | AI 백엔드 설계/구현 전 |
| [references/ui-conventions.md](references/ui-conventions.md) | 입력/로딩/결과/인쇄 UI 구현 전 |
| [references/pitfalls.md](references/pitfalls.md) | **Phase A 전에 1회 통독 필수** + 디버깅 시 |
| [references/launch-verification.md](references/launch-verification.md) | Phase C(검증)·마이그레이션·배포 전 |

## 대원칙

1. **결정론 우선**: 계산 가능한 것(사주팔자, 점수, 차트)은 코드가 계산하고 AI는 해석만 한다. 계산 결과는 `analysis_data`에 스냅샷으로 저장해 DB 재열람·인쇄가 자립하게 한다.
2. **다크 런칭**: `admin_products.is_active=false`로 시드 → 전 과정을 프로덕션에 배포해도 노출 0. 테스트는 `?adminPreview=1`.
3. **식별자는 §0에서 동결하고 절대 흔들지 않는다** (아래 표). 축이 4개라 중간 변경은 재앙이다.
4. **유니버설 코어 유지**: AI 출력에 traits/scentCategories/personalColor/analysis/matchingKeywords/matchingPerfumes[정확히 1]/comparisonAnalysis/scentRecommendation을 반드시 포함 — parseGeminiResponse·인쇄 기본분기·재고차감·관리자 화면이 이것에 의존한다.
5. **컨셉 세계관은 프로그램 안에서만**: 455px 모바일 셸·하단 바 높이·전역 크롬은 유지하되, 프로그램 내부 톤앤매너는 완전히 새로 설계 가능 (사주=먹/한지/금박 참조).

## 워크플로우

### 0. 식별자 동결 (가장 먼저, 문서로)

| 축 | saju 예시 | 규칙 |
|---|---|---|
| program slug (라우팅/admin_products) | `saju` | kebab, 짧게 |
| product_type (DB/커머스/유니온) | `saju_perfume` | snake, DB CHECK에 들어감 |
| input type (`?type=`) | `saju` | slug와 같아도 됨 |
| review program_type | `saju_perfume` | product_type 재사용 권장 |
| 결과 라우팅 | `/result?type=saju` | 전용 결과면 라우터 분기 |
| 가격 | 10ml/50ml 각 48,000 | admin_product_pricing 시드 |
| targetType | `idol`/`self` 재사용 | 최애/나 의미 부여 |

### 1. 설계 문서 3종 (docs/<program>/)

`docs/saju/`를 템플릿으로: **DESIGN.md**(식별자 §0 + 아키텍처 + 플로우 + 통합 요약), **CONTENT.md**(해석 프레임워크 — AI 콘텐츠의 심장: 아키타입/서사 규칙/금지 클리셰/톤 견본), **UI-SPEC.md**(디자인 바이블 — 토큰/컴포넌트/화면별 카피 포함 완전 명세/인쇄 픽셀 좌표). 도메인 지식이 필요하면 리서치 에이전트를 먼저 (라이브러리 실태는 npm view로 실검증시킬 것).

### 2. Phase A — 기반 통합 (UI 없이 컴파일 가능 상태)

integration-checklist.md 로드 → 파일 소유권을 나눠 병렬 가능: ①마이그레이션 파일(작성만, 적용은 Phase D) ②타입/레지스트리/네비/홈 ③관리자 스위프 ④커머스 스위프 → `npx tsc --noEmit` 클린 게이트. 규모가 크면 Workflow 도구로 팬아웃 (사주는 4에이전트+픽서).

### 3. 타입 계약 동결 → 도메인 엔진 → AI 파이프라인

- `src/types/analysis.ts` 끝에 결과 타입(<X>AnalysisResult extends ImageAnalysisResult + 스냅샷 + AnalyzeRequest)을 **직접 동결** — 이후 모든 병렬 작업의 축.
- 계산 엔진이 필요하면 `src/lib/<program>/` + **자체검증 스크립트 필수** (`npx tsx src/lib/<x>/__selftest__.ts`, 외부 정본 대조 앵커 포함).
- ai-pipeline.md 로드 → 프롬프트 빌더/파서/mock/`/api/analyze/<x>`/경량 계산 API/로케일·번역 확장.

### 4. Phase B — UI 팬아웃

ui-conventions.md 로드. 순서: i18n 네임스페이스+공유 컴포넌트 먼저 → 입력 위저드/결과 페이지(섹션 분할)/랜딩/인쇄 병렬 → 통합 픽서(tsc + i18n 키 전수 대조). UI 에이전트는 messages 파일을 직접 만지지 말고 키 요청만 반환하게 할 것 (5로케일 충돌 방지).

### 5. Phase C — 검증 루프

launch-verification.md 로드. `next build` → dev 서버 → 브라우저 QA(모바일 390×844 + PC) → 영역별 픽서 → 재검증, major 0까지 반복. 최장 텍스트 픽스처(`scripts/fixtures/`)로 오버플로 검수. dev 하네스 패턴으로 인쇄/오버레이 격리 검수.

### 6. Phase D — 런칭

launch-verification.md의 마이그레이션 절차(**라이브 제약 사전 조회 필수** — 저장소 마이그레이션과 라이브 DB는 드리프트되어 있다) → DB e2e 스모크 → 커밋/푸시(feature 브랜치) → `vercel deploy --prod`(CLI, 토큰은 로컬 auth 저장소) → 활성화 가이드 전달(관리자에서 is_active 켜기 + 썸네일 업로드 + QR 발급).

## 오케스트레이션 팁

- 병렬 에이전트는 **파일 소유권 완전 분리** + "네 스코프 밖 필요사항은 반환에 기록" 규칙. 공유 파일(messages, PrintableReport, globals.css)은 단일 소유자.
- 각 에이전트 프롬프트에 반드시: DESIGN.md §0 식별자, 해당 참조 파일 경로, "saju 구현을 먼저 읽어라".
- 실제 Gemini 제출 e2e는 로그인 세션이 필요 — QA는 봉인(제출 직전)까지, 최종 1회는 사용자가 실행.
