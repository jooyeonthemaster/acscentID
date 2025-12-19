'use client'

import { useState, useCallback } from 'react'
import {
  PerfumeFeedback,
  GeneratedRecipe,
  CategoryPreferences,
  SpecificScent,
  createInitialFeedback,
} from '@/types/feedback'
import { ScentCategoryScores } from '@/types/analysis'

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
  recipe: GeneratedRecipe | null
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
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // 다음 단계 (이제 2단계까지만)
  const nextStep = useCallback(() => {
    if (step < 2) {
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
      // Step 1: 레시피 생성
      console.log('[Feedback] Generating recipe...')

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
        }),
      })

      const recipeData = await recipeResponse.json()
      setIsGenerating(false)

      if (!recipeData.success) {
        throw new Error(recipeData.error || '레시피 생성에 실패했습니다.')
      }

      const generatedRecipe = recipeData.recipe as GeneratedRecipe
      setRecipe(generatedRecipe)
      console.log('[Feedback] Recipe generated:', generatedRecipe.granules.length, 'granules')

      // Step 2: 피드백 저장
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
          generatedRecipe,
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

      // 성공 단계로 이동 (2단계 구조에서 성공은 step 3)
      setStep(3)
    } catch (err) {
      console.error('[Feedback] Submit error:', err)
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
      setIsGenerating(false)
    }
  }, [feedback, perfumeId, perfumeName, perfumeCharacteristics, perfumeCategory, resultId, characterName])

  // 리셋
  const reset = useCallback(() => {
    setStep(1)
    setFeedback(createInitialFeedback(perfumeId, perfumeName))
    setRecipe(null)
    setError(null)
  }, [perfumeId, perfumeName])

  return {
    step,
    feedback,
    recipe,
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
