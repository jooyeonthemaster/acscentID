'use client'

import { useState, useCallback } from 'react'
import {
  PerfumeFeedback,
  GeneratedRecipe,
  CategoryPreferences,
  SpecificScent,
  createInitialFeedback,
  RecipeGranule,
} from '@/types/feedback'
import { ScentCategoryScores } from '@/types/analysis'
import { getPerfumeById } from '@/data/perfumes'

interface UseFeedbackFormProps {
  perfumeId: string
  perfumeName: string
  perfumeCharacteristics: ScentCategoryScores
  perfumeCategory: string
  resultId?: string
  characterName?: string // 분석된 캐릭터 이름
}

interface UseFeedbackFormReturn {
  // 상태
  step: number
  feedback: PerfumeFeedback
  userDirectRecipe: GeneratedRecipe | null // 1안: 사용자 직접 선택
  aiRecommendedRecipe: GeneratedRecipe | null // 2안: AI 추천
  isSubmitting: boolean
  isGenerating: boolean
  error: string | null

  // 액션
  updateFeedback: (partial: Partial<PerfumeFeedback>) => void
  updateRetention: (percentage: number) => void
  updateCategoryPreference: (
    category: keyof CategoryPreferences,
    value: CategoryPreferences[keyof CategoryPreferences]
  ) => void
  addSpecificScent: (scent: SpecificScent) => boolean
  removeSpecificScent: (scentId: string) => void
  updateScentRatio: (scentId: string, ratio: number) => void
  nextStep: () => void
  prevStep: () => void
  submit: () => Promise<void>
  reset: () => void
  clearError: () => void
}

/**
 * 사용자 fingerprint 생성/조회
 */
function getOrCreateFingerprint(): string {
  if (typeof window === 'undefined') return ''

  let fp = localStorage.getItem('user_fingerprint')
  if (!fp) {
    fp = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('user_fingerprint', fp)
  }
  return fp
}

