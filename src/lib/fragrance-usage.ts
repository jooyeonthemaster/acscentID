/**
 * 향료 소진량 계산 유틸리티
 * 데이터센터에서 향료 사용량을 추적하고 분석하기 위한 헬퍼 함수들
 */

import { perfumes } from '@/data/perfumes'
import { GeneratedRecipe, RecipeGranule } from '@/types/feedback'

// ============================================
// 타입 정의
// ============================================

export type ProgramType = 'idol_image' | 'figure' | 'graduation'

export interface FragranceUsageItem {
  id: string
  name: string
  category: string
  totalMl: number
  totalG: number
  usageCount: number
  averageRatio: number
}

export interface CategoryUsage {
  category: string
  label: string
  totalMl: number
  percentage: number
  icon: string
}

export interface ProgramUsage {
  totalMl: number
  totalG: number
  totalItems: number
  topFragrances: FragranceUsageItem[]
}

// 단일 소스 요약
export interface UsageSummary {
  totalMl: number
  totalG: number
  totalItems: number
  uniqueFragrances: number
}

// 온라인/오프라인/합계 분리 응답 구조
export interface FragranceUsageResult {
  summary: {
    online: UsageSummary
    offline: UsageSummary
    combined: UsageSummary
  }
  byFragrance: {
    online: FragranceUsageItem[]
    offline: FragranceUsageItem[]
    combined: FragranceUsageItem[]
  }
  byCategory: {
    online: CategoryUsage[]
    offline: CategoryUsage[]
    combined: CategoryUsage[]
  }
  byProgram: {
    online: Record<ProgramType, ProgramUsage>
    offline: Record<ProgramType, ProgramUsage>
    combined: Record<ProgramType, ProgramUsage>
  }
}

// 재고 관련 타입
export interface InventoryItem {
  id: string
  fragranceId: string
  fragranceName: string
  category: string
  onlineStockMl: number
  offlineStockMl: number
  totalStockMl: number
  minThresholdMl: number
  isLowStock: boolean
  usage7days?: number
  usage30days?: number
  updatedAt: string
}

export interface InventoryLog {
  id: string
  fragranceId: string
  fragranceName?: string
  changeType: 'add' | 'deduct' | 'adjust' | 'initial'
  source: 'online' | 'offline'
  changeAmountMl: number
  resultingStockMl: number
  referenceType?: 'order' | 'analysis' | 'manual'
  referenceId?: string
  note?: string
  createdAt: string
  createdBy?: string
}

export interface InventoryAlert {
  fragranceId: string
  fragranceName: string
  currentStock: number
  threshold: number
}

// ============================================
// 상수
// ============================================

// 제품 타입별 향료 용량 매핑 (ml)
export const FRAGRANCE_VOLUME_MAP: Record<string, number> = {
  // 퍼퓸
  '10ml': 2,
  '50ml': 10,
  // 디퓨저
  'set': 5,
  'diffuser': 5,
  // 기본값
  'default': 2,
}

// 프로그램 타입 매핑
export const PROGRAM_TYPE_MAP: Record<string, ProgramType> = {
  'image_analysis': 'idol_image',
  'idol_image': 'idol_image',
  'figure_diffuser': 'figure',
  'figure': 'figure',
  'graduation': 'graduation',
}

// 카테고리 메타데이터
export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  citrus: { label: '시트러스', icon: '🍋' },
  floral: { label: '플로럴', icon: '🌸' },
  woody: { label: '우디', icon: '🌳' },
  musky: { label: '머스크', icon: '✨' },
  fruity: { label: '프루티', icon: '🍎' },
  spicy: { label: '스파이시', icon: '🌶️' },
}

// 향료 밀도 (g/ml)
const FRAGRANCE_DENSITY = 0.9

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 향수 이름으로 향료 ID 찾기
 */
export function getPerfumeIdByName(perfumeName: string): string | null {
  const perfume = perfumes.find(
    (p) => p.name === perfumeName || p.id === perfumeName
  )
  return perfume?.id || null
}

/**
 * 향료 ID로 향수 정보 찾기
 */
export function getPerfumeById(id: string) {
  return perfumes.find((p) => p.id === id) || null
}

/**
 * 제품 사이즈에서 향료 용량 추출
 */
export function getFragranceVolume(productType: string, size: string): number {
  // 디퓨저인 경우
  if (productType?.includes('diffuser') || productType?.includes('figure')) {
    return FRAGRANCE_VOLUME_MAP['diffuser']
  }

  // 사이즈 문자열에서 용량 추출 (예: "50ml" → 10)
  if (size?.includes('50')) {
    return FRAGRANCE_VOLUME_MAP['50ml']
  }
  if (size?.includes('10')) {
    return FRAGRANCE_VOLUME_MAP['10ml']
  }

  return FRAGRANCE_VOLUME_MAP['default']
}

/**
 * 프로그램 타입 정규화
 */
export function normalizeProgramType(rawType: string): ProgramType {
  return PROGRAM_TYPE_MAP[rawType] || 'idol_image'
}

// ============================================
// 레시피에서 향료 추출
// ============================================

export interface ExtractedGranule {
  id: string
  name: string
  category: string
  ratio: number
}

/**
 * GeneratedRecipe에서 향료 정보 추출
 */
