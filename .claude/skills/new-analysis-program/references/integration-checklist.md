# 통합 지점 전수 체크리스트

새 프로그램 = slug `<slug>`, product_type `<ptype>` 기준. 순서대로 진행하면 의존성이 맞는다.
표기: **[컴파일강제]** = 빠뜨리면 tsc 에러 (안전), **[침묵열화]** = 빠뜨려도 컴파일되지만 런타임에 잘못 동작 (위험 — 반드시 grep 확인).
각 항목은 saju가 이미 등록돼 있으므로 `grep -rn "saju\|saju_perfume" <파일>`로 정확한 위치·패턴을 확인하라.

## 목차
1. DB 마이그레이션 · 2. 코어 타입 · 3. 레지스트리 · 4. 네비/홈/SEO · 5. 랜딩 · 6. 입력 플로우 · 7. QR/오프라인 · 8. AI 백엔드 · 9. 결과 페이지 · 10. 인쇄 보고서 · 11. 커머스 · 12. 관리자 · 13. 알림 · 14. 리뷰 · 15. 마이페이지 · 16. 피드백 루프 · 17. i18n · 18. 잔여 확인 그렙

## 1. DB 마이그레이션 (파일 작성만 — 적용은 launch-verification.md 절차로)

`supabase/migrations/20260707_saju_program.sql`이 템플릿. 내용:
- product_type CHECK 확장 5곳: `analysis_results_product_type_check`, `cart_items_product_type_check`, `order_items_product_type_check`, `qr_codes_product_type_check`, `reviews_program_type_check` **[침묵열화 — DB가 insert 거부]**
- ref check(cart_items/order_items/orders `_product_ref_check`)는 **analysis_id 필수 타입이면 무변경** (기본 분기가 커버). 자체 세션 테이블 타입(chemistry식)이면 확장 필요.
- 시드: `admin_products` (slug, name, **is_active=false**, display_order = 현재 max+1 — 라이브 조회로 결정), `admin_product_pricing` (ptype × 10ml/50ml, label, ON CONFLICT DO NOTHING). admin_products에 description 컬럼 없음 — 넣으면 실패.
- 전부 멱등 (DROP CONSTRAINT IF EXISTS + ADD, ON CONFLICT DO NOTHING, BEGIN/COMMIT).

## 2. 코어 타입

- `src/types/cart.ts`: ProductType 유니온 / PRODUCT_PRICING **[컴파일강제]** / PRODUCT_TYPE_BADGES **[컴파일강제]** (마이페이지 뱃지 색 = 프로그램 아이덴티티 컬러) / getDefaultPrice case / ANALYSIS_OPTIONAL_PRODUCT_TYPES는 analysis_id 불필요 타입만 (ref check와 일치해야 함)
- `src/types/admin.ts`: ProductType 유니온 + PRODUCT_TYPE_LABELS **[컴파일강제]** / getTargetTypeLabel (idol=최애/self=나 기본이 맞으면 무변경)
- `src/types/analysis.ts` 끝: `<X>AnalysisResult extends ImageAnalysisResult` + 계산 스냅샷 타입 + `<X>AnalyzeRequest` + 폼 옵션 상수(SAJU_PURPOSES 패턴) — **이 파일이 전 병렬 작업의 계약. 메인 루프가 직접 작성·동결**

## 3. 레지스트리

- `src/lib/admin/catalog.ts` ADMIN_PROGRAMS: {slug, name, publicHref, inputHref, productTypes, kind:'analysis', registryManaged:true} — /admin/programs·Footer·가격패널이 소비
- `src/lib/programs/program-seo.ts`: ProgramSeoSlug 유니온 + PROGRAM_SEO **5로케일 전부** **[컴파일강제]**
- `src/lib/products/active.ts` PRODUCT_TYPE_TO_SLUG + **중복 사본** `src/app/[locale]/qr/[code]/page.tsx`의 productTypeToSlug **[침묵열화]**
- `src/hooks/useAdminContent.ts` FALLBACK_PRODUCTS (is_active:false로 — DB 실패 폴백이 미공개 프로그램을 노출하면 안 됨) **[침묵열화]**

## 4. 네비 / 홈 / SEO

