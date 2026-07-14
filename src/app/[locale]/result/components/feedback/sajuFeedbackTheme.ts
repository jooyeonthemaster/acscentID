// ============================================================
// 사주 피드백 스킨 — 사주 처방전(한지) 위 피드백/레시피 플로우
// 팔레트 SSOT: src/components/saju/tokens.ts / globals.css --saju-*
// 컨셉: 먹색 페이지 위로 한지 시트가 올라오고, 금박 진행바·주사(辰砂) CTA·
//       세리프 제목·한자 낙관으로 이미지 프로그램과 다른 결을 만든다.
// 규칙: 구조(간격/라운드/레이아웃) 클래스는 각 컴포넌트에 남기고,
//       여기에는 색·타이포 계열 클래스만 둔다.
// ============================================================

import { useMessages, useTranslations } from 'next-intl'

/** 피드백 플로우 스킨 — 'default'는 기존 이미지 프로그램 스타일 그대로 */
export type FeedbackTheme = 'default' | 'saju'

/**
 * feedback 네임스페이스 번역 — 사주 테마면 `saju` 접두 키(sajuXxx)가 존재할 때 우선 사용.
 * 예: t('step1Subtitle') → feedback.sajuStep1Subtitle 이 있으면 그 값(근엄한 어조), 없으면 기존 키로 폴백.
 * 근엄한 어조가 필요한 문구만 saju* 키를 추가하면 되고, 호출부 분기가 필요 없다.
 */
export function useFeedbackTranslations(theme: FeedbackTheme = 'default') {
  const t = useTranslations('feedback')
  const messages = useMessages() as { feedback?: Record<string, unknown> } | undefined
  const fb = messages?.feedback ?? {}
  if (theme !== 'saju') return t

  const call = t as unknown as (key: string, params?: Record<string, unknown>) => string
  const wrapped = (key: string, params?: Record<string, unknown>) => {
    const sajuKey = `saju${key.charAt(0).toUpperCase()}${key.slice(1)}`
    return call(typeof fb[sajuKey] === 'string' ? sajuKey : key, params)
  }
  return wrapped as unknown as typeof t
}

/** 스텝 낙관 한자 (default 테마의 이모지 STEP_ICONS 대응: 유지율 → 향료 → 사연 → 완성) */
export const SAJU_STEP_HANJA = ['留', '香', '言', '成'] as const

/** Step1 유지율 구간 한자 (default 테마의 이모지 대응: 새조합 → 변화 → 균형 → 조화 → 지킴) */
export const SAJU_RETENTION_HANJA = ['新', '變', '均', '和', '守'] as const

export const SJ = {
  /* ---------- 지면 ---------- */
  /** 모달 시트 — 한지 질감(globals.css .saju-hanji) + 명조 세리프 상속 + 어절 단위 줄바꿈(break-keep) */
  sheet: 'saju-hanji font-serif-kr break-keep',
  /** 백드롭 */
  backdrop: 'bg-[#0C0E16]/75 backdrop-blur-sm',
  /** on-cream 헤어라인 */
  hairline: 'border-[#D8CFBB]',
  /** 융기 카드 (기존 bg-white 카드 대응) */
  card: 'bg-[#FDFAF1] border-[#D8CFBB]',
  /** 음영 패널 (기존 slate-50/amber-50 계열 정보 박스 대응) */
  cardSoft: 'bg-[#EDE5D2] border-[#D8CFBB]',
  /** 금 하이라이트 패널 (선택/완성 상태) */
  cardGold: 'bg-[#C9A227]/12 border-[#C9A227]',
  /** 주사 경고 패널 */
  cardCinnabar: 'bg-[#C0392B]/8 border-[#C0392B]/40',

  /* ---------- 잉크(텍스트) ---------- */
  ink: 'text-[#1A1610]',
  inkMuted: 'text-[#5C564A]',
  inkFaint: 'text-[#8B8578]',
  blueInk: 'text-[#2C3E50]',
  goldText: 'text-[#7A5C14]',
  cinnabarText: 'text-[#A93226]',
  /** 세리프 제목 */
  serif: 'font-serif-kr',

  /* ---------- 진행/게이지 ---------- */
  progressActive: 'bg-[#C9A227]',
  progressInactive: 'bg-[#D8CFBB]',
  trackBase: 'bg-[#D8CFBB]',
  fillGold: 'bg-[#C9A227]',
  fillBlue: 'bg-[#2C3E50]',
  fillCinnabar: 'bg-[#C0392B]',

  /* ---------- 슬라이더 (webkit/moz thumb 포함) ---------- */
  sliderThumb: `
    [&::-webkit-slider-thumb]:bg-[#F5EFE2]
    [&::-webkit-slider-thumb]:border-[#C9A227]
    [&::-webkit-slider-thumb]:shadow-[#C9A227]/30
    [&::-moz-range-thumb]:bg-[#F5EFE2]
    [&::-moz-range-thumb]:border-[#C9A227]`,

  /* ---------- 입력 ---------- */
  input:
    'bg-[#FDFAF1] border-[#D8CFBB] focus:border-[#C9A227] placeholder:text-[#8B8578] text-[#1A1610]',

  /* ---------- 버튼 ---------- */
  /** 주 CTA — 주사(확정/전진) */
  ctaCinnabar:
    'bg-[#C0392B] hover:bg-[#A93226] text-[#F5EFE2] shadow-lg shadow-[#C0392B]/25',
  /** 부 CTA — 청묵(AI/대안) */
  ctaBlueInk:
    'bg-[#2C3E50] hover:bg-[#24313F] text-[#F5EFE2] shadow-lg shadow-[#2C3E50]/25',
  /** 금 CTA — 저장/로그인 유도 */
  ctaGold:
    'bg-[#C9A227] hover:bg-[#B08E1F] text-[#1A1610] shadow-lg shadow-[#C9A227]/25',
  /** 먹 CTA — 닫기 등 중립 */
  ctaInk: 'bg-[#1A1610] hover:bg-[#2C2620] text-[#F5EFE2]',
  /** 아웃라인 (한지 위) */
  ctaOutline: 'border-[#D8CFBB] text-[#1A1610] bg-transparent hover:bg-[#EDE5D2]',
  /** 비활성 */
  ctaDisabled: 'bg-[#D8CFBB] text-[#5C564A] cursor-not-allowed',
  /** 아이콘 버튼 hover */
  iconHover: 'hover:bg-[#EDE5D2]',

  /* ---------- 칩/뱃지 ---------- */
  chipGold: 'bg-[#C9A227]/15 text-[#7A5C14]',
  chipSoft: 'bg-[#EDE5D2] text-[#5C564A]',
  chipCinnabar: 'bg-[#C0392B]/10 text-[#A93226]',
  chipBlue: 'bg-[#2C3E50]/10 text-[#2C3E50]',
} as const

/** 스텝 낙관 타일 — 이모지 대신 쓰는 한자 도장 틀 (주사 테두리 + 세리프) */
export const SJ_SEAL_TILE =
  'flex h-9 w-9 items-center justify-center rounded-[4px] border-[1.5px] border-[#C0392B] text-[#A93226] font-serif-kr text-lg leading-none'
