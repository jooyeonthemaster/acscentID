/**
 * 피드백 기능 타입 정의
 * AC'SCENT IDENTITY - 커스텀 레시피 생성을 위한 피드백 시스템
 */

// ============================================
// 카테고리 선호도 타입
// ============================================

export type CategoryPreference = 'increase' | 'decrease' | 'maintain'

export interface CategoryPreferences {
  citrus: CategoryPreference
  floral: CategoryPreference
  woody: CategoryPreference
  musky: CategoryPreference
  fruity: CategoryPreference
  spicy: CategoryPreference
}

// 기본 카테고리 선호도
export const DEFAULT_CATEGORY_PREFERENCES: CategoryPreferences = {
  citrus: 'maintain',
  floral: 'maintain',
  woody: 'maintain',
  musky: 'maintain',
  fruity: 'maintain',
  spicy: 'maintain',
}

// 카테고리 정보 (라벨, 아이콘, 색상)
export const FEEDBACK_CATEGORY_INFO: Record<
  keyof CategoryPreferences,
  {
    label: string
    icon: string
    color: string
    gradient: string
  }
> = {
  citrus: {
    label: '시트러스',
    icon: '🍋',
    color: 'yellow',
    gradient: 'from-yellow-400 to-orange-400',
  },
  floral: {
    label: '플로럴',
    icon: '🌸',
    color: 'pink',
    gradient: 'from-pink-400 to-rose-400',
  },
  woody: {
    label: '우디',
    icon: '🌳',
    color: 'amber',
    gradient: 'from-amber-600 to-yellow-700',
  },
  musky: {
    label: '머스크',
    icon: '✨',
    color: 'purple',
    gradient: 'from-purple-400 to-indigo-400',
  },
  fruity: {
    label: '프루티',
    icon: '🍎',
    color: 'red',
    gradient: 'from-red-400 to-pink-400',
  },
  spicy: {
    label: '스파이시',
    icon: '🌶️',
    color: 'orange',
    gradient: 'from-orange-500 to-red-500',
  },
}

// ============================================
// 특정 향료 선택 타입
// ============================================

export interface SpecificScent {
  id: string // "AC'SCENT 01" 형식
  name: string // "블랙베리"
  ratio: number // 0-100 (퍼센트)
}

// ============================================
// 피드백 데이터 타입
// ============================================

// [FIX] CRITICAL #13: chemistry_role 필드 추가 (기존 호환 유지, optional)
export type ChemistryRole = 'character_a' | 'character_b' | null

export interface PerfumeFeedback {
  perfumeId: string
  perfumeName: string
  retentionPercentage: number // 0-100
  categoryPreferences: CategoryPreferences
  specificScents: SpecificScent[]
  notes?: string
  naturalLanguageFeedback?: string // 자연어 피드백 (Step 3, 선택사항)
  chemistryRole?: ChemistryRole // 케미 프로그램에서의 역할 (A 또는 B)
}

// 피드백 초기값
export const createInitialFeedback = (
  perfumeId: string,
  perfumeName: string
): PerfumeFeedback => ({
  perfumeId,
  perfumeName,
  retentionPercentage: 0,
  categoryPreferences: { ...DEFAULT_CATEGORY_PREFERENCES },
  specificScents: [],
  notes: '',
  naturalLanguageFeedback: '',
})

// ============================================
// 레시피 선택 타입
// ============================================

export type SelectedRecipeType = 'user_direct' | 'ai_recommended' | 'original'

export const SELECTED_RECIPE_TYPE_LABELS: Record<SelectedRecipeType, string> = {
  user_direct: '직접 선택',
  ai_recommended: 'AI 추천',
  original: '원본 유지',
}

// ============================================
// 듀얼 레시피 타입 (1안: 직접선택, 2안: AI추천)
// ============================================

export interface DualRecipeResult {
  userDirectRecipe: GeneratedRecipe    // 사용자 직접 선택 (AI 추가 없음)
  aiRecommendedRecipe: GeneratedRecipe | null  // AI 추천 (실패 시 null)
}

// ============================================
// 생성된 레시피 타입
// ============================================

export interface RecipeGranule {
  id: string // "AC'SCENT 05"
  name: string // "비터 오렌지"
  mainCategory: string // "citrus", "floral" 등
  drops: number // 1-10
  ratio: number // 퍼센트
  reason: string // 선택 이유 (주접 스타일)
  fanComment: string // 팬 코멘트 (광기 스타일)
}