export function extractGranulesFromRecipe(
  recipe: GeneratedRecipe | null
): ExtractedGranule[] {
  if (!recipe?.granules?.length) return []

  return recipe.granules.map((g: RecipeGranule) => ({
    id: g.id,
    name: g.name,
    category: g.mainCategory || getPerfumeById(g.id)?.category || 'unknown',
    ratio: g.ratio,
  }))
}

/**
 * 단일 향수 이름에서 100% 레시피 생성
 */
export function createSinglePerfumeRecipe(
  perfumeName: string
): ExtractedGranule[] {
  const perfume = perfumes.find((p) => p.name === perfumeName || p.id === perfumeName)
  if (!perfume) return []

  return [{
    id: perfume.id,
    name: perfume.name,
    category: perfume.category,
    ratio: 100,
  }]
}

// ============================================
// 소진량 계산
// ============================================

export interface UsageCalculationInput {
  granules: ExtractedGranule[]
  fragranceVolumeMl: number
  quantity: number
}

/**
 * 향료별 소진량 계산
 */
export function calculateUsage(input: UsageCalculationInput): Map<string, {
  id: string
  name: string
  category: string
  ml: number
  g: number
  ratio: number
}> {
  const { granules, fragranceVolumeMl, quantity } = input
  const result = new Map()

  for (const granule of granules) {
    const usageMl = (granule.ratio / 100) * fragranceVolumeMl * quantity
    const usageG = usageMl * FRAGRANCE_DENSITY

    const existing = result.get(granule.id)
    if (existing) {
      existing.ml += usageMl
      existing.g += usageG
    } else {
      result.set(granule.id, {
        id: granule.id,
        name: granule.name,
        category: granule.category,
        ml: usageMl,
        g: usageG,
        ratio: granule.ratio,
      })
    }
  }

  return result
}

// ============================================
// 집계 함수
// ============================================

/**
 * 향료 사용량 집계
 */
export function aggregateFragranceUsage(
  usageData: Array<{
    fragranceId: string
    fragranceName: string
    category: string
    ml: number
    g: number
    ratio: number
  }>
): FragranceUsageItem[] {
  const aggregated = new Map<string, {
    id: string
    name: string
    category: string
    totalMl: number
    totalG: number
    usageCount: number
    totalRatio: number
  }>()

  for (const item of usageData) {
    const existing = aggregated.get(item.fragranceId)
    if (existing) {
      existing.totalMl += item.ml
      existing.totalG += item.g
      existing.usageCount += 1
      existing.totalRatio += item.ratio
    } else {
      aggregated.set(item.fragranceId, {
        id: item.fragranceId,
        name: item.fragranceName,
        category: item.category,
        totalMl: item.ml,
        totalG: item.g,
        usageCount: 1,
        totalRatio: item.ratio,
      })
    }
  }

  return Array.from(aggregated.values())
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      totalMl: Math.round(item.totalMl * 100) / 100,
      totalG: Math.round(item.totalG * 100) / 100,
      usageCount: item.usageCount,
      averageRatio: Math.round((item.totalRatio / item.usageCount) * 10) / 10,
    }))
    .sort((a, b) => b.totalMl - a.totalMl)
}

/**
 * 카테고리별 사용량 집계
 */
export function aggregateCategoryUsage(
  fragranceUsage: FragranceUsageItem[]
): CategoryUsage[] {
  const categoryTotals = new Map<string, number>()
  let grandTotal = 0

  for (const item of fragranceUsage) {
    const current = categoryTotals.get(item.category) || 0
    categoryTotals.set(item.category, current + item.totalMl)
    grandTotal += item.totalMl
  }

  return Array.from(categoryTotals.entries())
    .map(([category, totalMl]) => ({
      category,
      label: CATEGORY_META[category]?.label || category,
      icon: CATEGORY_META[category]?.icon || '🎯',
      totalMl: Math.round(totalMl * 100) / 100,
      percentage: grandTotal > 0
        ? Math.round((totalMl / grandTotal) * 1000) / 10
        : 0,
    }))
    .sort((a, b) => b.totalMl - a.totalMl)
}

// ============================================
// 자연어 피드백 키워드 추출
// ============================================

const FEEDBACK_KEYWORDS = [
  // 향 느낌
  '상큼', '달콤', '무거운', '가벼운', '은은', '강렬', '부드러운', '시원한', '따뜻한',
  // 계절
  '가을', '봄', '여름', '겨울',
  // 상황
  '데이트', '출근', '파티', '일상', '여행', '운동',
  // 카테고리
  '플로럴', '우디', '시트러스', '머스크', '프루티', '스파이시',
  // 분위기
  '세련된', '로맨틱', '섹시', '청순', '고급스러운', '캐주얼',
  // 기타
  '향이 오래', '잔향', '지속', '발향', '확산',
]

/**
 * 자연어 피드백에서 키워드 추출
 */
export function extractKeywordsFromFeedback(text: string): string[] {
  if (!text) return []
  return FEEDBACK_KEYWORDS.filter((kw) => text.includes(kw))
}

/**
 * 키워드 빈도 집계
 */
export function aggregateKeywords(
  feedbacks: string[]
): Array<{ keyword: string; count: number }> {
  const counts = new Map<string, number>()

  for (const feedback of feedbacks) {
    const keywords = extractKeywordsFromFeedback(feedback)
    for (const kw of keywords) {
      counts.set(kw, (counts.get(kw) || 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
}