- `src/components/layout/MobileBottomNav.tsx`: ALL_PROGRAM_LINKS(바텀시트) + is<X>Page + handleProgramCTAClick 분기 + **AuthModal redirectPath 스위치** (역사적으로 누락 잦음 — chemistry가 빠져 있었음) **[침묵열화]**
- `src/components/layout/MobileMenuSheet.tsx` programLinks / `src/components/layout/Footer.tsx` PROGRAM_NAME_KEYS (비ko 로케일용 수동 맵)
- `src/app/[locale]/page.tsx`: ALL_PRODUCTS 홈 카드 + minPrice product_type 매핑 **[침묵열화]**
- `src/app/sitemap.ts` STATIC_PAGES에 `/programs/<slug>` 수동 추가 (자동 아님) **[침묵열화]**

## 5. 랜딩 (`src/app/[locale]/programs/<slug>/`)

- `layout.tsx`: getProgramSeo + getServerOption(ptype,'10ml') JSON-LD + productSchema/breadcrumbSchema (chemistry 패턴 복사)
- `page.tsx`: InactiveProductGuard(slug) > ProgramAdminBridge > UnifiedDetailHero(useProductDetail custom-mode 지원) > 하드코딩 기본 상세 섹션(프로그램 톤) > ProgramReviewSection(programType) > CTA `/input?type=<x>&mode=online` + AuthModal redirect 동일 경로

## 6. 입력 플로우

- `src/app/[locale]/input/page.tsx`: INPUT_TYPE_TO_SLUG **[침묵열화 — 미등록 타입은 idol-image로 조용히 폴백]** + `type==='<x>'` 분기 (InactiveProductGuard로 감싸기)
- 신규 폴더 `src/app/[locale]/input/<x>/`: 페이지 + hooks/use<X>Form.ts + components/(페이즈들 + <X>AnalyzingOverlay) + constants.ts — **모드 계약은 ui-conventions.md 참조 (PIN/AuthModal/QR가드/storageKey/핸드오프)**

## 7. QR / 오프라인

- `src/app/[locale]/qr/[code]/page.tsx`: productTypeToSlug 사본 + 리다이렉트 switch case (`/input?type=<x>&mode=${...}&qr_code=...` — image_analysis 패턴 그대로) **[침묵열화]**
- `src/app/admin/qr/page.tsx` QR_PRODUCT_TYPES (관리자 QR 발급 대상) **[침묵열화]**
- qr_codes CHECK는 §1 마이그레이션에 포함됨

## 8. AI 백엔드 → ai-pipeline.md 상세

파일: `src/lib/gemini/<x>-prompt-builder.ts`, `<x>-response-parser.ts`, `src/app/api/analyze/<x>/route.ts`, (계산형이면) `src/app/api/<x>/chart|compute/route.ts`, `src/lib/gemini/locale-prompt-wrapper.ts` FINAL CHECK 4로케일 문자열 **[침묵열화 — 비ko 출력에 한국어 누출]**, `src/app/api/translate/image-result/route.ts` 번역/보호 필드 목록 **[침묵열화]**

## 9. 결과 페이지

- `src/app/[locale]/result/components/chemistry/ChemistryResultRouter.tsx`: `?type=<x>` 분기 (전용 결과 페이지일 때)
- `src/app/[locale]/result/hooks/useResultData.ts`: is<X>Mode 파생 플래그
- `src/app/[locale]/result/hooks/useAutoSave.ts`: product_type 분기 **[침묵열화 — 기본값 image_analysis로 오저장]**
- 신규 폴더 `src/app/[locale]/result/components/<x>/` (섹션 컴포넌트 + BottomActions 스킨 + sections/types.ts 계약)
- `/api/results`는 product_type 자유 문자열 통과 — 무변경. `/api/results/[id]`도 analysis_data 통짜 반환 — 무변경

## 10. 인쇄 보고서 → ui-conventions.md 상세

- `src/app/admin/analysis/components/PrintableReport.tsx`: `product_type==='<ptype>'` 분기를 **chemistry/traits 폴백 검사보다 앞에** 추가 **[침묵열화 — 빠지면 '데이터 부족' 카드]**
- `public/background/<n>-1.svg`(idol) + `<n>-2.svg`(self): viewBox `0 0 842.25 595.499986`, **장식 전용(라벨은 HTML)** — saju의 3-1/3-2 관례
- 최장 텍스트 픽스처 `scripts/fixtures/<x>-sample.json` (오버플로 검수 자산)

