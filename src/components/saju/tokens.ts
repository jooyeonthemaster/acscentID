// ============================================================
// 사주 분석 퍼퓸 — 디자인 토큰 (JS 상수)
// SSOT: docs/saju/UI-SPEC.md §1 (팔레트/이징/듀레이션) + §2 (공통 상수)
// 타입 계약: src/types/analysis.ts 의 SajuElement / SAJU_ELEMENT_INFO 를
// 절대 재정의하지 않고 그대로 가져와 파생한다.
// ============================================================

import { SAJU_ELEMENT_INFO, type SajuElement } from '@/types/analysis';

export type { SajuElement };

// ---------- 이징 (framer-motion ease 배열 / CSS cubic-bezier) ----------
export type SajuEase = [number, number, number, number];

/** 기본 등장/이동 — 기존 리포 이징과 동일 */
export const SAJU_EASE_INK: SajuEase = [0.22, 1, 0.36, 1];
/** 획 드로잉, 족자 말림, 스크롤 연동 보간 */
export const SAJU_EASE_BRUSH: SajuEase = [0.65, 0, 0.35, 1];
/** 무거운 것이 내려앉음(패 착지, 도장 찍힘) */
export const SAJU_EASE_SETTLE: SajuEase = [0.16, 1, 0.3, 1];

// ---------- 듀레이션 스케일 (초) ----------
export const SAJU_DURATION = {
  /** 미세 피드백: 탭 하이라이트, 칩 선택 */
  fast: 0.3,
  /** 요소 등장 */
  base: 0.8,
  /** 패 플립, 카드 전환 */
  slow: 1.4,
  /** 점화, 리빌, 족자 */
  ceremony: 2.4,
} as const;

/** 패 플립 스태거 간격(초) — 고정 순서: 년간→년지→월간→월지→일간→일지→시간→시지 */
export const SAJU_GANJI_FLIP_INTERVAL = 0.15;

/** whileInView 공통 뷰포트 옵션 (§2.10 — IntersectionObserver 직접 사용 금지, 일원화) */
export const SAJU_VIEWPORT = { once: true, margin: '-15% 0px' } as const;

// ---------- 팔레트 (globals.css --saju-* 와 동일 값의 JS 미러) ----------
export const SAJU_PALETTE = {
  /* 지면 */
  ink: '#0C0E16',
  inkSoft: '#12141D',
  inkLine: '#262A38',
  hanji: '#F5EFE2',
  hanjiDeep: '#EDE5D2',
  hanjiLine: '#D8CFBB',
  /* 잉크(텍스트) */
  textOnDark: '#E9E2D0',
  textOnDarkMuted: '#A69F8D',
  textOnCream: '#1A1610',
  textOnCreamMuted: '#5C564A',
  blueInk: '#2C3E50',
  /* 주사(辰砂) */
  cinnabar: '#C0392B',
  cinnabarDeep: '#A93226',
  cinnabarBright: '#E2604E',
  /** 주사 도장밥 — SealStamp 전용(cinnabar보다 한 단계 깊음) */
  sealPaste: '#B03325',
  /* 금박 */
  gold: '#C9A227',
  goldBright: '#E8C766',
  goldPale: '#F2DA8A',
  goldDeep: '#8A6D1F',
  goldTextCream: '#7A5C14',
  /* 죽은 노드(부족 오행) 면 */
  deadNode: '#1E2129',
  /* unknown(시간모름) 액센트 바 */
  unknownBar: '#8B8578',
} as const;

// ---------- 금박 그라데이션 (SSOT 스탑 — 텍스트 클립·괘선·실 공용) ----------
export const SAJU_GOLD_STOPS = [
  { offset: '0%', color: '#8A6D1F' },
  { offset: '22%', color: '#C9A227' },
  { offset: '50%', color: '#F2DA8A' },
  { offset: '62%', color: '#E8C766' },
  { offset: '80%', color: '#C9A227' },
  { offset: '100%', color: '#8A6D1F' },
] as const;

/** CSS background 용 105deg 금박 그라데이션 */
export const SAJU_GOLD_GRADIENT =
  'linear-gradient(105deg, #8A6D1F 0%, #C9A227 22%, #F2DA8A 50%, #E8C766 62%, #C9A227 80%, #8A6D1F 100%)';

// ---------- 폰트 ----------
/** 인라인 style 용 세리프 스택 (클래스는 `font-serif-kr` 유틸리티 사용) */
export const SAJU_FONT_SERIF = "var(--font-noto-serif-kr), 'Noto Serif KR', serif";
/** 숫자·라틴 전용 (Outfit — §1.2 폰트 배분 규칙) */
export const SAJU_FONT_SANS = 'var(--font-outfit)';

// ---------- 오행 메타 (SAJU_ELEMENT_INFO 파생 — 색 SSOT는 타입 계약) ----------
export interface SajuElementMeta {
  hanja: string;
  ko: SajuElement;
  /** 면(fill)·도트·패 액센트 전용 — 텍스트 금지 */
  fill: string;
  /** on-dark 텍스트/라벨 */
  textOnDark: string;
  /** on-cream 텍스트/라벨 */
  textOnCream: string;
  noteFamily: string;
}

function deriveMeta(el: SajuElement): SajuElementMeta {
  const info = SAJU_ELEMENT_INFO[el];
  return {
    hanja: info.hanja,
    ko: el,
    fill: info.color,
    textOnDark: info.onDark,
    textOnCream: info.onCream,
    noteFamily: info.noteFamily,
  };
}

export const ELEMENT_META: Record<SajuElement, SajuElementMeta> = {
  목: deriveMeta('목'),
  화: deriveMeta('화'),
  토: deriveMeta('토'),
  금: deriveMeta('금'),
  수: deriveMeta('수'),
};

/** 상생 순 (木→火→土→金→水) — ElementRing 12시 방향 木부터 시계방향 */
export const SAJU_ELEMENTS: readonly SajuElement[] = ['목', '화', '토', '금', '수'];

// ---------- 12지시 테이블 (§2 공통 상수 — 정확히 이 값) ----------
export const HOUR_BRANCHES = [
  { index: 0, ji: '자', hanja: '子', animal: '쥐', range: '23:00–00:59' },
  { index: 1, ji: '축', hanja: '丑', animal: '소', range: '01:00–02:59' },
  { index: 2, ji: '인', hanja: '寅', animal: '호랑이', range: '03:00–04:59' },
  { index: 3, ji: '묘', hanja: '卯', animal: '토끼', range: '05:00–06:59' },
  { index: 4, ji: '진', hanja: '辰', animal: '용', range: '07:00–08:59' },
  { index: 5, ji: '사', hanja: '巳', animal: '뱀', range: '09:00–10:59' },
  { index: 6, ji: '오', hanja: '午', animal: '말', range: '11:00–12:59' },
  { index: 7, ji: '미', hanja: '未', animal: '양', range: '13:00–14:59' },
  { index: 8, ji: '신', hanja: '申', animal: '원숭이', range: '15:00–16:59' },
  { index: 9, ji: '유', hanja: '酉', animal: '닭', range: '17:00–18:59' },
  { index: 10, ji: '술', hanja: '戌', animal: '개', range: '19:00–20:59' },
  { index: 11, ji: '해', hanja: '亥', animal: '돼지', range: '21:00–22:59' },
] as const;
