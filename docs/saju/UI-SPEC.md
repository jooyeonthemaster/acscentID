# 「자정의 조향소」 UI 실행 명세 (UI-SPEC)

> **이 문서는 DESIGN.md(§0 식별자, §1 컨셉, §2 플로우)를 화면 단위로 완전히 구체화한 실행 명세다.**
> 구현 에이전트는 이 문서에 적힌 값(색/크기/좌표/카피/타이밍)을 **그대로** 사용한다. 창의적 재해석 금지 — 여기 없는 결정이 필요하면 이 문서의 원칙(§1.0 금지 목록, 무게감 규칙)에서 연역한다.
> 코드 관례 참조: `maps/input-flow.md`(입력 셸 계약), `maps/result-report.md`(결과/인쇄 계약).

---

## 0. 전제 계약 (요약 — 위반 금지)

- 모바일 셸: **`max-w-[455px] mx-auto`**, 하단 고정 액션 바 높이/여백 기존 계약 유지(`pb-36` 본문 클리어런스).
- 라우팅/식별자: DESIGN.md §0 그대로 (`?type=saju`, product_type `saju_perfume`, 인쇄 SVG `3-1.svg`/`3-2.svg`).
- 인쇄 캔버스: `842×595px`, SVG viewBox `0 0 842.25 595.499986`, `@page A4 landscape margin 0`.
- 모든 본문 텍스트에 **`break-keep`** 전면 적용(어색한 중간 줄바꿈 금지).
- targetType: `self`(나) / `idol`(최애). 사주 입력 위저드의 **기본값은 `self`** (자기 사주가 1차 시나리오).
- 색상은 컴포넌트에서 **hex 리터럴 arbitrary 클래스**(`bg-[#0C0E16]`)로 사용한다(리포 관례). 아래 §1.1 표가 SSOT.

---

## 1. 디자인 토큰

### 1.0 금지 목록 (전 화면 공통 — 코드리뷰에서 잡는다)

| 금지 | 대체 |
|---|---|
| 보라색 그라데이션(`violet`/`purple` 계열 일체) | 먹색 + 금박 |
| 기존 옐로 키치 문법(`bg-yellow-400`, `border-2 border-black`, `shadow-[4px_4px_0_0_black]`) — **사주 월드 내부에서** | §1.1 팔레트 + 부드러운 심도 그림자 |
| 별/반짝이 아이콘(✨, lucide `Sparkles`, `Star`), 이모지 남발 | 한자 낙관 아이콘, 금 파티클 |
| spring bounce(`type:"spring"` bounce>0), 팝 등장(0.3s 미만 scale-in) | §1.4 이징/무게감 규칙 |
| 부적/무당 클리셰, 점집 키치 | 만세력/한지/낙관/붓획 모티프 |
| 좁은 카드에 텍스트 욱여넣기, `truncate`로 서사 문장 자르기(모바일 화면) | 여백 있는 세로 흐름, 전문 노출 |

### 1.1 팔레트 (CSS 커스텀 프로퍼티 + 사용 규칙)

`src/app/globals.css` 하단에 아래 블록을 **그대로 추가**한다:

```css
/* === SAJU DESIGN TOKENS — 자정의 조향소 === */
:root {
  /* 지면 */
  --saju-ink: #0C0E16;          /* 먹색 자정 — 기본 배경 */
  --saju-ink-soft: #12141D;     /* 융기면(카드/바) on dark */
  --saju-ink-line: #262A38;     /* on-dark 헤어라인 */
  --saju-hanji: #F5EFE2;        /* 한지 크림 — 카드/보고서 지면 */
  --saju-hanji-deep: #EDE5D2;   /* 한지 음영 */
  --saju-hanji-line: #D8CFBB;   /* on-cream 헤어라인 */

  /* 잉크(텍스트) */
  --saju-text-on-dark: #E9E2D0;       /* 본문 on dark (≈15.5:1) */
  --saju-text-on-dark-muted: #A69F8D; /* 보조 on dark (≈7.0:1) */
  --saju-text-on-cream: #1A1610;      /* 먹 — 본문 on cream (≈15.7:1) */
  --saju-text-on-cream-muted: #5C564A;/* 보조 on cream (≈7.3:1) */
  --saju-blue-ink: #2C3E50;           /* 청묵 — 부제 on cream (≈9.6:1) */

  /* 주사(辰砂) */
  --saju-cinnabar: #C0392B;        /* 낙관/강조 면 */
  --saju-cinnabar-deep: #A93226;   /* 텍스트 on cream (≈5.8:1 AA) */
  --saju-cinnabar-bright: #E2604E; /* 텍스트 on dark (≈5.5:1 AA) */

  /* 금박 */
  --saju-gold: #C9A227;        /* 기본 금 — on dark 텍스트 가능 (≈8.0:1) */
  --saju-gold-bright: #E8C766; /* 하이라이트 금 */
  --saju-gold-pale: #F2DA8A;   /* 샤인 정점 */
  --saju-gold-deep: #8A6D1F;   /* 금 음영(장식 전용) */
  --saju-gold-text-cream: #7A5C14; /* on-cream 금 텍스트 대체 (≈5.2:1 AA) */

  /* 오행 — 면(fill)용 원색 */
  --saju-wood: #3E7C4F;
  --saju-fire: #C0392B;
  --saju-earth: #C9A227;
  --saju-metal: #B8B8B0;
  --saju-water: #2C3E60;

  /* 오행 — on-dark 텍스트/라벨 변형 (모두 ≥4.5:1) */
  --saju-wood-text: #6FAE80;
  --saju-fire-text: #E2604E;
  --saju-earth-text: #DDB84A;
  --saju-metal-text: #C9C9C0;
  --saju-water-text: #7C96C4;

  /* 오행 — on-cream 텍스트 변형 (모두 ≥4.5:1) */
  --saju-wood-text-cream: #2F6340;
  --saju-fire-text-cream: #A93226;
  --saju-earth-text-cream: #7A5C14;
  --saju-metal-text-cream: #63635B;
  --saju-water-text-cream: #2C3E60;
}
```

**대비 검증 결과와 사용 규칙 (WCAG AA):**

| 조합 | 대비 | 판정 | 규칙 |
|---|---|---|---|
| `#E9E2D0` on `#0C0E16` | ≈15.5:1 | AAA | 다크 본문 기본 |
| `#A69F8D` on `#0C0E16` | ≈7.0:1 | AA | 다크 보조/캡션 |
| `#C9A227`(금) on `#0C0E16` | ≈8.0:1 | AA | 다크 위 금 텍스트 허용 |
| `#C0392B`(주사) on `#0C0E16` | ≈3.6:1 | **본문 불가** | 대형(24px+/18px bold+) 또는 장식만. 소형 텍스트는 `#E2604E` |
| `#E2604E` on `#0C0E16` | ≈5.5:1 | AA | 다크 위 주사 텍스트 |
| `#1A1610` on `#F5EFE2` | ≈15.7:1 | AAA | 크림 본문 기본 |
| `#A93226` on `#F5EFE2` | ≈5.8:1 | AA | 크림 위 주사 텍스트 |
| `#C9A227`(금) on `#F5EFE2` | ≈2.1:1 | **텍스트 절대 불가** | 크림 위 금은 괘선/장식만. 텍스트는 `#7A5C14` |
| `#2C3E50`(청묵) on `#F5EFE2` | ≈9.6:1 | AAA | 크림 부제/라벨 |

- **금박 그라데이션 스탑(SSOT)**: `#8A6D1F 0% → #C9A227 22% → #F2DA8A 50% → #E8C766 62% → #C9A227 80% → #8A6D1F 100%` (105deg). 텍스트 클립·괘선·실(thread) 공용.
- 오행 원색은 **면(fill)·도트·패 액센트 전용**. 텍스트로 쓸 때는 반드시 `-text`(-cream) 변형.

### 1.2 타이포그래피

**폰트 로딩** — `src/app/layout.tsx`에 추가(전역 로드, 사주 외 화면 영향 없음 — variable만 추가):

```tsx
import { Noto_Serif_KR } from "next/font/google";
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],           // 한글 서브셋은 next/font가 unicode-range 분할로 자동 처리
  variable: "--font-noto-serif-kr",
  weight: ["400", "600", "900"],
  display: "swap",
});
// body className에 ${notoSerifKR.variable} 추가
```

`globals.css`의 `@theme inline`에 한 줄 추가 → Tailwind v4가 `font-serif-kr` 유틸리티 생성:

```css
--font-serif-kr: var(--font-noto-serif-kr), "Noto Serif KR", serif;
```

**폰트 배분 규칙:**
- **Noto Serif KR** = 사주 월드의 모든 한글/한자 (입력 위저드·로딩·결과·인쇄·랜딩 하드코딩 섹션).
- **Outfit(기존 `font-sans`)** = 숫자·라틴 표기(가격 `₩48,000`, `SCENT PROFILE`, 시간 `23:00`), 전역 크롬(Header, AuthModal, 토스트, 하단 바의 기존 공용 컴포넌트 내부). 사주 월드에서 숫자만 있는 슬롯은 Outfit 허용, 한글 혼재 시 Serif KR.
- 인쇄 보고서는 **Noto Serif KR 단일 폰트**(좌표 안정성 — §7).

**타입 스케일 (455px 셸 기준, `클래스` 표기):**

| 토큰 | 스펙 | 용도 |
|---|---|---|
| `display-hanja` | 120px / 1.0 / 900 / tracking 0 | 일간 대형 한자(二章), 로딩 대형 글자 |
| `display` | 34px / 1.35 / 900 / -0.01em | 장(章) 타이틀, 결과 헤드라인 |
| `title` | 24px / 1.45 / 600 | 위저드 헤드라인, 향수명 |
| `heading` | 19px / 1.5 / 600 | 섹션 소제목 |
| `subheading` | 16px / 1.6 / 600 | 카드 제목 |
| `body` | 15px / **1.85** / 400 | 서사 본문 (행간 넉넉히 — 사주 텍스트는 길다) |
| `body-strong` | 15px / 1.85 / 600 | 본문 강조 |
| `caption` | 12px / 1.6 / 400 | 보조 설명 |
| `label` | 11px / 1.4 / 600 / **tracking 0.14em** | 폼 라벨, 소제목 킥커 |
| `ornament` | 13px / 1.2 / 900 / **tracking 0.35em** | 한자 장식 라벨(四柱命式 등) |

**자간(한자) 규칙:**
- 대형 단독 한자(패 글리프, display-hanja): tracking `0`.
- 한자 병기 인라인(`병화(丙火)`): 추가 자간 없음 — 본문 그대로.
- 한자 연속 장식 라벨(`四柱命式`, `一章`): tracking `0.3em~0.35em`.
- 세로쓰기(VerticalLabel): `letter-spacing: 0.35em`(§2.6).
- 모든 문단: `word-break: keep-all`(`break-keep`).

### 1.3 텍스처 / 오너먼트 시스템 (외부 에셋 0 — 전부 코드)

`globals.css`에 추가하는 유틸리티(정확한 값):

```css
/* 한지 질감 — 크림 지면 위. 2겹 turbulence(섬유+반점) */
.saju-hanji {
  position: relative;
  background-color: var(--saju-hanji);
}
.saju-hanji::before {
  content: "";
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cfilter id='h'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012 0.28' numOctaves='2' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23h)' opacity='0.5'/%3E%3C/svg%3E");
  opacity: 0.05;
  mix-blend-mode: multiply;
  pointer-events: none;
  border-radius: inherit;
}
/* baseFrequency 0.012 0.28 = 가로로 긴 섬유결. 반점은 아래 레이어 */
.saju-hanji::after {
  content: "";
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='11' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23s)' opacity='0.35'/%3E%3C/svg%3E");
  opacity: 0.04;
  mix-blend-mode: multiply;
  pointer-events: none;
  border-radius: inherit;
}

/* 먹지 질감 — 다크 배경 위 은은한 입자 (기존 .bg-noise의 정적·저비용 버전) */
.saju-ink-grain {
  position: relative;
}
.saju-ink-grain::before {
  content: "";
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E");
  opacity: 0.05;
  mix-blend-mode: overlay;
  pointer-events: none;
}
/* 주의: 기존 .bg-noise(0.2s 무한 이동)는 사주 월드에서 쓰지 않는다 — 정적 그레인만 */

/* 금박 샤인 텍스트 */
.saju-gold-foil {
  background-image: linear-gradient(105deg,
    #8A6D1F 0%, #C9A227 22%, #F2DA8A 50%, #E8C766 62%, #C9A227 80%, #8A6D1F 100%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: saju-foil-slide 7s ease-in-out infinite;
}
@keyframes saju-foil-slide {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .saju-gold-foil { animation: none; background-position: 30% 50%; }
}

/* 금 파티클 부유 (부모: position relative + overflow hidden) */
@keyframes saju-dust-rise {
  0%   { transform: translateY(12px); opacity: 0; }
  12%  { opacity: var(--dust-peak, 0.55); }
  85%  { opacity: var(--dust-peak, 0.55); }
  100% { transform: translateY(-72px); opacity: 0; }
}
@keyframes saju-dust-sway {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(var(--dust-sway, 10px)); }
}
```

**오너먼트 사양:**
- **한지 질감**: `.saju-hanji` — 크림 카드/보고서 지면 공용. 두 pseudo-element 겹침으로 섬유결+반점. 외부 이미지 금지.
- **금박 샤인**: `.saju-gold-foil` — 텍스트 전용. 괘선/실은 동일 그라데이션을 `background`로 직접 사용(클립 없이).
- **붓획 디바이더**: SVG 컴포넌트(§2.4) — CSS로는 불가능한 갈필(끝이 갈라지는 획)을 path로 그린다.
- **낙관(도장)**: 컴포넌트(§2.3). 프로그램 로고 낙관 글자는 **「命香」**(2자 세로).

### 1.4 모션 문법

**이징 토큰 (framer-motion `ease` 배열 / CSS `cubic-bezier`):**