export interface CategoryChange {
  category: string
  change: 'increased' | 'decreased' | 'maintained'
  originalScore: number // 원본 향수의 카테고리 점수 (0-100)
  newScore: number // 새 레시피의 카테고리 점수 (0-100)
  reason: string // 팬 스타일 설명
}

export interface TestingInstructions {
  step1: string
  step2: string
  step3: string
  caution: string
}

export interface GeneratedRecipe {
  granules: RecipeGranule[]
  overallExplanation: string // 전체 레시피 설명 (주접+광기)
  categoryChanges: CategoryChange[]
  testingInstructions: TestingInstructions
  fanMessage: string // 마지막 응원 메시지 (광기 모드)
  totalDrops: number
  estimatedStrength: 'light' | 'medium' | 'strong'
}

// ============================================
// 데이터베이스 레코드 타입
// ============================================

export interface FeedbackRecord {
  id: string
  createdAt: string
  resultId: string | null
  perfumeId: string
  perfumeName: string
  retentionPercentage: number
  categoryPreferences: CategoryPreferences
  specificScents: SpecificScent[]
  notes?: string
  generatedRecipe: GeneratedRecipe | null
  userFingerprint?: string
  naturalLanguageFeedback?: string
  selectedRecipeType?: SelectedRecipeType
}

// Supabase Row 타입 (snake_case)
export interface FeedbackRow {
  id: string
  created_at: string
  result_id: string | null
  perfume_id: string
  perfume_name: string
  retention_percentage: number
  category_preferences: CategoryPreferences
  specific_scents: SpecificScent[]
  notes: string | null
  generated_recipe: GeneratedRecipe | null
  user_fingerprint: string | null
  natural_language_feedback: string | null
  selected_recipe_type: SelectedRecipeType | null
}

// Row → Record 변환 함수
export function transformFeedbackRow(row: FeedbackRow): FeedbackRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    resultId: row.result_id,
    perfumeId: row.perfume_id,
    perfumeName: row.perfume_name,
    retentionPercentage: row.retention_percentage,
    categoryPreferences: row.category_preferences,
    specificScents: row.specific_scents || [],
    notes: row.notes || undefined,
    generatedRecipe: row.generated_recipe,
    userFingerprint: row.user_fingerprint || undefined,
    naturalLanguageFeedback: row.natural_language_feedback || undefined,
    selectedRecipeType: row.selected_recipe_type || undefined,
  }
}

// ============================================
// 폼 상태 타입
// ============================================

export interface FeedbackFormState {
  step: number // 1-4 (3 입력 단계 + 성공)
  feedback: PerfumeFeedback
  recipe: GeneratedRecipe | null
  isSubmitting: boolean
  isGenerating: boolean
  error: string | null
}

// ============================================
// 추천 향수 비율 메시지
// ============================================

export const RETENTION_MESSAGES = [
  { max: 20, emoji: '🌱', text: '추천 향은 살짝만! 새로운 향으로 변신해볼까요?' },
  { max: 40, emoji: '🎨', text: '추천 향을 베이스로 새로운 조합 도전!' },
  { max: 60, emoji: '⚖️', text: '추천 향과 새 향을 반반! 밸런스 조합!' },
  { max: 80, emoji: '💕', text: '추천 향 많이! 살짝만 변화 줄게요' },
  { max: 100, emoji: '✨', text: '추천 향 100%! 완벽해서 안 바꿀래요!' },
] as const

export function getRetentionMessage(retention: number) {
  return (
    RETENTION_MESSAGES.find((m) => retention <= m.max) ||
    RETENTION_MESSAGES[RETENTION_MESSAGES.length - 1]
  )
}

// ============================================
// 케미 (2향수) 취향 반영 시스템
// ============================================

// 향 계열 3상태: 미선택 / 좋아요 / 싫어요
export type ScentPreference = 'none' | 'like' | 'dislike'

// 향 존재감 강도
export type ScentIntensity = 'subtle' | 'moderate' | 'bold'

// 향 계열 정보 (UI 표시용)
export interface ScentFamilyInfo {
  id: string
  label: string
  emoji: string
  description: string
  examples: string
}

