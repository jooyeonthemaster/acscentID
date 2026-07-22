# AC'SCENT 공개 사이트 에디토리얼 디자인 시스템

기준: `상품사진/06_상세페이지_목업` (읽기 전용). 이 문서는 공개 사이트(`src/app/[locale]/**`)의
밝은 에디토리얼 커머스 리디자인의 단일 기준이다. `/admin/**`, `/dev/**`, 인쇄/PDF 화면은 제외.

## 1. 토큰 (globals.css `.public-editorial` — [locale] 레이아웃 래퍼에 적용됨)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--ink` | `#191918` | 본문/제목 먹색 |
| `--muted-ink` | `#686863` | 보조 텍스트 |
| `--line` | `#D9D9D3` | 구분선/테두리 |
| `--line-soft` | `#ECECE8` | 옅은 내부 구분선 |
| `--paper` | `#FFFFFF` | 섹션 기본 배경 |
| `--canvas` | `#F6F6F2` | 페이지 배경 |
| `--soft` | `#F0F0EB` | 연회색 면 |
| `--dark-band` | `#181918` | 대비 밴드(제한적 사용) |
| `--dark-line` | `#4B4C49` | 다크 밴드 내부 선 |
| `--dark-muted` | `#ADAEAA` | 다크 밴드 보조 텍스트 |
| `--accent-ai` / `-soft` / `-deep` | `#E9B82E` / `#FFF4C8` / `#9A6800` | AI 이미지 분석 퍼퓸 포인트 |
| `--accent-chem` / `-soft` / `-deep` | `#D65D69` / `#FFF0F1` / `#9F3542` | 레이어링 퍼퓸 포인트 |

- 래퍼 안에서는 shadcn 유틸(`bg-background`, `text-foreground`, `border-border`,
  `text-muted-foreground`)도 밝은 값으로 해석된다.
- 섹션에 `accent-ai` / `accent-chem` 클래스를 얹으면 `--accent-strong/-soft/-deep`이 결정된다.
- Tailwind에서는 `bg-[var(--paper)]` 식 arbitrary value로 사용.

## 2. 원칙

- 기본 배경 `--paper`/`--canvas`, 본문 `--ink`. 다크 밴드는 페이지당 1~2회 제한.
- 상품 사진이 가장 강한 시각 신호. 장식 그라디언트·유리효과·노이즈·블롭·알약 UI 금지.
- 라운드는 3~6px (`rounded-[3px]`~`rounded-[6px]`). 12px+ 라운드, rounded-full 배지 금지
  (원형 아이콘 버튼·점 인디케이터는 예외).
- 그림자 최소화: 헤더/스티키 요소 정도. `shadow-xl`급 금지.
- 테두리는 1px `--line` 기본. 2px는 선택 상태 강조에만.
- 카드 안에 카드 중첩 금지. 페이지 섹션은 전체 너비 밴드(배경색 구분), 내부 콘텐츠는
  `max-w-[1240px] mx-auto`.
- 자간 0 고정(음수 자간 금지) — 래퍼에서 강제됨. 한글은 `break-keep`.
- 폰트: 래퍼 기본값이 Pretendard(`--font-heading-serif` 변수) → Wanted Sans 폴백.
  페이지에서 `font-wanted`를 덧입혀도 무방하나 새 코드는 기본값을 그대로 쓴다.
- 굵기 위계: 제목 800~880(`font-extrabold`/`font-black`), 본문 400~500, 라벨 700.
- 포커스: `.public-editorial`이 `:focus-visible` 3px ink 아웃라인 제공. 제거 금지.
- 모션: framer-motion은 짧은 진입 페이드(0.3~0.6s)만. 레이아웃 이동·스크롤 연출 금지.
  `prefers-reduced-motion` 래퍼에서 자동 무효화.
- 아이콘: lucide-react만 사용.

## 3. 자주 쓰는 매핑 (다크 → 에디토리얼)

| 기존 (다크) | 변경 |
| --- | --- |
| `bg-[#0C0E16]`, `bg-[#08090F]` | `bg-[var(--canvas)]` 또는 `bg-[var(--paper)]` |
| `bg-[#12141D]` (카드/바) | `bg-[var(--paper)]` + `border-[var(--line)]` |
| `bg-[#1B1F2C]`, `bg-[#151823]`, `bg-[#232838]` | `bg-[var(--soft)]` |
| `text-[#E9E2D0]` | `text-[var(--ink)]` |
| `text-[#A69F8D]`, `text-[#8B8578]` | `text-[var(--muted-ink)]` |
| `border-[#262A38]`, `border-2 border-[#...]` | `border border-[var(--line)]` |
| `bg-[#EEB62B]` CTA | `bg-[var(--ink)] text-white` (기본) 또는 상품 페이지 한정 accent |
| 크림 카드 `bg-[#F5EFE2]`, `#EDE5D2`, `#FDFAF1` | `bg-[var(--soft)]` 또는 `bg-[var(--paper)]` |
| `border-[#D8CFBB]`, `#B8880F` | `border-[var(--line)]` |
| `rounded-[12px]`, `rounded-2xl`, `rounded-full`(배지) | `rounded-[4px]`~`rounded-[6px]` |
| `text-[#1A1610]`, `text-[#12141D]` | `text-[var(--ink)]` |
| `text-[#5C564A]` | `text-[var(--muted-ink)]` |
| 골드 상단 보더 `border-t-2 border-[#D4A017]` | `border-t border-[var(--line)]` |

CTA 위계: 1순위 `bg-[var(--ink)] text-white rounded-[5px] font-extrabold`,
2순위 `bg-white border border-[var(--ink)] text-[var(--ink)]`,
3순위 텍스트 링크 + underline.

## 4. 레이아웃

- 데스크톱 콘텐츠 최대 폭 1240px (`max-w-[1240px] px-6`), 모바일은 `px-4~5` 전폭.
- 헤더: sticky, `bg-white/97` + `border-b border-[var(--line)]`, 높이 ~68px.
- 다크 밴드 섹션: `bg-[var(--dark-band)] text-white`, 내부 선 `--dark-line`,
  보조 텍스트 `--dark-muted`, 킥커는 accent 색.
- 섹션 패딩: 데스크톱 py-24~28, 모바일 py-16.
- 섹션 헤딩: 킥커(11px, 900, `--accent-deep`) → h2(28~36px, 880, break-keep) → lead(muted).

## 5. 기능 보존 계약 (요약)

next-intl 5개 로케일 / AuthModal·TransitionContext / 장바구니·체크아웃 /
Supabase 관리자 상품 데이터 / `useProductImages`·`useProductPricing`·`useActiveProducts`·
`useProductDetail` / `CustomDetailRenderer`·`ProgramAdminBridge`·`data-admin-*` /
리뷰·쿠키 동의·Clarity / 상품 비활성 가드·모바일 오버레이 / URL·SEO·JSON-LD.
가격은 DB 우선 + 기존 fallback. 화면용 가짜 가격·가짜 구매 상태 금지.

## 6. 상세페이지 전용 컴포넌트 (`src/components/public/`)

`SectionHeading`, `FeatureStrip`, `ProcessSteps`, `EvidenceMediaGrid`, `MediaCopySection`,
`SizeComparison`(정보성 비교표 — 프로그램 흐름에서 용량 선택으로 위장 금지),
`DeliveryPackageSection`, `FAQSection`, `ClosingCta`.
큐레이션 이미지 manifest: `src/lib/products/detail-images.ts`
(`실제 상품 사진 기반` / `내부 구성 시각화` 출처 배지 포함, 관리자 이미지는 뒤에 중복 제거 병합).