| 토큰 | 값 | 용도 |
|---|---|---|
| `easeInk` | `[0.22, 1, 0.36, 1]` | 기본 등장/이동 (기존 리포 이징과 동일 — 유지) |
| `easeBrush` | `[0.65, 0, 0.35, 1]` | 획 드로잉, 족자 말림, 스크롤 연동 보간 |
| `easeSettle` | `[0.16, 1, 0.3, 1]` | 무거운 것이 내려앉음(패 착지, 도장 찍힘) |

**듀레이션 스케일:** `fast 0.3s`(미세 피드백: 탭 하이라이트, 칩 선택) / `base 0.8s`(요소 등장) / `slow 1.4s`(패 플립, 카드 전환) / `ceremony 2.4s`(점화, 리빌, 족자).

**무게감(무게 있는 등장) 규칙 — 전 화면 공통:**
1. 등장은 항상 `opacity 0→1` + `y 16~24px→0`, duration ≥ 0.8s, `easeInk`. 스태거 0.12~0.18s.
2. `scale` 등장은 도장 찍힘(1.15→1.0, `easeSettle`)과 점화(1→1.12→1)만 허용. **overshoot/bounce 금지.**
3. 무한 루프 앰비언트(파티클, 샤인, 고리 회전)는 **CSS 애니메이션**, 오케스트레이션(순차 플립, 스크롤 연동, 점화 시퀀스)은 **framer-motion**. (§2.8)
4. hover/tap 피드백: `whileTap={{ scale: 0.98 }}` 까지만. `whileHover` scale 금지(모바일 우선).

**금 파티클 시스템 사양(GoldDust — §2.7):** 기본 18개(로딩 오버레이 24개 상한), 크기 1.5~3.5px, 상승 드리프트 60~90px에 9~16초, 좌우 사행 ±8~14px, opacity 피크 0.25~0.65, 전부 CSS(`saju-dust-rise` + 내부 span `saju-dust-sway`), `prefers-reduced-motion`에서 opacity 0.2 정적 표시.

**reduced-motion 전역 규칙:** `useReducedMotion()`(framer-motion) 훅으로 분기 — 스크롤 연동 변환은 정적 최종값, 플립은 즉시 공개, 파티클은 정지. (§5.10)

---
## 2. 공통 컴포넌트 명세

**폴더 결정:** 입력/결과/인쇄가 공유하는 사주 프리미티브는 **`src/components/saju/`** 에 둔다
(`GanjiTile.tsx`, `ElementRing.tsx`, `SealStamp.tsx`, `BrushDivider.tsx`, `HanjiCard.tsx`, `VerticalLabel.tsx`, `ProgressThread.tsx`, `GoldDust.tsx`, `SajuBottle.tsx`, `index.ts`).
입력 위저드 전용 스텝 컴포넌트는 `src/app/[locale]/input/saju/components/`, 결과 섹션은 `src/app/[locale]/result/components/saju/`.
공통 상수(오행 색 매핑, 12지시 테이블, 이징)는 **`src/components/saju/saju-ui-constants.ts`** 단일 파일.

```ts
// saju-ui-constants.ts (발췌 — 정확히 이 값)
export const SAJU_EASE_INK = [0.22, 1, 0.36, 1] as const
export const SAJU_EASE_BRUSH = [0.65, 0, 0.35, 1] as const
export const SAJU_EASE_SETTLE = [0.16, 1, 0.3, 1] as const

export type SajuElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
export const ELEMENT_META: Record<SajuElement, {
  hanja: string; ko: string; fill: string; textOnDark: string; textOnCream: string
}> = {
  wood:  { hanja: '木', ko: '목', fill: '#3E7C4F', textOnDark: '#6FAE80', textOnCream: '#2F6340' },
  fire:  { hanja: '火', ko: '화', fill: '#C0392B', textOnDark: '#E2604E', textOnCream: '#A93226' },
  earth: { hanja: '土', ko: '토', fill: '#C9A227', textOnDark: '#DDB84A', textOnCream: '#7A5C14' },
  metal: { hanja: '金', ko: '금', fill: '#B8B8B0', textOnDark: '#C9C9C0', textOnCream: '#63635B' },
  water: { hanja: '水', ko: '수', fill: '#2C3E60', textOnDark: '#7C96C4', textOnCream: '#2C3E60' },
}

export const HOUR_BRANCHES = [
  { index: 0,  ji: '자', hanja: '子', animal: '쥐',     range: '23:00–00:59' },
  { index: 1,  ji: '축', hanja: '丑', animal: '소',     range: '01:00–02:59' },
  { index: 2,  ji: '인', hanja: '寅', animal: '호랑이', range: '03:00–04:59' },
  { index: 3,  ji: '묘', hanja: '卯', animal: '토끼',   range: '05:00–06:59' },
  { index: 4,  ji: '진', hanja: '辰', animal: '용',     range: '07:00–08:59' },
  { index: 5,  ji: '사', hanja: '巳', animal: '뱀',     range: '09:00–10:59' },
  { index: 6,  ji: '오', hanja: '午', animal: '말',     range: '11:00–12:59' },
  { index: 7,  ji: '미', hanja: '未', animal: '양',     range: '13:00–14:59' },
  { index: 8,  ji: '신', hanja: '申', animal: '원숭이', range: '15:00–16:59' },
  { index: 9,  ji: '유', hanja: '酉', animal: '닭',     range: '17:00–18:59' },
  { index: 10, ji: '술', hanja: '戌', animal: '개',     range: '19:00–20:59' },
  { index: 11, ji: '해', hanja: '亥', animal: '돼지',   range: '21:00–22:59' },
] as const
```

### 2.1 GanjiTile — 팔자 글자 패

```tsx
interface GanjiTileProps {
  hanja: string            // '丙'
  reading: string          // '병화' | '오' (한글 독음)
  element: SajuElement
  size?: 'sm' | 'md' | 'lg'          // 기본 'md'
  state?: 'hidden' | 'revealed' | 'highlighted' | 'unknown'  // 기본 'revealed'
  flipDelay?: number       // 초 단위 스태거 지연
  onDark?: boolean         // 기본 true (다크 배경 위)
}
```