export const SCENT_FAMILIES: ScentFamilyInfo[] = [
  { id: 'citrus', label: '시트러스', emoji: '🍋', description: '상큼한 과일 껍질 향', examples: '레몬, 자몽, 오렌지, 베르가못' },
  { id: 'floral', label: '플로럴', emoji: '🌸', description: '우아한 꽃향기', examples: '장미, 자스민, 라벤더, 은방울꽃' },
  { id: 'woody', label: '우디', emoji: '🌳', description: '나무와 숲의 향', examples: '백단향, 편백나무, 시더우드' },
  { id: 'musky', label: '머스크', emoji: '✨', description: '은은하고 포근한 향', examples: '깨끗한 비누, 섬유유연제, 파우더' },
  { id: 'fruity', label: '프루티', emoji: '🍎', description: '달콤한 과일 향', examples: '딸기, 복숭아, 사과, 블랙베리' },
  { id: 'spicy', label: '스파이시', emoji: '🌶️', description: '매콤하고 따뜻한 향', examples: '시나몬, 후추, 정향, 생강' },
]

// 케미 취향 반영 데이터
export interface ChemistryTasteData {
  sessionId: string
  // 향 존재감
  intensity: ScentIntensity
  // 추가 요청 (자유 텍스트)
  freeText: string
}

// 케미 레시피 결과 (A + B 각 2안씩)
export interface ChemistryRecipeResult {
  recipeA1: GeneratedRecipe
  recipeA2: GeneratedRecipe
  recipeB1: GeneratedRecipe
  recipeB2: GeneratedRecipe
  layeringNote: string
  pairExplanation: string
}

// ============================================
// API 응답 타입
// ============================================

export interface FeedbackSaveResponse {
  success: boolean
  id?: string
  createdAt?: string
  error?: string
}

export interface FeedbackListResponse {
  success: boolean
  feedbacks?: FeedbackRecord[]
  error?: string
}

export interface RecipeGenerationResponse {
  success: boolean
  recipe?: GeneratedRecipe
  error?: string
}

// ============================================
// 레시피 확정 (용량별 계산) 타입
// ============================================

export type ProductType = 'perfume_10ml' | 'perfume_50ml' | 'diffuser_5ml'

export interface ProductTypeInfo {
  id: ProductType
  label: string
  totalVolumeMl: number // 전체 용량
  fragranceVolumeMl: number // 향료 용량
  icon: string
  description: string
}

export const PRODUCT_TYPES: ProductTypeInfo[] = [
  {
    id: 'perfume_10ml',
    label: '퍼퓸 10ml',
    totalVolumeMl: 10,
    fragranceVolumeMl: 2,
    icon: '🧴',
    description: '휴대용 미니 사이즈',
  },
  {
    id: 'perfume_50ml',
    label: '퍼퓸 50ml',
    totalVolumeMl: 50,
    fragranceVolumeMl: 10,
    icon: '🍾',
    description: '풀사이즈 정품',
  },
  {
    id: 'diffuser_5ml',
    label: '디퓨저 5ml',
    totalVolumeMl: 5,
    fragranceVolumeMl: 5,
    icon: '🌿',
    description: '방향제용 디퓨저',
  },
]

export interface GranuleAmount {
  id: string
  name: string
  ratio: number // 퍼센트
  amountMl: number // ml 단위
  amountG: number // g 단위 (밀도 0.9 기준)
}

export interface ConfirmedRecipe {
  productType: ProductType
  totalFragranceMl: number
  granules: GranuleAmount[]
  recipe: GeneratedRecipe
  confirmedAt: string
}

// 비율 → 실제 용량 계산 함수
export function calculateGranuleAmounts(
  recipe: GeneratedRecipe,
  productType: ProductType
): GranuleAmount[] {
  const productInfo = PRODUCT_TYPES.find((p) => p.id === productType)
  if (!productInfo) return []

  const totalFragranceMl = productInfo.fragranceVolumeMl
  const DENSITY = 0.9 // 향료 밀도 (g/ml)

  return recipe.granules.map((granule) => {
    const amountMl = (granule.ratio / 100) * totalFragranceMl
    const amountG = amountMl * DENSITY

    return {
      id: granule.id,
      name: granule.name,
      ratio: granule.ratio,
      amountMl: Math.round(amountMl * 100) / 100, // 소수점 둘째자리
      amountG: Math.round(amountG * 100) / 100,
    }
  })
}