## 11. 커머스

- `src/app/api/cart/route.ts` validateItem: ref 규칙 분기 **[침묵열화]** / `src/lib/supabase/cart.ts` ref 컬럼
- `src/app/api/orders/route.ts`: ref 컬럼 분기 여러 곳 (grep 'chemistry_set'으로 전부 찾기)
- `src/app/[locale]/checkout/` page + OrderSummary.tsx + **MultiItemOrderSummary.tsx** (누락 잦음) 라벨
- `src/lib/fragrance-usage.ts`: ProgramType 유니온 + PROGRAM_TYPE_MAP (+ FRAGRANCE_VOLUME_MAP 비표준 용량 시)
- `src/lib/inventory-deduction.ts`: 유니버설 코어(matchingPerfumes[0]/finalRecipe) 유지 시 무변경 — 확인만
- `src/lib/shipping/`: product_type 열거 없으면 무변경 — 확인만

## 12. 관리자

- `src/app/admin/analysis/page.tsx`: SHORT_PRODUCT_LABELS **[컴파일강제]** + 필터 `<option>` **[침묵열화 — Record 아님]**
- `src/app/api/admin/analysis/route.ts` CSV productLabels / `[id]/page.tsx` 상세 (analysis_data 제네릭 렌더면 무변경)
- `src/app/admin/orders/page.tsx`: PRODUCT_TYPE_BADGE + formatSizeLabel + Excel 내품명 **[침묵열화]** / `src/app/admin/components/OrderTable.tsx` formatSizeLabel **중복 사본**
- `src/app/api/admin/analytics/route.ts` analysisByProduct 초기 키
- datacenter: `/api/admin/datacenter/route.ts` PROGRAM_TYPES+매핑, page.tsx 필터, fragrance-usage/recipe-selection 서브라우트
- `/api/admin/cost-analysis/route.ts`: 분류 버킷 추가 **[침묵열화 — 빠지면 'standard'로 오분류]**
- `src/app/admin/members/` 라벨 맵 / `/api/admin/chat` 스키마 프롬프트의 타입 열거

## 13. 알림

- `src/lib/email/templates.ts` productTypeLabels + `src/lib/notion/admin-notify.ts` productTypeLabel **[침묵열화 — raw slug 노출]**

## 14. 리뷰

- TS 유니온 6곳: `src/lib/supabase/reviews.ts`(~5회) + ProgramReviewSection/ReviewWriteModal/ReviewModal/ReviewList
- `src/app/admin/reviews/page.tsx` PROGRAM_TYPES + `/api/admin/reviews/generate` PROGRAM_LABELS
- DB `reviews_program_type_check`는 §1 — **TS만 고치면 UI 제출을 DB가 거부한다**

## 15. 마이페이지

- 뱃지/카드는 PRODUCT_TYPE_BADGES로 자동. `OrderHistory.tsx` product_type 유니온 확장. 재열람은 §9 결과 페이지가 ?id= 로드를 지원하면 자동

## 16. 피드백 루프 (오프라인)

- 추천이 30종 중 1종이면 FeedbackModal + `/api/feedback/customize` **그대로 재사용** (무변경). 구조가 다르면 chemistry 패턴(전용 모달+customize 라우트) 신설

## 17. i18n (5로케일: ko/en/ja/zh/es)

- `src/messages/*.json`: products.<slug>, programs.subtitle.<slug>, 프로그램 네임스페이스(<x>.input.* / <x>.result.* / <x>.landing.* / <x>.loading.*) — **누락 키는 렌더 시 throw**. ko가 원본, 나머지는 충실 번역. 5파일 키 구조 동일성은 set-diff 스크립트로 검증 (saju Phase B 픽서가 한 방식)

## 18. 잔여 확인 그렙 (Phase A 마지막에 실행)

```bash
# 기존 타입이 열거된 곳 중 새 타입이 빠진 곳 탐지
grep -rn "chemistry_set" src/ --include="*.ts" --include="*.tsx" -l | xargs grep -L "<ptype>"
grep -rn "'graduation'" src/app/admin src/app/api/admin -l | xargs grep -L "<ptype>"
```
결과가 나오면 각 파일을 열어 열거 문맥인지 판단 후 추가.