export function useFeedbackForm({
  perfumeId,
  perfumeName,
  perfumeCharacteristics,
  perfumeCategory,
  resultId,
  characterName,
}: UseFeedbackFormProps): UseFeedbackFormReturn {
  // 폼 상태
  const [step, setStep] = useState(1)
  const [feedback, setFeedback] = useState<PerfumeFeedback>(() =>
    createInitialFeedback(perfumeId, perfumeName)
  )
  const [userDirectRecipe, setUserDirectRecipe] = useState<GeneratedRecipe | null>(null)
  const [aiRecommendedRecipe, setAiRecommendedRecipe] = useState<GeneratedRecipe | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 사용자 직접 선택 레시피 생성 (클라이언트 사이드, AI 호출 X)
   * 총 drops 합계는 항상 10방울
   */
  const generateUserDirectRecipe = useCallback((currentFeedback: PerfumeFeedback): GeneratedRecipe => {
    const TARGET_DROPS = 10 // 항상 10방울

    // 모든 향료 정보 수집
    const allScents = [
      { id: currentFeedback.perfumeId, name: currentFeedback.perfumeName, ratio: currentFeedback.retentionPercentage, isMain: true },
      ...currentFeedback.specificScents.map(s => ({ id: s.id, name: s.name, ratio: s.ratio, isMain: false }))
    ]

    // 1차: 비율 기반으로 drops 계산 (floor 사용)
    let drops = allScents.map(scent => ({
      ...scent,
      drops: Math.floor((scent.ratio / 100) * TARGET_DROPS)
    }))

    // 2차: 합계가 10이 될 때까지 나머지 분배 (비율이 높은 순으로)
    let currentTotal = drops.reduce((sum, d) => sum + d.drops, 0)
    const remaining = TARGET_DROPS - currentTotal

    if (remaining > 0) {
      // 비율이 높은 순으로 정렬해서 나머지 분배
      const sortedByRatio = [...drops].sort((a, b) => b.ratio - a.ratio)
      for (let i = 0; i < remaining; i++) {
        const target = sortedByRatio[i % sortedByRatio.length]
        const original = drops.find(d => d.id === target.id)
        if (original) original.drops += 1
      }
    }

    // granules 생성
    const granules: RecipeGranule[] = drops.map(scent => {
      const perfumeData = getPerfumeById(scent.id)
      return {
        id: scent.id,
        name: scent.name,
        mainCategory: perfumeData?.category || (scent.isMain ? perfumeCategory : 'unknown'),
        drops: scent.drops,
        ratio: scent.ratio,
        reason: scent.isMain
          ? `추천받은 ${scent.name} 향을 ${scent.ratio}% 그대로 유지! 💯`
          : `내가 선택한 ${scent.name}을(를) ${scent.ratio}%로! 🎯`,
        fanComment: scent.isMain
          ? `내가 직접 선택한 비율이에요! ✨`
          : `직접 고른 향료예요! 💕`,
      }
    })

    return {
      granules,
      overallExplanation: `내가 직접 선택한 조합이에요! ${currentFeedback.perfumeName}을(를) ${currentFeedback.retentionPercentage}%로 유지하고${currentFeedback.specificScents.length > 0 ? `, ${currentFeedback.specificScents.map(s => s.name).join(', ')}을(를) 추가했어요` : ''}. AI 수정 없이 내 선택 그대로! 🎯`,
      categoryChanges: [],
      testingInstructions: {
        step1: '🌸 선택한 향료들을 비율대로 섞어주세요',
        step2: '✨ 손목이나 귀 뒤에 살짝 뿌려서 테스트해보세요',
        step3: '💕 30분 후 잔향이 어떻게 변하는지 확인해보세요',
        caution: '내가 선택한 조합이니까 자신감을 가지세요! 😎',
      },
      fanMessage: `완전 나만의 레시피 완성! 🎉 직접 고른 조합이라 더 특별해요~ ✨💕`,
      totalDrops: TARGET_DROPS,
      estimatedStrength: 'medium', // 10방울은 medium
    }
  }, [perfumeCategory])

  // 에러 클리어
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 피드백 업데이트
  const updateFeedback = useCallback((partial: Partial<PerfumeFeedback>) => {
    setFeedback((prev) => ({ ...prev, ...partial }))
  }, [])

  // 잔향률 업데이트
  const updateRetention = useCallback((percentage: number) => {
    setFeedback((prev) => ({
      ...prev,
      retentionPercentage: Math.max(0, Math.min(100, percentage)),
    }))
  }, [])

  // 카테고리 선호도 업데이트
  const updateCategoryPreference = useCallback(
    (
      category: keyof CategoryPreferences,
      value: CategoryPreferences[keyof CategoryPreferences]
    ) => {
      setFeedback((prev) => ({
        ...prev,
        categoryPreferences: {
          ...prev.categoryPreferences,
          [category]: value,
        },
      }))
    },
    []
  )

  // 특정 향료 추가
  const addSpecificScent = useCallback((scent: SpecificScent): boolean => {
    let added = false

    setFeedback((prev) => {
      // 최대 2개
      if (prev.specificScents.length >= 2) {
        setError('최대 2개의 향료만 선택할 수 있어요!')
        return prev
      }

      // 중복 체크
      if (prev.specificScents.some((s) => s.id === scent.id)) {
        setError('이미 선택된 향료예요!')
        return prev
      }

      added = true
      return {
        ...prev,
        specificScents: [...prev.specificScents, scent],
      }
    })

    // 3초 후 에러 클리어
    if (!added) {
      setTimeout(() => setError(null), 3000)
    }

    return added
  }, [])

  // 특정 향료 제거
  const removeSpecificScent = useCallback((scentId: string) => {
    setFeedback((prev) => ({
      ...prev,
      specificScents: prev.specificScents.filter((s) => s.id !== scentId),
    }))
  }, [])

  // 향료 비율 업데이트 (최소 5%, 최대는 컴포넌트에서 동적으로 계산)
  const updateScentRatio = useCallback((scentId: string, ratio: number) => {
    setFeedback((prev) => ({
      ...prev,
      specificScents: prev.specificScents.map((s) =>
        s.id === scentId ? { ...s, ratio: Math.max(5, Math.min(50, ratio)) } : s
      ),
    }))
  }, [])

  // 다음 단계 (3단계까지)
  const nextStep = useCallback(() => {
    if (step < 3) {
      setStep((prev) => prev + 1)
      setError(null)
    }
  }, [step])

  // 이전 단계
  const prevStep = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1)
      setError(null)
    }
  }, [step])

  // 제출
  const submit = useCallback(async () => {
    setIsSubmitting(true)
    setIsGenerating(true)
    setError(null)

    try {
      // Step 1: 사용자 직접 선택 레시피 생성 (클라이언트 사이드)
      console.log('[Feedback] Generating user direct recipe...')
      const directRecipe = generateUserDirectRecipe(feedback)
      setUserDirectRecipe(directRecipe)
      console.log('[Feedback] User direct recipe generated:', directRecipe.granules.length, 'granules')

      // Step 2: AI 추천 레시피 생성 (서버 사이드)
      console.log('[Feedback] Generating AI recommended recipe...')

      const recipeResponse = await fetch('/api/feedback/customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback,
          originalPerfume: {
            id: perfumeId,
            name: perfumeName,
            characteristics: perfumeCharacteristics,
            category: perfumeCategory,
          },
          characterName, // 분석된 캐릭터 이름 전달
          naturalLanguageFeedback: feedback.naturalLanguageFeedback || '', // 자연어 피드백
        }),
      })

      const recipeData = await recipeResponse.json()
      setIsGenerating(false)

      if (recipeData.success) {
        const aiRecipe = recipeData.recipe as GeneratedRecipe
        setAiRecommendedRecipe(aiRecipe)
        console.log('[Feedback] AI recipe generated:', aiRecipe.granules.length, 'granules')
      } else {
        // AI 레시피 실패해도 사용자 직접 레시피는 사용 가능
        console.warn('[Feedback] AI recipe failed:', recipeData.error)
        setAiRecommendedRecipe(null)
      }

      // Step 3: 피드백 저장
      const fingerprint = getOrCreateFingerprint()

      const saveResponse = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId,
          perfumeId: feedback.perfumeId,
          perfumeName: feedback.perfumeName,
          retentionPercentage: feedback.retentionPercentage,
          categoryPreferences: feedback.categoryPreferences,
          specificScents: feedback.specificScents,
          notes: feedback.notes,
          naturalLanguageFeedback: feedback.naturalLanguageFeedback,
          generatedRecipe: directRecipe, // 저장할 때는 사용자 직접 레시피
          userFingerprint: fingerprint,
        }),
      })

      const saveData = await saveResponse.json()

      if (!saveData.success) {
        console.warn('[Feedback] Save failed:', saveData.error)
        // 저장 실패해도 레시피는 생성되었으므로 계속 진행
      } else {
        console.log('[Feedback] Saved successfully:', saveData.id)
      }

      // 성공 단계로 이동 (3단계 구조에서 성공은 step 4)
      setStep(4)
    } catch (err) {
      console.error('[Feedback] Submit error:', err)
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
      setIsGenerating(false)
    }
  }, [feedback, perfumeId, perfumeName, perfumeCharacteristics, perfumeCategory, resultId, characterName, generateUserDirectRecipe])

  // 리셋
  const reset = useCallback(() => {
    setStep(1)
    setFeedback(createInitialFeedback(perfumeId, perfumeName))
    setUserDirectRecipe(null)
    setAiRecommendedRecipe(null)
    setError(null)
  }, [perfumeId, perfumeName])

  return {
    step,
    feedback,
    userDirectRecipe,
    aiRecommendedRecipe,
    isSubmitting,
    isGenerating,
    error,
    updateFeedback,
    updateRetention,
    updateCategoryPreference,
    addSpecificScent,
    removeSpecificScent,
    updateScentRatio,
    nextStep,
    prevStep,
    submit,
    reset,
    clearError,
  }
}
