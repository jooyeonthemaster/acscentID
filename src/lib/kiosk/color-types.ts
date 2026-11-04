// 키오스크 AI 퍼스널 컬러 — 8유형의 팔레트. 유형은 AI가 사진을 보고 고르지만, 색 견본은 여기 고정값을 쓴다
// (AI가 매번 다른 HEX를 지어내면 같은 유형인데 팔레트가 달라진다).

import type { PersonalColorTypeId, SeasonType, ToneType } from '@/types/analysis'

export interface PersonalColorType {
  id: PersonalColorTypeId
  season: SeasonType
  tone: ToneType
  undertone: 'warm' | 'cool'
  /** 잘 받는 색 8개 — 화면 견본·드레이프 */
  best: string[]
  /** 얼굴빛을 가라앉히는 색 4개 */
  avoid: string[]
}

export const PERSONAL_COLOR_TYPES: readonly PersonalColorType[] = [
  {
    id: 'spring-light', season: 'spring', tone: 'light', undertone: 'warm',
    best: ['#FFD9B8', '#FFB7A5', '#FFC8D2', '#FFF0B8', '#CDE8A6', '#A8E0D1', '#F7E7CE', '#F6B26B'],
    avoid: ['#1C1C1C', '#4B3A5A', '#5C5C66', '#7A1F3D'],
  },
  {
    id: 'spring-bright', season: 'spring', tone: 'bright', undertone: 'warm',
    best: ['#FF6F4E', '#FF8C42', '#FFD23F', '#7ED957', '#00C2B8', '#FF5E8A', '#FFF1D6', '#3F7FE0'],
    avoid: ['#8E8E9A', '#6B5B6E', '#2B2B33', '#9FA8B8'],
  },
  {
    id: 'summer-light', season: 'summer', tone: 'light', undertone: 'cool',
    best: ['#F4C2D7', '#D7C9F0', '#BFD9F2', '#C5E8E0', '#F9F0F5', '#E8B4C8', '#B4C7E7', '#DADCE6'],
    avoid: ['#D2691E', '#C7A008', '#000000', '#8B4513'],
  },
  {
    id: 'summer-mute', season: 'summer', tone: 'mute', undertone: 'cool',
    best: ['#B8A9C9', '#9DB4C0', '#C9A9A6', '#A3B5A6', '#8E9AAF', '#D8C4CC', '#7D8CA3', '#E5E0E6'],
    avoid: ['#FF6A00', '#FFD400', '#00B140', '#111111'],
  },
  {
    id: 'autumn-mute', season: 'autumn', tone: 'mute', undertone: 'warm',
    best: ['#C9A27E', '#B5A27A', '#A67B5B', '#8A9A5B', '#D4A373', '#C08A7A', '#7F8F8A', '#EDE0C8'],
    avoid: ['#FF2E93', '#1E90FF', '#FFFFFF', '#000000'],
  },
  {
    id: 'autumn-deep', season: 'autumn', tone: 'deep', undertone: 'warm',
    best: ['#7B3F00', '#A0522D', '#B7410E', '#556B2F', '#8B1E2D', '#C68E17', '#1F4E4A', '#3B2F2F'],
    avoid: ['#F4C2D7', '#BFD9F2', '#D7C9F0', '#E6E6FA'],
  },
  {
    id: 'winter-bright', season: 'winter', tone: 'bright', undertone: 'cool',
    best: ['#E4007C', '#0047FF', '#00A86B', '#FFFFFF', '#111111', '#FF1744', '#7C3AED', '#00E5FF'],
    avoid: ['#C9A27E', '#D2691E', '#B5A27A', '#F5DEB3'],
  },
  {
    id: 'winter-deep', season: 'winter', tone: 'deep', undertone: 'cool',
    best: ['#0B1F4B', '#4A0E2E', '#0F3D3E', '#2D1B4E', '#111111', '#8B0A1A', '#F5F5F7', '#5A5F6B'],
    avoid: ['#FFB347', '#F5DEB3', '#FFD9A0', '#C8E6A0'],
  },
]

export const PERSONAL_COLOR_TYPE_IDS = PERSONAL_COLOR_TYPES.map((t) => t.id)

export function personalColorType(id: PersonalColorTypeId): PersonalColorType {
  return PERSONAL_COLOR_TYPES.find((t) => t.id === id) ?? PERSONAL_COLOR_TYPES[0]
}

/** 계절마다 없는 톤을 가장 가까운 유형으로 — AI가 'spring-deep' 처럼 표에 없는 조합을 내놓을 때 */
const TONE_FALLBACK: Record<SeasonType, Partial<Record<ToneType, ToneType>>> = {
  spring: { mute: 'light', deep: 'bright' },
  summer: { bright: 'light', deep: 'mute' },
  autumn: { light: 'mute', bright: 'deep' },
  winter: { light: 'bright', mute: 'deep' },
}

/** 'spring-light' · { season, tone } 어느 쪽으로 와도 8유형 중 하나로 맞춘다. 알 수 없으면 null */
export function normalizeColorTypeId(raw: unknown, season?: unknown, tone?: unknown): PersonalColorTypeId | null {
  const text = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/[\s_]+/g, '-') : ''
  if ((PERSONAL_COLOR_TYPE_IDS as string[]).includes(text)) return text as PersonalColorTypeId
  const [s, t] = text.includes('-') ? text.split('-') : [String(season ?? '').toLowerCase(), String(tone ?? '').toLowerCase()]
  if (!(s in TONE_FALLBACK)) return null
  const fixed = TONE_FALLBACK[s as SeasonType][t as ToneType] ?? t
  const id = `${s}-${fixed}`
  return (PERSONAL_COLOR_TYPE_IDS as string[]).includes(id) ? (id as PersonalColorTypeId) : null
}

/** 배경색 위 글자색 — 견본 위에 유형 이름을 올릴 때 */
export function readableInk(hex: string): '#111111' | '#FFFFFF' {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111111' : '#FFFFFF'
}
