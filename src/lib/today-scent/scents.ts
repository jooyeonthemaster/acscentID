// ============================================================
// "오늘의 향" 데이터셋
// AC'SCENT 01~30 실제 향료 데이터(src/data/perfumes.ts) 기반으로 생성.
// 노트(탑/미들/베이스)는 앱 전체 표기와 동일하게
//   mainScent → 탑, subScent1 → 미들, subScent2 → 베이스 로 매핑.
// ============================================================

import { perfumes, type Perfume } from '@/data/perfumes'
import { getLocalizedPerfumeText } from '@/data/perfumes-i18n'
import type { Locale } from '@/i18n/config'

export interface TodayScent {
  /** URL-safe 슬러그 (예: "ac-scent-01") */
  id: string
  /** 원본 향료 ID (예: "AC'SCENT 01") */
  perfumeId: string
  emoji: string
  /** 향 이름 (예: "블랙베리") */
  name: string
  /** 한 줄 무드 카피 */
  vibe: string
  /** 향 노트 (탑/미들/베이스) */
  notes: { top: string; mid: string; base: string }
  /** 실제 향 설명 */
  description: string
  /** 키워드 3개 (해시태그용) */
  keywords: string[]
  /** 카드 테마 컬러 (카테고리 기반, 가독성 보장) */
  theme: { bg: string; accent: string; ink: string }
  /** "이 향으로 만들기" CTA 링크 */
  href: string
}

// 카테고리별 카드 테마 (파스텔 bg + 진한 ink, 항상 검은 테두리)
const THEME_BY_CATEGORY: Record<string, { bg: string; accent: string; ink: string }> = {
  citrus: { bg: '#FEF3C7', accent: '#F59E0B', ink: '#78350F' },
  floral: { bg: '#FCE7F3', accent: '#EC4899', ink: '#831843' },
  woody: { bg: '#E7D3BE', accent: '#A16207', ink: '#5C3A1E' },
  musky: { bg: '#EDE9FE', accent: '#8B5CF6', ink: '#4C1D95' },
  fruity: { bg: '#FFE4E6', accent: '#F43F5E', ink: '#881337' },
  spicy: { bg: '#FFEDD5', accent: '#EA580C', ink: '#7C2D12' },
}

// 카테고리별 이모지 (analysis.ts CATEGORY_INFO 와 동일)
const EMOJI_BY_CATEGORY: Record<string, string> = {
  citrus: '🍋',
  floral: '🌸',
  woody: '🌳',
  musky: '✨',
  fruity: '🍎',
  spicy: '🌶️',
}

// 향 자체를 나타내는 이모지 — 카테고리 이모지만 쓰면 블랙베리·스트로베리가 🍎, 바다소금이 🍋처럼 어긋난다.
// 오래된 기기에서 깨지는 최신 이모지(🪻 등)는 쓰지 않는다.
const EMOJI_BY_PERFUME: Record<string, string> = {
  "AC'SCENT 01": '🫐', // 블랙베리
  "AC'SCENT 02": '🍊', // 만다린 오렌지
  "AC'SCENT 03": '🍓', // 스트로베리
  "AC'SCENT 04": '🍋', // 베르가못
  "AC'SCENT 05": '🍊', // 비터 오렌지
  "AC'SCENT 06": '🥕', // 캐럿
  "AC'SCENT 07": '🌹', // 로즈
  "AC'SCENT 08": '🌼', // 튜베로즈
  "AC'SCENT 09": '🌸', // 오렌지 블라썸
  "AC'SCENT 10": '🌷', // 튤립
  "AC'SCENT 11": '🍋', // 라임
  "AC'SCENT 12": '🌼', // 은방울꽃
  "AC'SCENT 13": '🍋', // 유자
  "AC'SCENT 14": '🌿', // 민트
  "AC'SCENT 15": '🌿', // 페티그레인
  "AC'SCENT 16": '🪵', // 샌달우드
  "AC'SCENT 17": '🌶️', // 레몬페퍼
  "AC'SCENT 18": '🌶️', // 핑크페퍼
  "AC'SCENT 19": '🌊', // 바다소금
  "AC'SCENT 20": '🌿', // 타임
  "AC'SCENT 21": '✨', // 머스크
  "AC'SCENT 22": '🤍', // 화이트로즈
  "AC'SCENT 23": '🧥', // 스웨이드
  "AC'SCENT 24": '🍊', // 이탈리안만다린
  "AC'SCENT 25": '💜', // 라벤더
  "AC'SCENT 26": '🌲', // 이탈리안사이프러스
  "AC'SCENT 27": '🪵', // 스모키 블렌드 우드
  "AC'SCENT 28": '👜', // 레더
  "AC'SCENT 29": '💐', // 바이올렛
  "AC'SCENT 30": '🍃', // 무화과
}

const FALLBACK_THEME = { bg: '#FEF3C7', accent: '#F59E0B', ink: '#78350F' }

/** "AC'SCENT 01" → "ac-scent-01" */
function slugify(perfumeId: string): string {
  return perfumeId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toTodayScent(p: Perfume): TodayScent {
  const id = slugify(p.id)
  return {
    id,
    perfumeId: p.id,
    emoji: EMOJI_BY_PERFUME[p.id] ?? EMOJI_BY_CATEGORY[p.category] ?? '🌸',
    name: p.name,
    vibe: p.mood,
    notes: {
      top: p.mainScent.name,
      mid: p.subScent1.name,
      base: p.subScent2.name,
    },
    description: p.description,
    keywords: p.keywords.slice(0, 3),
    theme: THEME_BY_CATEGORY[p.category] ?? FALLBACK_THEME,
    href: `/programs/today-scent?scent=${id}`,
  }
}

// AC'SCENT 01~30 전체를 오늘의 향 풀로 사용
export const TODAY_SCENTS: TodayScent[] = perfumes.map(toTodayScent)

export const TODAY_SCENT_COUNT = TODAY_SCENTS.length

export function getScentById(id: string): TodayScent | undefined {
  return TODAY_SCENTS.find((s) => s.id === id)
}

/**
 * 화면 표시용 번역 (ko는 원본). 해당 언어 번역이 없으면 영어로 대체한다.
 * 주문·장바구니에 저장하는 이름은 운영 일관성을 위해 원본(한국어)을 그대로 쓴다.
 */
export function localizeTodayScent(scent: TodayScent, locale: Locale): TodayScent {
  if (locale === 'ko') return scent
  const text = getLocalizedPerfumeText(scent.perfumeId, locale) ?? getLocalizedPerfumeText(scent.perfumeId, 'en')
  if (!text) return scent
  return {
    ...scent,
    name: text.name,
    vibe: text.mood,
    description: text.description,
    notes: { top: text.mainScent, mid: text.subScent1, base: text.subScent2 },
    keywords: text.keywords.slice(0, 3),
  }
}