- **치수(1 : 1.4 패 비율):** `sm` 40×56 / `md` 56×78 / `lg` 72×101 (px). 인쇄용은 §7에서 별도 고정 좌표.
- **앞면(face):** `.saju-hanji` 크림 지면, `border: 1px solid #D8CFBB`, `border-radius: 6px`(패는 각이 살아 있어야 함 — 그 이상 둥글리지 않는다), 상단 **엘리먼트 액센트 바 3px**(`ELEMENT_META[element].fill`, 좌우 꽉 참, radius 상단만). 중앙 한자: Noto Serif KR 900, 크기 = 타일 폭의 60%(md=34px), 색 `#1A1610`. 하단 독음: 10px(sm은 9px)/400/`#5C564A`, 한자 아래 2px.
- **뒷면(back):** `#14161F` 지면, 1px `#262A38` 보더, 중앙에 금색(#C9A227, opacity 0.5) 만세력 미니 격자 문양(SVG: 3×4 셀 격자 + 중앙 원, stroke 0.75).
- **state:**
  - `hidden`: 뒷면 표시(rotateY 180 상태).
  - `revealed`: 앞면.
  - `highlighted`(일주 강조): 앞면 + `box-shadow: 0 0 0 1.5px #C9A227, 0 0 18px rgba(201,162,39,0.35)` + 좌상단 4px 금 코너 브래킷 2개(SVG).
  - `unknown`(시간모름): 앞면이되 한자 자리에 `時` 워터마크(opacity 0.15, 40px), 독음 자리 `미지(未知)` 10px `#A69F8D`, 액센트 바 없음(`#8B8578` 회색 바).
- **3D 플립 애니메이션:** 컨테이너 `perspective: 800px`, 내부 래퍼 `transform-style: preserve-3d`, 양면 `backface-visibility: hidden`(뒷면 `rotateY(180deg)` 고정). 공개 시 framer-motion으로 래퍼 `rotateY: 180 → 0`, `duration: 0.9`, `ease: SAJU_EASE_INK`, `delay: flipDelay`. 착지 직후 `scale: [1.04, 1]` 0.25s `easeSettle`(플립 트랜지션에 keyframes로 합침). **스태거 순서(고정): 년간→년지→월간→월지→일간→일지→시간→시지, 간격 0.15s.**
- 접근성: 루트에 `role="img"` + `aria-label={`${reading} ${hanja}`}`.

### 2.2 ElementRing — 오행 상생 고리

```tsx
interface ElementRingProps {
  counts: Record<SajuElement, number>   // elementCount
  yongsin?: SajuElement                 // 용신 (있으면 점화 대상)
  ignite?: boolean                      // true가 되는 순간 점화 시퀀스 재생
  size?: number                         // 렌더 px (기본 300)
  showCounts?: boolean                  // 노드 옆 개수 뱃지
}
```

- **SVG 구조:** `viewBox="0 0 300 300"`. 중심 (150,150), 노드 5개는 반지름 **110** 원주 위, **木이 12시 방향**, 시계방향으로 木→火→土→金→水 (상생 순).
  - `<g class="ring-arcs">`: 인접 노드를 잇는 원호 5개 — `stroke: url(#goldGrad)`(§1.1 금 그라데이션), `stroke-width: 1.5`, 끝에 화살촉(6px path, 상생 방향). 노드 반경 32 바깥에서 시작/끝.
  - `<g class="ring-nodes">`: 각 노드 = 원 `r=28`, `fill: ELEMENT_META.fill`, 내부 한자 26px/900/`#F5EFE2`(金 노드만 글자 `#1A1610` — 밝은 면), 바깥 링 `r=32, stroke: rgba(233,226,208,0.18), width:1`.
  - `showCounts`: 노드 우하단에 14px 원형 뱃지(`#12141D` 면, 금 텍스트, 개수 숫자).
- **상태 렌더:**
  - **과다**(counts ≥ 3): 노드 바깥 글로우 `filter: drop-shadow(0 0 10px {fill}66)` + 외곽 링 두 겹.
  - **정상**(1~2): 기본.
  - **부족/공망**(0): fill을 `#1E2129`로, 한자 opacity 0.35, 외곽 링 `stroke-dasharray: 3 4`. **"꺼진 고리"** — 五章 점화의 복선이므로 명확히 어둡게.
- **회전 애니메이션(앰비언트, CSS):** `.ring-arcs`만 `rotate 120s linear infinite`(중심 기준). 노드는 회전하지 않는다(글자 정립 유지). reduced-motion 시 정지.
- **점화(點火) 시퀀스(`ignite=true` 시, framer-motion, 총 2.4s):**
  1. 0–1.2s: 용신 노드로 들어오는 원호가 `stroke-dashoffset` 드로잉으로 다시 그어짐(`pathLength` 0→1, easeBrush) + 금색 4px 유성 헤드가 원호를 따라 이동.
  2. 1.2–1.8s: 용신 노드 fill이 `#1E2129`→`ELEMENT_META.fill` 크로스페이드, `scale: [1, 1.12, 1]`(easeSettle), 글로우 `0 0 0px`→`0 0 24px {fill}AA`.
  3. 1.8–2.4s: 한자 opacity 0.35→1, 노드 위 8px 지점에서 금 파티클 6개 짧게 상승(0.6s).
- 접근성: `<title>` = "오행 분포: 목 N, 화 N, …" / 점화 시 `aria-live="polite"`로 "용신 {오행} 점화" 텍스트 갱신.

### 2.3 SealStamp — 낙관(도장)

```tsx
interface SealStampProps {
  chars: string            // 1~4 한자 ('命' | '合' | '命香' | '用神')
  size?: 'sm' | 'md' | 'lg' | 'xl'   // 36 | 48 | 64 | 96 px
  tone?: 'cinnabar' | 'ink' | 'outline'  // 기본 cinnabar
  stamped?: boolean        // true 전환 시 찍힘 애니메이션
  rotate?: number          // 기본 -3 (deg)
}
```

- **형태:** 정사각, `border-radius: 18%`, 기본 `rotate(-3deg)`. 
  - `cinnabar`: `background: #B03325`(주사 도장밥 — cinnabar보다 한 단계 깊음) + 인주 질감(`radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), transparent 60%)` + `inset 0 0 6px rgba(0,0,0,0.25)`), 글자 `#F5EFE2`.
  - `ink`: `background: #1A1610`, 글자 `#F5EFE2`.
  - `outline`: 투명 면 + `border: 1.5px solid currentColor`, 글자 currentColor (비활성 목적 아이콘 용).
- **글자 배치:** 1~2자는 세로 스택 중앙(2자 시 각 폭 52%), 3~4자는 2×2 격자(우상→좌하 전통 독법 순서로 배치: 1→우상, 2→우하, 3→좌상, 4→좌하). Noto Serif KR 900, 글자 크기 = size의 44%(1자는 56%).
- **모서리 마모:** 좌상단 모서리에 `clip-path` 미세 결손 대신 — 구현 단순화를 위해 `::after`로 4개 변에 1px 투명 노치를 랜덤처럼 보이게 고정 배치(x: 20%, 65% 지점). 과하면 뺀다(옵션 `worn` 기본 false).
- **찍힘 애니메이션(`stamped` false→true):** `scale: 1.15→1.0` + `opacity: 0→1`, 0.45s `easeSettle`, 착지 프레임에 도장 밑 번짐(圓形 `box-shadow: 0 0 12px rgba(176,51,37,0.4)` 0.3s 페이드인). 사운드 없음, 진동 없음.

### 2.4 BrushDivider — 붓획 구분선

```tsx
interface BrushDividerProps {
  width?: number          // 120~280, 기본 200
  label?: string          // 중앙 한자 라벨 (예: '一章') — 있으면 획이 좌우로 갈라짐
  tone?: 'gold' | 'ink-on-cream'   // 기본 gold(다크 위)
  draw?: boolean          // 뷰포트 진입 시 획 드로잉 재생 (기본 true)
}
```

- **SVG:** `viewBox="0 0 200 10"` (width로 스케일). 갈필 획 path(SSOT — 이 path를 그대로 사용):
  `M2,6 C30,3.5 60,4.5 100,4 C140,3.5 172,5.5 198,4.6` — `stroke-width`가 아니라 **fill로 그린 가변 굵기 획**: 위 path를 중심선으로 두께 0.8→3.2→1.2px 변주한 폐곡선 path를 굽는다(에이전트는 위 중심선 기준으로 상하 오프셋 path를 작성; 시작·끝은 뾰족하게, 65% 지점에 미세 갈라짐 틈 1개).
- tone `gold`: `fill: url(#goldGrad)` + opacity 0.85 / `ink-on-cream`: `fill: #1A1610` opacity 0.8.
- **드로잉 애니메이션:** `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`, 1.2s `easeBrush`, whileInView once. (fill 획이므로 pathLength 대신 클립 와이프.)
- `label` 있으면: 획을 좌우 2분할(각 width 40%), 중앙에 `ornament` 스타일 한자(13px/900/tracking 0.35em/금 또는 먹).

### 2.5 HanjiCard — 한지 카드

```tsx
interface HanjiCardProps {
  children: ReactNode
  verticalLabel?: string   // 우측 변 세로 라벨
  seal?: string            // 우하단 낙관 한자 (sm 사이즈)
  padding?: 'md' | 'lg'    // 20px | 28px
  className?: string
}
```

- 다크 배경 위의 크림 지면: `.saju-hanji` + `border-radius: 8px` + `border: 1px solid #D8CFBB` + **부드러운 심도 그림자** `box-shadow: 0 16px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)`. (하드 오프셋 그림자 금지 — §1.0.)
- 지면 상단에 2px 금 괘선(장식): `border-top: 2px solid transparent; border-image: linear-gradient(금 그라데이션) 1` 대신 **내부 첫 요소로 `<div class="h-[2px] w-12" style="background:금그라데이션">`** (border-image는 radius와 충돌).
- `verticalLabel`: 카드 우측 padding 영역에 VerticalLabel(§2.6) absolute 배치(right 12px, top 20px).
- `seal`: 우하단(right 16, bottom 14)에 SealStamp sm.
- 텍스트 색: 내부 기본 `text-[#1A1610]`, 보조 `text-[#5C564A]`.

### 2.6 VerticalLabel — 세로쓰기 라벨

```tsx
interface VerticalLabelProps { text: string; tone?: 'gold' | 'muted' | 'ink'; size?: number /* 기본 11 */ }
```

- `writing-mode: vertical-rl; text-orientation: upright; letter-spacing: 0.35em;` Noto Serif KR 600.
- tone: `gold` → `#C9A227`(다크 위) / `muted` → `#A69F8D` / `ink` → `#5C564A`(크림 위).
- 용도: 장 번호(一章), 카드 옆 주석(命式單子), 인쇄 보고서 패널 라벨.

### 2.7 GoldDust — 금 파티클

```tsx
interface GoldDustProps { count?: number /* 기본 18, 최대 24 */; className?: string }
```

- 부모를 덮는 `absolute inset-0 overflow-hidden pointer-events-none` 컨테이너. 파티클 = `<span>` 2겹(외부: rise, 내부: sway — §1.3 keyframes).
- 각 파티클 인라인 스타일은 **인덱스 기반 결정적 의사난수**(seededRandom(i) — PrintableReport의 기법 재사용)로: `left: 4~96%`, `bottom: -5~30%`, `width/height: 1.5~3.5px`, `animation-duration: 9~16s`, `animation-delay: 0~8s`, `--dust-peak: 0.25~0.65`, `--dust-sway: ±8~14px`. `background: radial-gradient(circle, #F2DA8A 0%, #C9A227 60%, transparent 100%)`.
- 렌더 중 hydration 불일치 방지: 난수는 시드 고정이므로 SSR/CSR 동일.

### 2.8 ProgressThread — 진행 표시 (실과 매듭)

**결정: 위저드 진행 표시는 "붉은 실이 아니라 금실". 실(絲)이 왼쪽에서 풀려나오고, 단계마다 매듭(結)이 지어진다.**

```tsx
interface ProgressThreadProps {
  steps: { key: string; hanja: string }[]  // 표시할 단계 (궁합 시 6개, 아니면 5개)
  currentIndex: number
}
```

- 높이 28px 영역. 수평 실: `height: 1.5px`, 금 그라데이션 background. 실은 `scaleX`로 현재 매듭까지 채워짐(`transform-origin: left`, 0.8s easeInk) — 미도달 구간은 `#262A38` 1px.
- 매듭: 단계 지점마다 등간격.
  - 완료: 8px 원, `#C9A227` 채움.
  - **현재: 11px 주사(#C0392B) 원 + 그 위 한자 라벨**(해당 step.hanja, 11px/600/`#E9E2D0`, 매듭 위 6px) + 느린 펄스(box-shadow 0 0 0 0 → 0 0 0 5px rgba(192,57,43,0.25), 2.4s 무한, reduced-motion 시 정지).
  - 미래: 6px 링(테두리 1px `#262A38`, 투명 면).
- 위치: 위저드 Header 바로 아래, `px-6`, sticky 아님(콘텐츠와 함께 스크롤).

### 2.9 SajuBottle — 코드로 그린 향수병 (終章·리빌 전용)

**확인 결과: persona 데이터에 병 이미지는 없다**(`persona.primaryColor/secondaryColor` + 노트 텍스트만 — `maps/result-report.md` §2). 따라서 병은 **순수 SVG로 그린다.**

```tsx
interface SajuBottleProps {
  liquidColors: [string, string]   // [persona.primaryColor, persona.secondaryColor]
  element: SajuElement             // 용신 — 병 어깨의 오행 인장 색
  phase: 'outline' | 'filling' | 'complete'  // 리빌 단계 (§5.7)
}
```

- **SVG 구조** `viewBox="0 0 200 320"`:
  - 병신(body): 어깨가 둥근 직사각 플라콘 — `M60,110 Q60,96 74,92 L86,88 L86,64 L114,64 L114,88 L126,92 Q140,96 140,110 L140,272 Q140,288 124,288 L76,288 Q60,288 60,272 Z`. `stroke: url(#goldGrad) 1.5px`, `fill: rgba(245,239,226,0.04)`.
  - 캡: `x=82,y=28,w=36,h=36, rx=4`, fill 금 그라데이션(수직), 상단 하이라이트 라인.
  - 목 링: y=60에 금 헤어라인.
  - **액체:** 병신 내부 clip 영역에 `linear-gradient(180deg, {liquidColors[0]} 0%, {liquidColors[1]} 100%)` rect, opacity 0.85. 표면(液面)에 2px 밝은 라인 + 미세 사인파 흔들림(CSS, 3s, ±1px).
  - **오행 인장:** 병 어깨 중앙(y≈118)에 SealStamp sm 상당의 SVG 각인(rounded-square 24px, `ELEMENT_META[element].fill`, 한자 白).
  - 라벨지: 병 중앙(y=150~230)에 크림 라벨 rect(rx 3, `#F5EFE2`, opacity 0.96) — **향수명 텍스트는 SVG 밖 HTML로 겹쳐 올린다**(폰트/줄바꿈 제어).
- `phase` 연출은 §5.7에서 오케스트레이션(outline: 획 드로잉 → filling: 액체 상승 → complete: 정적+파티클).

### 2.10 framer-motion vs CSS 배분표 (최종)

| 대상 | 기술 |
|---|---|
| 패 플립, 점화, 족자 말림, 도장 찍힘, 스크롤 연동(useScroll/useTransform), 스텝 전환, 리빌 시퀀스 | framer-motion |
| 금 파티클, 금박 샤인, 고리 회전, 매듭 펄스, 액면 흔들림, 한지/먹 그레인 | CSS |
| 뷰포트 진입 트리거 | framer-motion `whileInView` + `viewport={{ once: true, margin: "-15% 0px" }}` (IntersectionObserver 직접 사용 금지 — 일원화) |

---
## 3. 입력 위저드 — 화면별 완전 명세 (`/input?type=saju`)

### 3.0 셸/페이즈 머신 (chemistry 패턴)

- 폴더: `src/app/[locale]/input/saju/` — `SajuInputPage.tsx`, `hooks/useSajuForm.ts`, `components/`(GatePhase, PurposePhase, BirthPhase, PartnerPhase, WishPhase, SealPhase, SajuAnalyzingOverlay, index.ts), `constants.ts`.
- 페이즈: `type SajuPhase = 'gate' | 'purpose' | 'birth' | 'partner' | 'wish' | 'seal'`. `partner`는 `purpose === 'compatibility'`일 때만 시퀀스에 포함.
- **진행률(ProgressThread `currentIndex` + 상단 % 텍스트 없음 — 실이 곧 진행률):**
  - 일반(5단계): gate 0, purpose 1, birth 2, wish 3, seal 4 / steps hanja: `入 · 望 · 時 · 願 · 封`
  - 궁합(6단계): … birth 2, partner 3, wish 4, seal 5 / steps hanja: `入 · 望 · 時 · 對 · 願 · 封`
- **배경:** `bg-[#0C0E16]` + `.saju-ink-grain` + GoldDust(count 12) 고정 레이어. 기존 `forest_bg.png` **사용하지 않는다.** 콘텐츠는 `max-w-[455px] mx-auto px-6 pb-40`.
- **Header:** 기존 공용 `<Header showBack backHref="back" compact />` 유지(전역 크롬 — 재스킨 금지). Header 아래에 프로그램 명패: 중앙 정렬, SealStamp sm(`命香`) + `자정의 조향소` label 스타일(11px/600/tracking 0.14em/`#A69F8D`) — 모든 페이즈 공통.
- **스텝 전환(한지 넘김):** 나가는 페이즈 `opacity 1→0, y 0→-12`, 0.35s / 들어오는 페이즈 `opacity 0→1, y 24→0`, 0.8s `easeInk`, 0.15s 지연. `AnimatePresence mode="wait"`.
- **하단 내비게이션 바:** 기존 NavigationButtons 계약(고정 하단, 이전/다음)을 사주 스킨으로 자체 구현: 바 `fixed bottom-0 max-w-[455px] w-full bg-[#12141D]/95 backdrop-blur border-t border-[#262A38] px-6 py-4 safe-area-bottom`. 이전 = 텍스트 버튼(`#A69F8D`, "이전"), 다음 = 주 버튼: `h-[52px] rounded-lg bg-[#C0392B] text-[#F5EFE2] text-[16px] font-semibold font-serif-kr` + 활성 시 미세 금 테두리(`ring-1 ring-[#C9A227]/40`). 비활성: `bg-[#1E2129] text-[#5C564A]` + `disabled`. 라벨은 페이즈별(§3.1~3.6 카피).
- **모드 계약(전부 이행):** `mode`/`service_mode`/`qr_code` 파싱은 `useInputForm.ts:74-77`의 isOnline/isOffline 식을 **그대로 복사**(chemistry의 단순식 말고). 오프라인 PIN(§3.1), 비회원 AuthModal(`closeable={false}`, `redirectPath`에 전체 쿼리 유지), QR 뒤로가기 루프 가드(useInputForm.ts:127-142 패턴 이식), `useLocaleSwitchState` storageKey = `` `input-form:saju:${product}:${mode}:${serviceMode}:${qrCode}` ``.
- **이미지 업로드 없음** — `localStorage.userImage`를 **명시적으로 remove**하고 결과 페이지가 부재를 허용하도록(§5.0).
- 폼 상태(§2 하단 타입 참조):

```ts
interface SajuFormState {
  pin: string
  targetType: 'idol' | 'self'          // 기본 'self'
  name: string                          // max 10
  gender: 'male' | 'female' | 'other'
  purpose: 'overall' | 'love' | 'wealth' | 'career' | 'compatibility' | null
  calendar: 'solar' | 'lunar'           // 기본 'solar'
  isLeapMonth: boolean
  birthYear: string; birthMonth: string; birthDay: string
  hourBranch: number | null             // 0(자)~11(해)
  exactTime: string | null              // 'HH:MM' — 시각 직접 입력 시
  timeUnknown: boolean
  partner: {
    name: string; gender: 'male' | 'female' | 'other'
    calendar: 'solar' | 'lunar'; isLeapMonth: boolean
    birthYear: string; birthMonth: string; birthDay: string
    hourBranch: number | null; exactTime: string | null; timeUnknown: boolean
    relation: 'lover' | 'crush' | 'spouse' | 'friend' | 'colleague' | 'bias' | null  // SSOT: SAJU_RELATION_OPTIONS
  } | null
  wish: string                          // max 100
}
```

### 3.1 入門 — GatePhase

```
┌──────────── 455px ────────────┐
│      [命香]  자정의 조향소      │  ← 명패 (공통)
│  ●━━━○----○----○----○         │  ← ProgressThread
│                               │
│   누구의 팔자를                │  ← title 24px, #E9E2D0
│   읽어드릴까요?                │
│   생년월일시 여덟 글자로 기운을  │  ← caption, #A69F8D
│   읽고, 향으로 처방합니다.      │
│                               │
│  ┌───── 我 ─────┐┌──── 愛 ────┐│  ← targetType 카드 2열
│  │  나의 사주    ││ 최애의 사주 ││
│  │ 내가 타고난   ││ 그 사람이   ││
│  │ 기운을 읽습니다││ 타고난 기운을││
│  └──────────────┘└────────────┘│
│                               │
│  [오프라인 전용: PIN 카드]      │
│                               │
│  이름 ­———————————————        │  ← InputField 재스킨
│  성별  [乾 남성][坤 여성][기타] │
│   ⓘ 명리에서는 남성의 명식을…   │
└───────────────────────────────┘
│         [ 다음 — 소망으로 ]     │  ← 하단 바
```

- **targetType 카드:** 2열 grid gap-3. 카드: `rounded-lg border p-4 flex flex-col items-center gap-1.5 min-h-[112px]`.
  - 비활성: `bg-[#12141D] border-[#262A38]`, 상단 SealStamp `outline` tone(글자색 `#A69F8D`) — 我/愛, 라벨 15px/600/`#A69F8D`, 설명 11px/`#5C564A`.
  - 활성: `bg-[#12141D] border-[#C9A227]` + `box-shadow: 0 0 20px rgba(201,162,39,0.15)`, SealStamp `cinnabar`(stamped 애니메이션 재생), 라벨 `#E9E2D0`, 설명 `#A69F8D`.
  - 전환 0.3s. 탭 시 `whileTap scale 0.98`.
- **카피:** title(self 기본) `"누구의 팔자를 읽어드릴까요?"` / sub `"생년월일시 여덟 글자로 기운을 읽고, 향으로 처방합니다."`
  - 카드1: `我 · 나의 사주` / `"내가 타고난 기운을 읽습니다"` — key `saju.input.gate.self`, `selfDesc`
  - 카드2: `愛 · 최애의 사주` / `"그 사람이 타고난 기운을 읽습니다"` — `idol`, `idolDesc`
- **PIN(오프라인만):** HanjiCard 아님 — 다크 카드 `bg-[#12141D] border border-[#262A38] rounded-lg p-4`. 라벨 `"인증 번호 네 자리"`(label 스타일, `#C9A227`), 입력 `h-12 text-center text-2xl tracking-[0.5em] bg-[#0C0E16] border border-[#262A38] rounded-md text-[#E9E2D0] focus:border-[#C9A227]` `inputMode="numeric" maxLength=4`. 4자리 완성 토스트/안내 배너는 기존 chemistry 문구·타이밍 로직 재사용하되 스킨: 배너 `bg-[#12141D] border-[#C9A227]/40`, 아이콘 KeyRound → 금색.
- **이름:** 라벨 self `"이름"` / idol `"최애의 이름"`. placeholder self `"실명 또는 부르는 이름"` / idol `"이름 또는 활동명"`. maxLength **10**. 스타일: `h-12 bg-transparent border-0 border-b border-[#262A38] rounded-none px-1 text-[17px] font-serif-kr text-[#E9E2D0] focus:border-[#C9A227] transition-colors` (밑줄 필기 느낌 — 박스 입력 금지).
- **성별:** 3버튼 행 gap-2: `[乾 남성] [坤 여성] [기타]` — pill `h-11 rounded-md border text-[14px]`; 활성 `border-[#C9A227] text-[#E9E2D0] bg-[#C9A227]/10`, 비활성 `border-[#262A38] text-[#A69F8D]`. helper(caption, `#5C564A`, 앞에 얇은 금 세로바 2px): `"명리에서는 남성의 명식을 건명(乾命), 여성의 명식을 곤명(坤命)이라 부릅니다."` idol 모드 helper: `"최애의 공개된 프로필 기준으로 선택해 주세요."`
- **유효성:** 이름 ≥1자 + 성별 선택 + (오프라인이면 PIN 4자리). 미충족 시 다음 버튼 disabled(에러 문구 없음 — 기존 관례).
- **다음 버튼 라벨:** `"다음 — 소망으로"`

### 3.2 所望 — PurposePhase

```
│   무엇이 가장 궁금하십니까?     │
│   하나의 물음에 깊게 답해       │
│   드립니다.                    │
│  ┌─ 命 ──────┐ ┌─ 緣 ──────┐  │
│  │ 종합       │ │ 연애       │  │
│  │ 타고난 기질과│ │ 인연이 오고 │  │
│  │ 전체 흐름   │ │ 머무는 자리 │  │
│  └───────────┘ └───────────┘  │
│  ┌─ 財 ──────┐ ┌─ 業 ──────┐  │
│  │ 재물       │ │ 직업·진로  │  │
│  └───────────┘ └───────────┘  │
│  ┌─ 合 ────────────────────┐  │
│  │ 궁합 — 두 사람의 기운이   │  │
│  │ 만나는 법 (상대 정보 필요) │  │
│  └─────────────────────────┘  │
```

- title `"무엇이 가장 궁금하십니까?"` / sub `"하나의 물음에 깊게 답해 드립니다."` (idol 모드 sub: `"최애의 팔자에서 무엇이 궁금하신가요?"`)
- **옵션 카드(단일 선택):** 2×2 grid + 궁합 full-width. 카드 구조 = targetType 카드와 동일 스킨(§3.1). 각 카드: SealStamp md(한자) + 옵션명 16px/600 + 설명 11px.

| key | 한자 | 옵션명 | 설명(self) | 설명(idol) |
|---|---|---|---|---|
| overall | 命 | 종합 | 타고난 기질과 전체 흐름 | 타고난 기질과 전체 흐름 |
| love | 緣 | 연애 | 인연이 오고 머무는 자리 | 최애의 연애 기질이 궁금하다면 |
| wealth | 財 | 재물 | 모이고 흩어지는 재물의 결 | 재물복은 타고나는 걸까요 |
| career | 業 | 직업·진로 | 일과 진로가 뻗는 방향 | 이 길은 최애의 팔자에 맞을까요 |
| compatibility | 合 | 궁합 | 두 사람의 기운이 만나는 법 · 상대 정보가 필요합니다 | 나와 최애, 두 기운이 만나는 법 · 상대 정보가 필요합니다 |

- 선택 시: 해당 낙관 stamped 재생, 나머지 카드 opacity 0.55로 침잠(0.3s). 재탭으로 변경 가능.
- **유효성:** purpose 선택. 다음 라벨: `"다음 — 생시로"`

### 3.3 生時 — BirthPhase

```
│   태어난 순간을 알려주세요       │
│   생년월일과 시간이 이 분석의    │
│   전부입니다. 사진도, 성격       │
│   질문도 필요하지 않습니다.      │
│                               │
│   [ 양력 | 음력 ]  □윤달        │  ← 세그먼트 + 조건부 체크
│                               │
│    ____년   __월   __일        │  ← 3필드 숫자 입력
│                               │
│   태어난 시간 — 시진(時辰)      │
│  ┌──┬──┬──┬──┐                │
│  │子 │丑 │寅 │卯 │  4×3 격자   │
│  │23-01│01-03│03-05│05-07│    │
│  ├──┼──┼──┼──┤                │
│  │辰…│巳…│午…│未…│            │
│  ├──┼──┼──┼──┤                │
│  │申…│酉…│戌…│亥…│            │
│  └──┴──┴──┴──┘                │
│   ⌁ 정확한 시각으로 입력하기    │
│  [ 시간을 알 수 없습니다 ]      │
```

- title self `"태어난 순간을 알려주세요"` / idol `"최애가 태어난 순간을 알려주세요"`. sub `"생년월일과 시간이 이 분석의 전부입니다. 사진도, 성격 질문도 필요하지 않습니다."` (idol sub: `"공개된 생년월일이면 충분합니다. 사진도, 성격 질문도 필요하지 않습니다."`)
- **양력/음력 토글(날짜 필드 위 — 먼저 결정하고 입력하도록):** 2세그먼트 `h-11 rounded-md bg-[#12141D] border border-[#262A38] p-1`, 활성 세그먼트 `bg-[#C9A227]/15 text-[#E9E2D0] border border-[#C9A227]/50 rounded`, 비활성 `text-[#A69F8D]`. 라벨 `양력` / `음력`.
  - `음력` 선택 시 우측에 체크 pill 등장(0.3s fade): `□ 윤달에 태어났습니다` — 체크 시 주사 채움 체크박스(14px). helper(음력 선택 시에만, caption): `"음력 날짜는 만세력으로 정확히 환산합니다. 윤달이면 꼭 표시해 주세요."`
- **생년월일 입력 — 결정: 네이티브 date picker 금지, 휠 금지. 숫자 3필드 + 자동 포커스 이동이 모바일에서 가장 빠르고 오류가 적다** (연도까지 스크롤하는 휠의 마찰, iOS/Android date input의 상이한 UX 제거).
  - 3필드: 연(4자리, w-[96px]) / 월(2자리, w-[64px]) / 일(2자리, w-[64px]), 가운데 정렬 행, 필드 사이에 `년` `월` `일` 접미 라벨(15px, `#A69F8D`).
  - 필드 스타일: 밑줄 입력(§3.1 이름과 동일 문법), 숫자 `text-[22px] font-sans`(숫자는 Outfit — §1.2 규칙) `text-center`, `inputMode="numeric"`, placeholder `1998`/`3`/`14`(`#3A3E4C`).
  - **자동 이동:** 연 4자리 입력 완료 → 월 포커스, 월 2자리(또는 4~9 입력 즉시) → 일 포커스. backspace로 빈 필드에서 이전 필드 복귀. `autoComplete="bday-year|month|day"`.
  - **검증(인라인, 즉시):** 연 1930~2035(엔진 테이블 범위 — DESIGN.md §3), 월 1~12, 일 1~31 + 월별/윤년 검증, 미래 날짜 불가, 음력은 30일 상한. 오류 시 해당 필드 밑줄 `#E2604E` + 필드 행 아래 caption `#E2604E` 1줄:
    - 범위 밖 연도: `"1930년부터 2035년 사이만 계산할 수 있습니다."`
    - 없는 날짜: `"달력에 없는 날짜입니다. 다시 확인해 주세요."`
    - 미래: `"아직 오지 않은 날입니다."`
- **12지시 선택 UI:** 라벨 행 `"태어난 시간"`(label 스타일) + 우측 caption `"시진(時辰)으로 고릅니다"`.
  - **4열×3행 그리드** gap-2. 셀: `rounded-md border min-h-[64px] flex flex-col items-center justify-center gap-0.5 py-2`.
    - 1행: 한자 `子` 18px/900/`#E9E2D0` · 2행: 시간범위 `23:00–00:59` 10px font-sans `#A69F8D` · 3행: 동물 `쥐` 9px `#5C564A`.
    - 비활성: `bg-[#12141D] border-[#262A38]` / 선택: `bg-[#C0392B]/15 border-[#C0392B]` + 한자 `#E2604E`, 찍힘 스케일(1.06→1, 0.25s easeSettle).
  - **정확한 시각 입력(보조 경로):** 그리드 아래 텍스트 링크 `"정확한 시각으로 입력하기"`(caption, `#C9A227`, 밑줄). 탭 시 그리드 아래로 `<input type="time">` 행이 펼쳐짐(`h-12`, 다크 입력 스킨). 시각 입력 시 해당 시진 셀이 **자동 하이라이트**되고 `exactTime` 저장 + caption 피드백: `"{HH:MM} — {진}시(辰時)에 해당합니다."` (시진 경계 보정은 계산 엔진 책임 — UI는 표준 2시간 구간 표기만.)
  - **시간 모름:** 그리드 아래 full-width 버튼 `h-12 rounded-md border border-dashed border-[#262A38] text-[#A69F8D] text-[14px]` `"시간을 알 수 없습니다"`. 선택 시: 버튼이 `border-[#C9A227]/50 text-[#E9E2D0] bg-[#12141D]`로, 그리드 전체 opacity 0.35 + 선택 해제, helper 등장: `"시간 없이 세 기둥(三柱)으로 읽습니다. 깊이는 유지하되, 시에 깃든 말년·자식의 자리는 비워 둡니다."`
- **유효성:** 유효한 생년월일 + (`hourBranch !== null` || `timeUnknown`). 다음 라벨: purpose가 궁합이면 `"다음 — 상대에게로"`, 아니면 `"다음 — 마지막 질문"`

### 3.4 相對 — PartnerPhase (궁합 전용)

- title `"상대는 어떤 분입니까?"` / sub `"두 명식을 나란히 펼쳐 합(合)과 충(沖)을 읽습니다."`
- **레이아웃:** BirthPhase의 컴포넌트를 그대로 재사용(이름/성별/양음력/3필드 날짜/12지시 그리드/시간모름) — 단 상단에 **관계 선택**이 먼저 온다.
- **관계 선택(단일):** 라벨 `"두 분의 관계"`. 3열×2행 pill 그리드 gap-2, pill `h-11 rounded-md border text-[13px]`:

| key | 라벨 |
|---|---|
| lover | 연인 |
| crush | 썸 · 짝사랑 |
| spouse | 부부 |
| friend | 친구 |
| colleague | 동료 · 파트너 |
| bias | 최애 |

  - key 체계와 마지막 항목은 구현 SSOT(`src/types/analysis.ts` `SAJU_RELATION_OPTIONS`)를 따른다 — 팬덤 커머스 특성상 '가족' 대신 **'최애'** 관계를 채택 (idol 모드 궁합의 1차 시나리오).

  - 활성 스킨 = 성별 pill과 동일(금 테두리 계열).
- 이름 라벨 `"상대의 이름"` placeholder `"이름 또는 부르는 호칭"`(max 10). 성별/생일/시진 라벨 문구는 BirthPhase와 동일하되 주어만 교체(`"상대가 태어난 시간"`).
- targetType이 `idol`이고 purpose가 궁합인 경우 안내 배너(caption, 금 세로바): `"나와 최애의 궁합이라면, 상대 칸에 나의 정보를 넣어 주세요."`
- **유효성:** relation + 이름 + 성별 + 유효 생년월일 + (시진 or 시간모름). 다음 라벨: `"다음 — 마지막 질문"`

### 3.5 心願 — WishPhase (선택 입력)

```
│   마음에 걸리는 것이            │
│   있습니까?                    │
│   한 문장이면 충분합니다.       │
│   팔자를 읽을 때 함께 헤아립니다.│
│  ┌─────────────────────────┐  │
│  │ (textarea, 3줄)          │  │
│  │                          │  │
│  └─────────────────────────┘  │
│                    0 / 100    │
│        건너뛰어도 됩니다        │
```

- title `"마음에 걸리는 것이 있습니까?"` / sub `"한 문장이면 충분합니다. 팔자를 읽을 때 함께 헤아립니다."` (idol 모드 title: `"최애에게 바라는 것이 있습니까?"` / sub: `"한 문장이면 충분합니다. 향을 고를 때 함께 헤아립니다."`)
- textarea: `min-h-[96px] rounded-md bg-[#12141D] border border-[#262A38] p-4 text-[15px] font-serif-kr leading-[1.85] text-[#E9E2D0] focus:border-[#C9A227]`, maxLength 100, placeholder self `"예) 이직을 해야 할지 3년째 고민하고 있습니다"` / idol `"예) 올해는 꼭 건강하게 활동했으면 합니다"`. 우하단 카운터 `0 / 100`(caption, font-sans).
- **건너뛰기:** 다음 버튼과 별개로 textarea 아래 중앙 텍스트 버튼 `"건너뛰어도 됩니다"`(caption, `#5C564A`, 밑줄) — 탭 시 wish 비운 채 다음 페이즈로.
- **유효성:** 항상 valid(선택 입력). 다음 라벨: `"다음 — 봉인으로"`

### 3.6 封印 — SealPhase (확인/제출)

```
│   사주 단자(單子)를 봉인합니다   │
│   아래 내용이 맞는지 확인해      │
│   주세요. 봉인 후 만세력을       │
│   펼칩니다.                     │
│  ┌═══════ 한지 카드 ═══════┐   │
│  │ ── 금 괘선 ──        命│   │ ← 우측 세로라벨 '四柱單子'
│  │  대상   나의 사주    式│   │
│  │  이름   김하늘        單│   │
│  │  성별   곤명(坤命)    子│   │
│  │  ‥‥‥ 붓획 디바이더 ‥‥‥ │   │
│  │  생시   1998년 3월 14일 │   │
│  │         (양력) · 진시    │   │
│  │  소망   緣 — 연애       │   │
│  │  심원   "…한 문장…"     │   │
│  │              [印] ←낙관 │   │
│  └─────────────────────────┘   │
│      각 항목 옆 [고치기]        │
```

- title `"사주 단자(單子)를 봉인합니다"` / sub `"아래 내용이 맞는지 확인해 주세요. 봉인한 뒤에는 만세력을 펼칩니다."`
- **사주 단자 카드:** HanjiCard(padding lg, verticalLabel `四柱單子`, seal 없음 — 도장은 봉인 순간 찍힌다).
  - 행 구조: 라벨(label 스타일, `#5C564A`, w-14) + 값(15px/600/`#1A1610`) + 우측 `고치기` 텍스트 버튼(caption, `#A93226`, 탭 시 해당 페이즈로 점프 — 페이즈 스택 복귀는 seal로 돌아오는 forward 링크 유지).
  - 행 목록(조건부): 대상(나의 사주/최애의 사주) / 이름 / 성별(건명(乾命)/곤명(坤命)/기타 — **여기서만 명리식 표기**) / 생시(`1998년 3월 14일 (양력) · 진시(辰時)` — 시간모름이면 `시(時) 미상`) / 소망(`緣 — 연애`) / [궁합] 상대(`이름 · 연인 · 1997년 …`) / [입력 시] 심원(따옴표로 감싼 인용, 2줄 클램프).
  - 행 사이: 3~4행마다 BrushDivider(tone `ink-on-cream`, width 160, 중앙 정렬).
- **봉인 CTA(하단 바 다음 버튼 대체):** 라벨 `"봉인하고 팔자 열람하기"`. 탭 시:
  1. 버튼 비활성 + 카드 우하단에 SealStamp lg(`印`, cinnabar) `stamped` 재생(0.45s).
  2. 0.5s 후 카드 전체 `scale 0.98 → 0.96, opacity → 0.8`(접히는 기분, 0.4s easeInk).
  3. 0.9s 시점 `handleComplete()` 호출 → 만세력 계산(`computeSajuChart` 클라이언트 즉시 실행) → `/api/analyze/saju` POST → AnalyzingOverlay `isVisible=true`(§4).
- 제출 페이로드/스토리지 계약은 DESIGN.md §2.1·§4 및 maps 계약을 따른다(이 문서 범위 밖).

---

## 4. 분석 로딩 오버레이 — SajuAnalyzingOverlay 스토리보드

```tsx
interface SajuAnalyzingOverlayProps {
  isVisible: boolean
  userName: string
  targetType: 'idol' | 'self'
  chart: SajuChart | null      // 클라이언트에서 이미 계산된 실제 팔자 — 패에 그대로 사용
  isComplete?: boolean
  onDoorOpened?: () => void    // 계약 유지 — 족자 전환 완료 시점에 호출
}
```

- 루트: `fixed inset-0 z-[99999] bg-[#0C0E16] saju-ink-grain` + GoldDust(count 24) + 중앙 컬럼 `max-w-[455px] mx-auto h-full flex flex-col items-center justify-center px-8`.
- **시간모름(삼주)인 경우:** 8패 대신 6패(시주 2패는 `unknown` 상태로 마지막에 흐리게 등장). 아래 타임라인의 패 수만 조정.

### 4.1 타임라인 (초 단위 — API 평균 25~40s 가정)

| 구간 | 연출 |
|---|---|
| **0.0–1.0** | 페이드인. 중앙에 만세력 책 실루엣(SVG: 펼친 책 — 두 페이지 rect + 중앙 접합선 + 페이지마다 6×8 격자 헤어라인 `#C9A227` opacity 0.25, 전체 폭 260px). 상단 카피 등장(§4.2 헤드라인). |
| **1.0–4.6** | **페이지 넘김 3회**(1.2s 간격): 오른쪽 페이지가 `rotateY 0→-160deg`(transform-origin left, 0.9s easeBrush)로 넘어가며 잔상 페이지에 갑자·연도 텍스트가 흐릿하게 스쳐감(`1924 甲子`, `1957 丁酉`, `1998 戊寅` — 랜덤 아님, 고정 3종. blur 2px, opacity 0.3). 마지막 넘김 후 책이 아래로 12px 가라앉으며 opacity 0.25로 배경화. |
| **4.6–12.0** | **8패 순차 플립** — 책 위 영역에 GanjiTile(md) 4×2 그리드(간 위/지 아래, 열 순서 년월일시 — 로딩은 좌→우 시간 순으로 완성되는 서사가 자연스러움). `chart.pillars`의 **실제 글자** 사용. hidden→revealed 플립, 0.9s 간격 스태거(년간 4.6s 시작 … 시지 11.0s). 각 착지마다 GoldDust 국소 버스트 3개. 시간모름이면 시주 2패는 11.0s에 `unknown` 상태로 fade-in만. |
| **12.0–13.2** | 완성된 원국이 `scale 1→0.82, y→-96px`로 화면 상단 1/3에 정렬(1.2s easeInk). 동시에 헤드라인이 §4.2의 2번 문구로 크로스페이드. |
| **13.2– (대기 루프)** | 중앙: ElementRing(size 180, `chart.elementCount` 반영, 앰비언트 회전만 — 점화는 결과 페이지의 것, 여기서 소진 금지). 하단: 격언 로테이션(§4.3) 4s 간격 크로스페이드(out 0.4s / in 0.8s). |
| **isComplete=true** | §4.4 족자 전환. |

### 4.2 헤드라인 카피

- 0–12s: self `"{userName} 님의 여덟 글자를 뽑고 있습니다"` / idol `"{userName}의 여덟 글자를 뽑고 있습니다"` (title 스타일 20px, `#E9E2D0`, 중앙).
- 12s~: `"팔자를 읽고, 향을 고르고 있습니다"` + 서브 caption `"약 30초 — 만세력은 이미 계산되었습니다"`.

### 4.3 대기 격언 로테이션 (i18n `saju.analyzing.quotes` — 9개, 셔플 시작)

1. `"사주는 정해진 운명이 아니라, 타고난 기질의 지도입니다."`
2. `"여덟 글자에는 태어난 계절의 온도가 담겨 있습니다."`
3. `"넘치는 기운은 덜어내고 모자란 기운은 채우는 것 — 조향도 명리도 같습니다."`
4. `"년주는 뿌리, 월주는 줄기, 일주는 나, 시주는 열매입니다."`
5. `"일간(日干)은 나의 중심 — 나머지 일곱 글자가 그 둘레를 돕니다."`
6. `"물이 마른 이에게는 바다의 향을, 불이 꺼진 이에게는 한낮의 향을."`
7. `"용신(用神)을 찾는 일은, 팔자에서 가장 목마른 자리를 찾는 일입니다."`
8. `"같은 날 태어나도 시(時)가 다르면 다른 향이 됩니다."`
9. `"향은 기억보다 오래 남고, 기운은 향을 따라 움직입니다."`

- 스타일: 15px/1.85/400, `#A69F8D`, 중앙, `break-keep`, 최대 2줄. 앞뒤에 6px 금 중점(·) 장식.

### 4.4 진행 표시 (progress bar 처우)

- 기존 프로그램의 25s→90% 관례를 **금실 채움**으로 치환: 화면 하단(safe-area 위 48px)에 폭 240px 실(1.5px, §2.8과 동일 문법) — 0→90%를 **28s** 동안 `easeBrush`로 채움, `isComplete` 시 0.6s 만에 100%.
- 실 위 매듭 3개(등간격 아님 — 25% / 60% / 90% 지점): 통과 시 금 채움 + 아래 caption 라벨 순차 점등: `만세력` → `풀이` → `調香`. 현재 구간 라벨만 `#C9A227`, 나머지 `#5C564A`.
- 우측 끝 캡션: `"약 30초"`(9px font-sans `#5C564A`).

### 4.5 완료 전환 — **결정: 문(門)이 아니라 족자(簇子)가 말려 올라간다**

`isComplete=true` 수신 시(진행 실 100% 채움 0.6s 후 시작, 총 2.6s):

1. **낙인(0–0.5s):** 화면 중앙에 SealStamp xl(`開`, cinnabar) `stamped` 재생. 격언/링/원국은 opacity 0.3으로 침잠.
2. **말림 준비(0.5–0.9s):** 화면 하단에서 **족자 봉(둥근 목봉)** 등장 — 가로 full-width(455px 셸 폭), 높이 18px 원기둥(수직 그라데이션 `#2A2416→#4A3F22→#2A2416`) + 양끝 금 마구리(지름 26px 원, 금 그라데이션, 셸 밖으로 6px 돌출). y +40→0 등장.
3. **족자 말림(0.9–2.5s):** 오버레이 전체(먹색 화면 = 두루마리 화폭)가 봉에 감기며 올라간다 — 구현: 오버레이 래퍼에 `clip-path: inset(0 0 0% 0)` → `inset(0 0 100% 0)`(아래에서 위로 걷힘, 1.6s easeBrush) + 봉이 `y: 0 → -100vh`로 동행 상승, 말리는 경계에 8px 그림자 밴드(`linear-gradient(180deg, transparent, rgba(0,0,0,0.5))`)가 봉 바로 아래 따라붙음. 걷힌 자리로 아래의 결과 페이지 序 섹션(밤하늘)이 드러난다.
4. **2.5s:** `onDoorOpened()` 호출(계약 이름 유지) → `router.push('/result?type=saju')`.
- reduced-motion: 1.2s 크로스페이드로 대체 후 `onDoorOpened()`.

---
## 5. 결과 페이지 — 9섹션 스크롤 서사 (`/result?type=saju`)

### 5.0 셸 공통

- `ChemistryResultRouter`에 `type === 'saju'` 분기 → `SajuResultPage`(전용 풀페이지, 탭 없음). 폴더 `src/app/[locale]/result/components/saju/` — 섹션당 1파일: `S0Prologue.tsx` ~ `S8Prescription.tsx` + `SajuResultPage.tsx` + `SajuBottomActions.tsx`.
- 배경: 페이지 루트 `bg-[#0C0E16] saju-ink-grain`, 전역 GoldDust(count 14, `fixed inset-0`) 1개만(섹션별 파티클 중복 생성 금지 — §5.10).
- 콘텐츠 폭: `max-w-[455px] mx-auto`. 본문 여백: 각 섹션 `px-6`. 맨 아래 `pb-36`(하단 바 클리어런스 계약).
- Header: 기존 공용 Header(뒤로가기, `?from=mypage` 계약) 유지. Header 아래 자동저장 상태 pill은 기존 로직 재사용하되 스킨: `bg-[#12141D] border border-[#262A38] text-[#A69F8D]`.
- **userImage 없음 허용:** 이미지 카드 블록 자체를 렌더하지 않는다(사주는 사진이 없는 프로그램).
- **데이터 계약:** `analysisData.sajuAnalysis`(DESIGN.md §4 스키마) + `analysisData.sajuChart`(계산된 SajuChart — **결과 저장 시 반드시 analysis_data에 포함**, 재열람·번역·인쇄가 여기에 의존) + 궁합 시 `analysisData.partnerChart`. 유니버설 코어(matchingPerfumes[0], scentCategories, scentRecommendation)는 기존 그대로.
- **장 사이 공통 전환:** 각 섹션 시작에 VerticalLabel 장 번호(`一章`…, gold, 좌상단 `pl-6`) + BrushDivider(label 없음, width 200, 중앙) — whileInView 드로잉. 섹션 헤드라인은 `display` 스케일(34px/900), 킥커는 `label` 스타일 금색.
- **텍스트 슬롯 공통 원칙:** 서사(narrative) 필드는 **클램프하지 않고 전문 노출**(auto height) — 프롬프트가 상한을 관리하고, UI는 최소/최대 허용치(§5.9 표)만 검증적으로 수용. 제목/한 줄 필드만 클램프.

### 5.1 序 — 밤하늘 (S0Prologue)

- **구조:** `<section ref>` 높이 **`h-[240vh]`**, 내부 sticky child `sticky top-0 h-screen overflow-hidden`. **스크롤 연동 섹션 #1.**
- **바인딩:**
```tsx
const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] })
// 별 파티클: 36개 (운명별 8 + 배경별 28)
// 배경별 i: opacity = useTransform(p, [0, 0.15], [0, 0.5]) 후 [0.6, 0.8] → [0.5, 0.1]
// 운명별 i(8개): 
//   x = useTransform(p, [0.15, 0.55], [scatterX[i], slotX[i]], { ease: easeInOut })
//   y = useTransform(p, [0.15, 0.55], [scatterY[i], slotY[i]])
//   scale = useTransform(p, [0.15, 0.55], [1, 1.6])
// 헤드라인: opacity = useTransform(p, [0.02, 0.1, 0.42, 0.52], [0, 1, 1, 0]); y = [16→0]
// 글자 공개: 8개 GanjiTile(sm) — opacity = useTransform(p, [0.55+i*0.02, 0.62+i*0.02], [0, 1])
//            대응 운명별은 같은 구간에서 opacity → 0 (별이 글자가 된다)
// 마무리: 전체 컨테이너 opacity = useTransform(p, [0.88, 1], [1, 0.4]) — 一章으로 넘겨줌
```
- 별: 1.5~2.5px 흰 점(`#E9E2D0`, blur 0.5px), 운명별만 금색(`#E8C766`) + 4px 글로우. `slotX/Y`는 화면 중앙 4×2 그리드(GanjiTile sm 폭 기준 gap 12) 좌표.
- **헤드라인(중앙, display 스케일):** self `"당신이 태어난 순간,\n하늘에는 여덟 글자가 새겨졌습니다"` / idol `"그 사람이 태어난 순간,\n하늘에는 여덟 글자가 새겨졌습니다"`. 시간모름이면 `여덟`→`여섯`(i18n 분기 키).
- 하단 스크롤 큐: `"아래로"` caption + 1px 세로 금선 24px(p>0.05에서 fade out).
- 데이터: `sajuChart.pillars`의 8글자(GanjiTile sm, revealed 상태로 등장 — 플립은 一章의 것).

### 5.2 一章 — 원국 命式 (S1Chart)

- **auto height** (sticky 아님), `py-24`. 킥커 `一章 · 命式`, 헤드라인 `"여덟 글자의 자리"`.
- **명식표:** HanjiCard(padding lg) 안에 만세력 격자:
  - 열 순서(전통 만세력, **우→좌 = 년월일시** — 즉 화면 좌→우 `時 日 月 年`), 열 헤더 한자(`時柱 日柱 月柱 年柱` 11px/600/`#5C564A`) + 아래 한글(`시주 일주 월주 년주` 9px).
  - 2행: 천간 GanjiTile(md) / 지지 GanjiTile(md), 행 라벨 좌측 VerticalLabel(`天干`/`地支`, ink tone).
  - whileInView(once): hidden→revealed 순차 플립(§2.1 순서 — 년간부터. 표기 순서는 우→좌지만 플립 순서는 년→시).
  - **일주 열 강조:** 두 타일 `highlighted` + 열 상단에 SealStamp sm(`日`) — 마지막 플립 완료 0.4s 후 stamped.
  - 시간모름: 時柱 열 두 타일 `unknown`.
- **기둥 풀이 리스트(카드 아래):** `pillarsReading.{year,month,day,hour}`를 4행으로 — 각 행: 좌측 한자 칩(年/月/日/時, 28px 사각, 해당 기둥 지지의 오행색 fill 10% + 오행 textOnDark 글자) + `label`(subheading 16px/600/`#E9E2D0`) + `meaning`(body, `#A69F8D`). 행 등장 스태거 0.15s. `hour`는 시간모름 시 렌더 생략(스키마에서 null 허용).
- **궁합 모드:** 명식표 2개 세로 스택(나 → 상대), 각 카드 좌상단에 이름 라벨 pill(`bg-[#12141D] border-[#262A38]` / 상대는 `border-[#C9A227]/40`). 기둥 풀이는 **나의 것만** 렌더(상대 풀이는 四章에서 관계 관점으로).

### 5.3 二章 — 일간 日干 (S2DayMaster)

- auto height, `py-24`, 중앙 정렬. 킥커 `二章 · 日干`, 헤드라인 `"당신의 중심 글자"`(idol: `"그 사람의 중심 글자"`).
- **대형 한자:** `dayMasterReading.hanja` — display-hanja(120px/900), `.saju-gold-foil` 적용. whileInView: `opacity 0→1, scale 1.15→1`, 1.4s easeInk. 한자 뒤 배경에 지름 220px 방사형 은은光(`radial-gradient(circle, rgba(201,162,39,0.12), transparent 70%)`).
- 아래 순서로:
  1. `archetypeTitle`(title 24px/600/`#E9E2D0`, 중앙) — 예: `"한낮의 태양, 병화(丙火)"`
  2. 오행·음양 칩 행: 일간의 오행 칩(`ELEMENT_META` 한자+한글, fill 10% bg + textOnDark) + 음/양 칩.
  3. `narrative`(body, `#E9E2D0` 85%, 좌측 정렬, 문단 사이 1em) — **전문 노출**, 문단 whileInView 스태거.
- **궁합 모드:** narrative 아래에 상대 일간 미니 카드(HanjiCard padding md): 상대 한자 48px + 상대 archetype 한 줄. "두 중심이 四章에서 만납니다" caption.

### 5.4 三章 — 오행의 흐름 (S3Elements)

- auto height, `py-24`. 킥커 `三章 · 五行`, 헤드라인 `"기운의 흐름"`.
- **ElementRing(size 300, counts=`sajuChart.elementCount`, yongsin 전달하되 `ignite=false`)** — 중앙. whileInView: 원호 드로잉(pathLength 0→1, 1.6s easeBrush) 후 노드 스태거 등장(0.12s). **부족 오행은 여기서 확실히 "꺼져" 보여야 한다**(五章 점화의 복선).
- 링 아래 **분포 바 리스트:** 5행 — 한자+한글 라벨(w-16, textOnDark 색) + 수평 바(h-2, rounded-full, fill 오행색, width = count/8*100%, whileInView width 애니메이션 0.8s) + 개수 숫자(font-sans, `#A69F8D`).
- 칩 요약 행: `dominant` → `"넘치는 기운 · {오행}"` 칩(오행색 테두리), `lacking` → `"모자란 기운 · {오행}"` 칩(dashed 테두리 `#5C564A`).
- `elementFlow.flowNarrative`(body) 전문 노출.
- **궁합 모드:** 링 1개는 유지(나 기준). 바 리스트를 **이중 바**(나: 오행색 / 상대: 동일 색 40% opacity, 나란히 h-1.5 두 줄)로 교체 + 범례.

### 5.5 四章 — 소망의 운 (S4Purpose) ※ 궁합에서 완전 대체

**공통(종합/연애/재물/직업):**
- auto height, `py-24`. 킥커 `四章 · 所望`, 상단에 목적 SealStamp md(命/緣/財/業, cinnabar, whileInView stamped).
- 헤드라인 = **AI 필드** `purposeReading.title`(display 34px — 최대 2줄, §5.9).
- `purposeReading.narrative`(body) 전문 노출.
- **keyInsights[3]:** 3개 세로 카드 스택(gap-3) — 카드: `bg-[#12141D] border border-[#262A38] rounded-lg p-4 border-l-2 border-l-[#C9A227]`, 내부: 좌측 한자 번호(`一 二 三`, 15px/900/`#C9A227`) + 본문(body-strong 15px/`#E9E2D0`, **2줄 클램프 없음, 최대 90자 프롬프트 상한**). 스태거 0.15s.
- `timingAdvice`: HanjiCard(padding md, seal `時`) — 라벨 `"때(時)의 조언"`(label, `#7A5C14`) + 본문(body, `#1A1610`).

**궁합 모드(§5.5-B — purpose === 'compatibility'):**
```
│  四章 · 合                     │
│  [나 명식 미니]  ⇄  [상대 미니] │  ← 두 원국 마주보기
│     합·충 연결선 SVG           │
│        [合] 74               │  ← score 낙관
│  relationDynamic (title)      │
│  narrative (body)             │
│  ── 어울리는 결 ──             │
│   · harmonyPoints[]           │
│  ── 부딪히는 결 ──             │
│   · frictionPoints[]          │
│  adviceNarrative (한지 카드)    │
```
- **두 원국 마주보기:** 좌우 2열(각 w-[45%]) — 각각 GanjiTile sm 4×2 미니 원국 + 이름 라벨. 등장: 좌측 `x:-40→0`, 우측 `x:40→0`, 1.2s easeInk 동시.
- **합충 연결선:** 두 원국 사이 SVG 레이어 — `jijiRelations`(궁합용 관계 데이터)에서 합(合)은 금색 실선 곡선 + 끝점 작은 `合` 라벨(9px), 충(沖)은 주사색 지그재그 라인 + `沖` 라벨. 최대 4개만 표기(초과 시 강한 순). 선 드로잉 pathLength 0→1 스태거 0.3s.
- **score:** SealStamp lg(`合`) 옆에 큰 숫자(`compatibility.score`, 44px/900 font-sans `.saju-gold-foil`) + `/100`(caption). 카운트업 애니메이션 0→score 1.2s(easeBrush).
- `relationDynamic`(title 스케일, 2줄 허용) → `adviceNarrative` 앞의 메인 서사로 `purposeReading.narrative` 대신 `compatibility` 블록 사용.
- **harmonyPoints[] / frictionPoints[]:** 두 리스트 — 항목: 접두 중점(harmony `·` 금색 / friction `·` 주사색) + body 15px. 각 최대 4항목 렌더(초과 slice).
- `adviceNarrative`: HanjiCard(seal `合`) 전문 노출.
- **五章 이후는 "나"(주 대상) 기준으로 동일 진행** — 궁합이어도 향은 주 대상의 용신으로 처방된다는 원칙을 caption으로 명시: `"향은 단자의 주인, {이름} 님의 용신을 따라 처방합니다."`

### 5.6 五章 — 용신의 계시 (S5Yongsin)

- **구조:** `h-[220vh]` + sticky child. **스크롤 연동 섹션 #2 (마지막 sticky).**
- **바인딩:**
```tsx
const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] })
// 킥커+헤드라인: opacity = useTransform(p, [0.02, 0.1], [0, 1])
// ElementRing(size 300, ignite는 p 기반 수동 제어):
//   arcProgress = useTransform(p, [0.12, 0.42], [0, 1])   // 원호 재드로잉 + 유성 헤드
//   igniteT     = useTransform(p, [0.42, 0.58], [0, 1])   // 노드 fill 크로스페이드+scale+글로우
//   (ElementRing에 MotionValue를 주입하는 controlled 모드 prop 추가: `progress={{arc, ignite}}`)
// 계시문: opacity = useTransform(p, [0.6, 0.7], [0, 1]); y = [24, 0]
// 전환문("이 기운은…"): opacity = useTransform(p, [0.74, 0.82], [0, 1])
// 섹션 침잠: ring scale = useTransform(p, [0.86, 1], [1, 0.85]); opacity → 0.3
```
- 킥커 `五章 · 用神`, 헤드라인 `"당신에게 필요한 기운"`(idol: `"그 사람에게 필요한 기운"`).
- 점화 완료 시점(igniteT=1)에 용신 오행명 대형 표기: `ELEMENT_META.hanja` 72px/900(해당 오행 textOnDark 색) + `"{한글}({한자}) — {elementFlow.yongsin 그대로}"` title.
- `yongsinReason`(body, `#E9E2D0`) — 계시문 구간에서 등장, 전문 노출.
- **전환문(終章 예고, 고정 카피):** `"이 기운은, 향이 될 수 있습니다."` — title 24px, `.saju-gold-foil`, 중앙. p 0.82 이후 유지된 채 섹션이 끝나며 終章으로 이어진다.

### 5.7 終章 — 운명의 향 공개 (S6Reveal) ※ 의식(儀式)

- auto height, `py-28`, 중앙 정렬. sticky 아님 — **whileInView(once) 트리거의 고정 타임라인 시퀀스**(스크롤 속도와 무관하게 의식은 일정한 속도로 진행되어야 한다).
- 킥커 `終章 · 香`, 헤드라인 없음(향수명이 헤드라인).
- **리빌 타임라인(트리거 후):**

| t | 연출 |
|---|---|
| 0.0s | 섹션 배경에 지름 320px 방사광(radial, rgba(201,162,39,0.08)) 페이드인 1.2s. GoldDust 국소 8개 추가(이 섹션 한정, 전역 14 + 8 = 22 ≤ 24 상한). |
| 0.3–2.5s | **SajuBottle `phase='outline'`:** 병 외곽선 SVG `pathLength 0→1`(2.2s, easeBrush) — 금실이 병을 그린다. 캡·목 링은 1.8s부터 fade. |
| 2.5–3.9s | **`phase='filling'`:** 액체 `clip-path: inset(100% 0 0 0) → inset(28% 0 0 0)`(1.4s easeInk — 병의 72%까지 참). 액면 라인 흔들림 시작(CSS). 어깨 오행 인장 stamped(3.6s). |
| 3.9–4.5s | **향수명 등장:** 병 라벨지 위 HTML 레이어 — 향수명(`matchingPerfumes[0].persona.name ?? perfumeName`, title 24px/900/`#1A1610`, 라벨지 내 중앙, 2줄 클램프) `scale 1.12→1 + opacity`(easeSettle). 병 아래 브랜드 라인 `AC'SCENT ##`(label, font-sans, `#A69F8D`). |
| 4.5–5.4s | **노트 3단(기운의 3층):** 병 오른쪽이 아니라 **병 아래 세로 스택**(모바일 폭) — 3행 스태거 0.3s. |

- **노트 3단 행 구조:** `bg-[#12141D] border border-[#262A38] rounded-lg p-4 flex gap-3 items-start`
  - 좌: 층위 칩(w-[76px]) — `겉기운\nTOP` / `중심기운\nMIDDLE` / `뿌리기운\nBASE` (11px 한글 600 + 8px 라틴 font-sans, 금색 `#C9A227` 상단 헤어라인).
  - 중: 노트명 `persona.mainScent/subScent1/subScent2.name`(subheading 16px/600/`#E9E2D0`, 1줄 truncate).
  - 우 하단으로 이어지는 의미 텍스트: `scentDestiny.topMeaning/middleMeaning/baseMeaning`(caption 12px/1.6/`#A69F8D`, **3줄 클램프**).
- **왜 이 향인가(의식의 핵심 — 반드시 눈에 띄게):** 노트 3단 아래 HanjiCard(padding lg, verticalLabel `調香記`, seal `香`):
  - 라벨 `"왜 이 향인가"`(label, `#7A5C14`)
  - `scentDestiny.elementBridge`(body-strong, `#1A1610`) — 용신 오행→노트 논리 한 단락.
  - BrushDivider(ink-on-cream) 후 `scentDestiny.whyNarrative`(body, `#1A1610` 85%) 전문 노출.
- reduced-motion: 전 시퀀스 생략 — 완성 상태(`phase='complete'`) 정적 렌더 + 순차 fade 0.6s.

### 5.8 처방전 — 리츄얼 (S7Prescription) + 하단 바 (S8)

- **배경 반전 섹션:** full-bleed `bg-[#F5EFE2] saju-hanji`(455px 셸 내부 전체 폭), `py-20 px-6` — 두루마리의 마지막, 크림 지면 위 처방전. 위 경계에 두루마리 봉 모티프 재사용(§4.5의 봉, 정적, 폭 100%).
- 킥커 `處方 · 리츄얼`(label, `#7A5C14`), 헤드라인 `"향을 쓰는 법"`(display, `#1A1610`).
- **처방 항목(2열 그리드 아님 — 세로 리스트, 각 행 아이콘 없이 한자 불릿):**
  1. `時` — `"뿌리는 때"`: `scentDestiny.ritualGuide`(body, `#1A1610`) 전문.
  2. `季` — `"어울리는 계절/시간"`: 기존 `scentRecommendation.best_season/best_time`을 칩으로 — 칩: `h-9 px-3 rounded border border-[#1A1610]/25 text-[13px] text-[#1A1610]`, 선택 칩만 `bg-[#C0392B] text-[#F5EFE2] border-transparent`. (기존 컬러 이모지 칩 문법 금지.)
  3. `流` — `"올해의 흐름"`: `yearlyFlow.thisYear`(body) — 좌측 주사 세로바 2px 인용 스타일.
- 마지막: 중앙 SealStamp lg(`命香`, cinnabar, whileInView stamped) + caption `"자정의 조향소 — 당신의 팔자에서 고른 단 하나의 향"` (idol: `"…그 사람의 팔자에서 고른 단 하나의 향"`).
- **S8 — SajuBottomActions:** 기존 ResultBottomActions **높이/버튼 구성 계약 그대로**(online: 공유/장바구니/바로구매 + 시향지 CTA 없음 — saju는 `canBuyScentPaper` false, offline: 공유/피드백/기록). 스킨만:
  - 바: `bg-[#12141D]/95 backdrop-blur border-t border-[#C9A227]/30`(기존 노란 오프셋 그림자 제거).
  - 바로구매: `bg-[#C0392B] text-[#F5EFE2]` + `animate-buy-glow` 대신 금 글로우 변형(`drop-shadow rgba(201,162,39,…)` 동일 키프레임 구조, 신규 클래스 `animate-saju-buy-glow`).
  - 장바구니: `border border-[#C9A227]/60 text-[#E8C766] bg-transparent`.
  - 공유: 정사각 아이콘 버튼 `border-[#262A38] text-[#A69F8D]`.
  - 피드백(offline): `bg-[#C0392B]`.

### 5.9 텍스트 허용치 표 (프롬프트 상한 ↔ UI 클램프 이중 방어)

| 필드 | 최소~최대(자) | UI 처리 |
|---|---|---|
| dayMasterReading.archetypeTitle | 6~20 | 1줄, 초과 시 `truncate` 금지 → 2줄 허용 후 20자 slice |
| dayMasterReading.narrative | 300~700 | 전문, 문단 분할(`\n\n`) 렌더 |
| pillarsReading.*.label | 4~14 | 1줄 |
| pillarsReading.*.meaning | 40~120 | 전문 |
| elementFlow.flowNarrative | 200~500 | 전문 |
| elementFlow.yongsinReason | 80~250 | 전문 |
| purposeReading.title | 8~28 | 최대 2줄, 28자 slice |
| purposeReading.narrative | 350~800 | 전문 |
| purposeReading.keyInsights[i] | 20~90 | 90자 slice |
| purposeReading.timingAdvice | 60~200 | 전문 |
| compatibility.relationDynamic | 10~40 | 2줄 |
| compatibility.harmony/frictionPoints[i] | 15~70 | 4항목 slice, 70자 slice |
| compatibility.adviceNarrative | 200~500 | 전문 |
| scentDestiny.top/middle/baseMeaning | 20~80 | 3줄 클램프(`-webkit-line-clamp:3`) |
| scentDestiny.elementBridge | 60~180 | 전문 |
| scentDestiny.whyNarrative | 200~500 | 전문 |
| scentDestiny.ritualGuide | 80~250 | 전문 |
| yearlyFlow.thisYear | 60~180 | 전문 |
| 전 필드 공통 | — | `break-keep`, 빈 값 폴백 `"—"` 아닌 **블록 미렌더** |

### 5.10 성능 가드레일

- **sticky 스크롤 연동 섹션은 정확히 2개**(序, 五章). 나머지는 whileInView(once).
- 동시 애니메이션 요소 상한: **파티클 24 + 진행 중 트랜지션 8** 이내. 섹션 로컬 GoldDust는 終章 8개만 허용.
- `will-change: transform`은 framer-motion에 위임(수동 지정 금지), CSS 앰비언트만 클래스에 포함(`GoldDust`, ring 회전).
- 마운트 정책: 모든 섹션은 항상 마운트(언마운트 가상화 금지 — 스크롤 서사 특성상 높이 안정성 우선), 대신 `viewport={{ once: true, margin: "-15% 0px" }}`로 애니메이션만 지연.
- 이미지 없음 → LCP는 序 헤드라인 텍스트. Noto Serif KR 900 서브셋이 로드 전 FOUT 허용(`display: swap`).
- `useReducedMotion()` true: 序/五章의 sticky를 auto height 정적 렌더로 전환(모든 useTransform 출력 최종값 고정), 플립/리빌은 fade 0.6s.
- DB 재열람(`?id=`)/로케일 전환: 기존 useResultData 파이프라인 그대로 — sajuAnalysis 필드가 번역 대상 목록에 포함되어야 함(DESIGN.md §4, 이 문서 §8).

---

## 6. 랜딩 페이지 (`/programs/saju`) 디자인 방향

**제약:** UnifiedDetailHero는 공용 컴포넌트(흰 배경 + 검정 보더 카드 + admin 갤러리 이미지) — **컴포넌트 자체는 건드리지 않는다.** 사주의 무드는 (a) 갤러리 이미지 아트디렉션, (b) 배지/가격/카피, (c) 히어로 아래 하드코딩 상세 섹션으로 낸다.

### 6.1 UnifiedDetailHero 파라미터

- `badgeClassName="bg-[#0C0E16] text-[#E8C766]"`, 배지 텍스트 기본값 `"命"` (admin 편집 가능 필드).
- 가격 블록: 기존 문법(`₩48,000~`), `price.setBasis` 대응 카피: `"10ml / 50ml 동일가"`.
- `infoItems`: `["AI 사주 분석 리포트 + 맞춤 향수", "주문 후 3~5일 내 발송"]`, `infoIcon`: lucide `ScrollText`.
- CTA: `label: "내 팔자의 향 찾기"`, onClick → `/input?type=saju&mode=online` (로그인 게이트 기존 패턴).
- 제목/브레드크럼: 기존 관례(`useProductDisplayName('saju', ...)`).

### 6.2 갤러리 이미지 아트디렉션 (admin 업로드용 5컷 — 제작 가이드)

| # | 컷 | 무드 |
|---|---|---|
| 1(대표) | 먹색(#0C0E16) 배경, 향수병 1병 중앙, 병 뒤로 금박 팔자 글자 8자가 흐릿하게 부유 | 자정의 조향소 그 자체. 흰 히어로 카드 안에서 먹색 사각형이 강한 대비로 박힌다 |
| 2 | 한지 위 사주 단자(붓글씨 명식) + 주사 낙관 + 유리 스포이드 플랫레이 | "처방"의 물성 |
| 3 | 오행 상생 고리 다이어그램(금선, 다크) + 5색 향료 병 미니어처 | 오행→향 논리의 시각화 |
| 4 | 만세력 책 매크로 컷(격자와 갑자 활자), 얕은 심도 | 계산의 근거, 신뢰 |
| 5 | 인쇄 보고서(3-1) 실물 목업 — 접힌 카드 | 받아보는 결과물 |

### 6.3 하드코딩 상세 섹션 (기존 chemistry 랜딩 구조 답습, 사주 스킨)

1. **Feature Bar:** `bg-[#0C0E16] py-6` — 3항목, 아이콘 대신 한자(`命 · 五行 · 香` 각 항목 앞 15px 금색): `"만세력 정밀 계산"` / `"오행 기반 조향 논리"` / `"命式 인쇄 보고서"`(텍스트 `#E9E2D0` 12px/600). lucide 아이콘 금지(§1.0).
2. **진행 과정(4단계):** `bg-[#FFFDF5] py-12` — 기존 그리드 구조 유지하되 스텝 타일을 SealStamp 스타일 사각(56px, `#0C0E16` 면 + 금 한자)으로: `問`(문진 — 생시를 여쭙니다) / `曆`(만세력 — 여덟 글자를 뽑습니다) / `解`(풀이 — 기운의 흐름을 읽습니다) / `香`(조향 — 모자란 기운을 향으로 채웁니다). 스텝 번호는 기존 `01~04` 문법.
3. **특별함 3카드:** 흰 카드 + 얇은 먹 보더(`border border-[#1A1610]/15 rounded-lg` — 이 페이지는 사주 월드 밖이므로 검정 하드보더 관례와 절충):
   - `"사진도 질문지도 없습니다"` / `"생년월일시 여덟 글자가 데이터의 전부입니다. 순수한 명리 데이터로만 읽습니다."`
   - `"AI는 계산하지 않습니다"` / `"만세력 계산은 검증된 코드가, 해석과 조향만 AI가 맡습니다."`
   - `"향이 곧 처방입니다"` / `"부족한 기운(用神)을 30종의 향 중 하나로 채웁니다. 왜 이 향인지 근거까지 드립니다."`
4. 리뷰/로그인 모달/AuthModal: 기존 공용 컴포넌트 그대로(`program_type: 'saju_perfume'`).

---
## 7. 인쇄 보고서 — 842×595 레이아웃 그리드 (`PrintableReport` `saju_perfume` 분기)

### 7.0 원칙 (기존 관례에서의 의도적 이탈 1건 포함)

- 캔버스 계약 그대로: `w-[842px] h-[595px]` 루트, 배경 SVG `object-fill`, `@media print` 블록/`standalonePrintStyles`/bulk-print 계약 유지(maps §3 verbatim).
- **의도적 이탈: 라벨을 SVG 패스로 굽지 않는다.** 배경 SVG(`public/background/3-1.svg`, `3-2.svg`)는 **장식(질감/괘선/오너먼트/프레임)만** 담고, 모든 텍스트 라벨·값은 HTML 절대 배치. (유지보수: 라벨 수정에 SVG 재제작 불필요. 좌표는 아래 표가 계약.)
- 폰트: 루트 div에 `style={{ fontFamily: "var(--font-noto-serif-kr), 'Noto Serif KR', serif" }}` — admin 경로도 루트 레이아웃 하위라 변수 사용 가능. 숫자 포함 전부 Serif KR 단일(기계별 편차 제거).
- 변형: `analysis.target_type === 'self'` → **3-2(먹 단색 젠)**, `'idol'` → **3-1(금박+오행 컬러)**. 기존 1-1/1-2 분기 문법과 동일.
- 좌표는 전부 캔버스 절대 좌표(px): `style={{ left, top, width, height }}` + `position: absolute`.

### 7.1 배경 SVG 사양 (에이전트가 코드로 작성 — viewBox `0 0 842.25 595.499986`)

**공통 레이어(3-1/3-2 동일 구조, 색만 분기):**
1. 지면: full-bleed rect `fill: #F5EFE2` + feTurbulence 한지 필터(§1.3의 2겹 파라미터를 SVG 필터로 재사용: `baseFrequency="0.012 0.28"` 섬유 + `0.9` 반점, 각 opacity 0.05/0.04, multiply).
2. 접힘선: `x=421` 수직 파선(`stroke-dasharray: 2 4`, width 0.5, opacity 0.15).
3. 외곽 프레임: 3-1 = 이중 금 괘선 — outer rect inset 12(`stroke: #C9A227` 1.5), inner rect inset 19(`stroke: #C9A227` 0.5, opacity 0.6) / 3-2 = 단일 먹 괘선 — rect inset 14(`stroke: #1A1610` 1).
4. 코너 오너먼트(4곳, 40×40): 3-1 = 구름문(운문) 곡선 3획 path(금) / 3-2 = 직각 이중 꺾쇠(먹).
5. 섹션 헤어라인(오른쪽 패널): `y=74`(x 462→790), `y=316`, `y=448` — 3-1 금 0.75 / 3-2 먹 0.5 opacity 0.5.
6. 왼쪽 패널 프레임: 명식 그리드 둘레 rect `(78, 142) w:272 h:180`(stroke 0.75; 3-1 금 / 3-2 먹) + **일주 브래킷**: `(148,158)~(210,320)` 열 둘레 상하 꺾쇠 4획(3-1 금 1.2 / 3-2 먹 1.2) — 일주 열은 좌표 고정이므로 SVG에 구울 수 있다.
7. 3-1 전용: 좌측 패널 배경 중앙(210, 250)에 지름 300 오행 고리 워터마크(금, opacity 0.06), 우측 향수명 영역 뒤(462~790, 76~126) 운문 flourish(금, opacity 0.08).
8. 3-2 전용: 우하단(790, 560) 근처 먹 붓획 1획(§2.4 path 재사용, opacity 0.12, 길이 120).

### 7.2 좌측 패널 — 命式 (슬롯별 절대 좌표)

| # | 슬롯 | left | top | width | height | 스펙 |
|---|---|---|---|---|---|---|
| L1 | 프로그램 낙관 | 36 | 36 | 44 | 44 | SealStamp 마크업 인라인 재현(`命香` 세로 2자, 3-1 cinnabar `#B03325` / 3-2 ink `#1A1610`), rotate -3deg |
| L2 | 타이틀 | 92 | 40 | 240 | 18 | `四柱命式` 13px/900/tracking 0.35em/`#1A1610` |
| L3 | 서브타이틀 | 92 | 60 | 240 | 12 | `자정의 조향소 · 사주 분석 보고서` 8.5px/`#5C564A` |
| L4 | 이름 라벨 | 36 | 94 | 60 | 10 | `이름` 7.5px/600/tracking 0.14em/(3-1 `#7A5C14` / 3-2 `#5C564A`) |
| L5 | 이름 값 | 36 | 106 | 150 | 20 | 14px/900/`#1A1610`, **10자 truncate** |
| L6 | 생시 라벨 | 196 | 94 | 140 | 10 | `생시` (L4와 동일 스타일) |
| L7 | 생시 값 | 196 | 106 | 170 | 30 | 2줄: `1998.03.14 (양력)` / `진시(辰時) · 곤명` 9.5px/1.5/`#1A1610`, 각 줄 truncate |
| L8 | 열 헤더 ×4 | 84+68i | 148 | 54 | 12 | 좌→우 `時柱 日柱 月柱 年柱` 9px/600/`#5C564A`, 중앙 정렬 (i=0..3) |
| L9 | 천간 타일 ×4 | 84+68i | 164 | 54 | 70 | 인쇄용 GanjiTile 정적 재현: 크림 면은 배경에 맡기고 **테두리 1px `#C8BFA9` + 상단 3px 오행 바 + 한자 30px/900/`#1A1610` + 독음 7.5px** (3-2: 오행 바 대신 먹 바 `#1A1610`, 두께 2px) |
| L10 | 지지 타일 ×4 | 84+68i | 244 | 54 | 70 | L9와 동일. 시간모름 시 i=0 열(時) 두 타일: 한자 자리 `時` opacity 0.15, 독음 `미상` |
| L11 | 오행 분포 라벨 | 52 | 330 | 120 | 10 | `五行 분포` 7.5px 라벨(L4 스타일) |
| L12 | 오행 행 ×5 | 52 | 344+21j | 300 | 16 | j=0..4(木火土金水): 한자+한글 `木 목` 10px/600 w:52(3-1 오행 textOnCream 색 / 3-2 `#1A1610`) → 도트 8칸(10px 원, gap 4, 채움 = count 개수: 3-1 오행 fill / 3-2 먹 사각 8×8) → 우측 개수 9px font 숫자 `#5C564A` |
| L13 | 용신 낙관 | 52 | 466 | 72 | 72 | SealStamp lg 재현 — 용신 오행 한자 1자(3-1 cinnabar / 3-2 ink), rotate -3deg |
| L14 | 용신 라벨 | 140 | 470 | 224 | 10 | `용신(用神) — 필요한 기운` 7.5px(L4 스타일) |
| L15 | 용신 오행명 | 140 | 483 | 224 | 18 | `수(水) — 흐르는 지혜` 형식: `elementFlow.yongsin` 13px/900/`#1A1610`, 1줄 truncate |
| L16 | 용신 근거 | 140 | 504 | 224 | 32 | `elementFlow.yongsinReason` 8.5px/1.4/`#5C564A`, **2줄 클램프(60자 slice)**, break-keep |
| L17 | 푸터 | 52 | 552 | 300 | 12 | `MIDNIGHT ATELIER · {검사일 YYYY.MM.DD}` 7px/`#8B8578`, tracking 0.1em |

### 7.3 우측 패널 — SCENT PROFILE (슬롯별 절대 좌표)

| # | 슬롯 | left | top | width | height | 스펙 |
|---|---|---|---|---|---|---|
| R1 | 헤더 | 462 | 40 | 220 | 14 | `SCENT PROFILE` 11px/900/tracking 0.4em/(3-1 `#7A5C14` / 3-2 `#1A1610`) |
| R2 | 서브 | 462 | 58 | 220 | 12 | `처방된 운명의 향` 8.5px/`#5C564A` |
| R3 | 향수명 | 462 | 82 | 328 | 40 | `matchingPerfumes[0].persona.name` 19px/900/1.25/`#1A1610`, **2줄 클램프(24자 slice)** |
| R4 | 브랜드 라인 | 462 | 124 | 328 | 12 | `AC'SCENT {perfumeId}` 8px/tracking 0.15em/`#5C564A` |
| R5a | 노트1 칩 | 462 | 144 | 78 | 18 | `겉기운 TOP` — 3-1: `bg #C0392B` 백자(白字) 7.5px/900 / 3-2: 먹 테두리 1px 흑자, radius 2 |
| R5b | 노트1 이름 | 550 | 144 | 240 | 18 | `persona.mainScent.name` 12.5px/700/`#1A1610`, 1줄 truncate(14자) |
| R5c | 노트1 의미 | 462 | 166 | 328 | 26 | `scentDestiny.topMeaning` 8.5px/1.5/`#5C564A`, 2줄 클램프(55자 slice) |
| R6 | 노트2(중심기운 MIDDLE) | — | 200/222 | — | — | R5 구조 y+56 (칩 462,200 / 이름 550,200 / 의미 462,222) — `subScent1`, `middleMeaning` |
| R7 | 노트3(뿌리기운 BASE) | — | 256/278 | — | — | R5 구조 y+112 — `subScent2`, `baseMeaning` |
| R8 | 향 차트 라벨 | 462 | 326 | 150 | 10 | `향의 여섯 결` 7.5px 라벨 |
| R9 | 카테고리 행 ×6 | 462 | 342+18k | 328 | 14 | k=0..5, 점수 내림차순 정렬(기존 문법): 카테고리명 10px/700 w:64 → **10도트 미터**(8px 원, gap 3; 3-1: 채움 `CATEGORY_INFO` 계열색·빈 도트 scale 0.6 회색 / 3-2: 채움 8×8 먹 사각·빈칸 테두리만) → 점수 뱃지 16×16(3-1 계열색 원+백자 8px / 3-2 먹 사각+백자). **1위 행: 3-1 = 우측에 주사 micro-낙관 `首`(12px) / 3-2 = `★` 먹 사각** (기존 👑 이모지 문법 대체) |
| R10 | SEASON 라벨 | 462 | 456 | 150 | 10 | `BEST SEASON` 7.5px/tracking 0.3em |
| R11 | SEASON 칩 ×4 | 462 | 470 | 150 | 36 | 칩 26×34 gap 6(봄/여름/가을/겨울 한 글자 10px/700): 선택 = 3-1 `bg #3E7C4F`형 계절색(봄 wood/여름 fire/가을 earth/겨울 water) 백자 / 3-2 먹 채움 백자. 비선택 = 테두리 1px `#C8BFA9` + `#8B8578` 글자 |
| R12 | TIME 라벨 | 640 | 456 | 150 | 10 | `BEST TIME` (R10 스타일) |
| R13 | TIME 칩 ×4 | 640 | 470 | 150 | 36 | `아침/낮/저녁/밤` — R11과 동일 문법(선택색 3-1: `#C9A227` 계열 단일 / 3-2 먹) |
| R14 | 처방 한 줄 | 462 | 520 | 328 | 40 | 좌측 2.5px 세로바(3-1 `#C0392B` / 3-2 `#1A1610`) + pl-2: `purposeReading.timingAdvice` 9px/1.5/`#1A1610`, **2줄 클램프(80자 slice)**, break-keep |

### 7.4 변형 차이 요약 (3-1 최애 vs 3-2 나)

| 요소 | 3-1 (idol — 금박·컬러) | 3-2 (self — 먹 단색 젠) |
|---|---|---|
| SVG 프레임 | 이중 금 괘선 + 운문 코너 + 오행 워터마크 | 단일 먹 괘선 + 꺾쇠 코너 + 붓획 1획 |
| 낙관(L1/L13) | 주사 `#B03325` | 먹 `#1A1610` |
| 타일 오행 바 | 오행 원색 | 먹 2px |
| 오행 도트/차트 | 오행색 원 도트 | 먹 사각 |
| 노트 칩/1위 표식 | 주사 칩 / `首` 낙관 | 먹 테두리 칩 / `★` 먹 사각 |
| 라벨 금색(`#7A5C14`) | 사용 | 전부 `#1A1610`/`#5C564A`로 통일 |

### 7.5 검증 요건

- 최장 텍스트 케이스(모든 slice 상한 채운 목데이터)로 인쇄 프리뷰 픽셀 검수 — 슬롯 간 겹침 0.
- bulk-print: `standalonePrintStyles={false}` + `rootId` 주입 경로 동작 확인(기존 계약).
- 인쇄는 Korean-only(기존 관례) — locale 무관 한국어 라벨.

---

## 8. i18n 카피 정책

### 8.1 원칙

- **정적 UI 문자열 = i18n 키**(5로케일 ko/en/ja/zh/es 전부 — 누락 시 렌더 타임 throw), **서사 텍스트 = AI 생성**(`sajuAnalysis.*` — ko 소스, `/api/translate/image-result` 확장으로 재열람 번역).
- **한자 병기는 전 로케일 유지**: `丙火`, `用神`, `四柱` 등 한자는 번역하지 않는다 — 디자인 요소이자 브랜드 문법. 각 로케일 문자열 안에 한자를 그대로 포함해 작성한다(예: en `"Your Day Master is 丙火, the midday sun."`). GanjiTile/SealStamp/VerticalLabel의 한자는 데이터/상수이므로 i18n 대상 아님.
- 12지시 시간범위·숫자·단위는 로케일 공통 포맷(`23:00–00:59`) — 번역 키 밖에 둔다.
- 인쇄 보고서(§7)는 i18n 미적용(Korean-only 관례).

### 8.2 네임스페이스 설계 (`src/messages/*.json`)

```
saju.landing.*      — 랜딩 하드코딩 섹션 (featureBar 3, process 4×2, special 3×2, cta, price)
saju.input.gate.*   — title/sub(+idol 분기 suffix 키), self/selfDesc/idol/idolDesc,
                      nameLabel/nameLabelIdol/namePlaceholder/namePlaceholderIdol,
                      genderLabel/genderMale/genderFemale/genderOther/genderHelper/genderHelperIdol,
                      pin.* (기존 chemistry pin 문구 구조 복제)
saju.input.purpose.* — title/sub/subIdol, options.{overall|love|wealth|career|compatibility}.{label|desc|descIdol}
saju.input.birth.*  — title/titleIdol/sub/subIdol, calendarSolar/calendarLunar/leapMonth/leapHelper,
                      yearSuffix/monthSuffix/daySuffix, errors.{yearRange|invalidDate|futureDate},
                      timeLabel/timeSub, exactTimeLink/exactTimeMatch, timeUnknown/timeUnknownHelper,
                      branches.{0..11}.animal (동물명만 — 한자/독음은 상수)
saju.input.partner.* — title/sub, relationLabel, relations.{lovers|crush|married|friends|colleagues|family},
                      nameLabel/namePlaceholder, idolCompatBanner
saju.input.wish.*   — title/titleIdol/sub/subIdol/placeholder/placeholderIdol/skip
saju.input.seal.*   — title/sub, rows.{target|name|gender|birth|purpose|partner|wish}, edit,
                      genderDisplay.{male=건명(乾命)|female=곤명(坤命)|other}, timeUnknownDisplay, submit
saju.input.nav.*    — next 라벨들(toPurpose/toBirth/toPartner/toWish/toSeal), prev
saju.analyzing.*    — headline/headlineIdol, headlineLate, subLate, quotes[9], knots.{calc|read|blend}, eta
saju.result.*       — 장별 정적 카피: s0.headline/headlineIdol/headlineNoHour, s1.kicker/headline/pillarLabels,
                      s2.kicker/headline/headlineIdol, s3.kicker/headline/dominantChip/lackingChip,
                      s4.kicker, s4.compat.{scoreSuffix|harmonyTitle|frictionTitle|perfumeBasisNote},
                      s5.kicker/headline/headlineIdol/transition("이 기운은, 향이 될 수 있습니다."),
                      s6.kicker/whyTitle/noteTiers.{top|middle|base}(겉기운/중심기운/뿌리기운),
                      s7.kicker/headline/rows.{time|season|flow}/closing/closingIdol,
                      bottomActions.* (기존 키 재사용 우선 — 신규는 여기)
saju.landing/seo    — program-seo.ts 5로케일(별도 파일 계약)
```

- **AI 생성(번역 파이프라인 통과, i18n 키 아님):** `sajuAnalysis` 전 필드 + `matchingPerfumes[0]` 파생 텍스트. `/api/translate/image-result` 필드 화이트리스트에 `sajuAnalysis` 트리 추가 + `protectedNames`에 이름·한자 병기 보호(정규식 `[一-鿿()]` 구간 비번역) 요구 — 프롬프트/API 에이전트 몫이지만 **한자 보존은 디자인 요건**임을 여기 명시한다.
- 로케일 전환 스냅숏: `useLocaleSwitchState` storageKey §3.0 — 파일럿 키와 충돌 금지.

---

## 9. 구현 에이전트 배정 힌트 (참고)

| 영역 | 이 문서 섹션 |
|---|---|
| 디자인 토큰/globals.css/폰트 | §1 |
| 공통 컴포넌트 8종 | §2 |
| 입력 위저드 6페이즈 + 훅 | §3 |
| 로딩 오버레이 | §4 |
| 결과 S0~S3 | §5.1~5.4 |
| 결과 S4(+궁합)~S8 | §5.5~5.8 |
| 랜딩 | §6 |
| 인쇄 보고서 + SVG 2종 | §7 |
| i18n 5로케일 | §8 |

> 완성 정의: §1.0 금지 목록 위반 0건 · §5.9/§7 클램프 전 슬롯 적용 · reduced-motion 폴백 전 섹션 동작 · 455px 셸/하단 바 계약 무손상.
