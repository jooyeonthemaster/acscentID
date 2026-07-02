"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles, ChevronRight, Check, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { perfumes } from "@/data/perfumes"
import {
  type ScentIntensity,
  type ChemistryTasteData, type ChemistryRecipeResult,
  type GeneratedRecipe,
} from "@/types/feedback"
import { apiFetch } from "@/lib/api-client"
import { CategoryChangeChart, OriginalPerfumeCard } from "../feedback/RecipeCategoryChart"
import { RecipeGramDisplay } from "../feedback/RecipeGramDisplay"
import type { ProductType } from "@/types/feedback"

interface ChemistryFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  draftScopeKey?: string
  characterAName: string
  characterBName: string
  perfumeAId: string
  perfumeAName: string
  perfumeBId: string
  perfumeBName: string
  perfumeACharacteristics?: Record<string, number>
  perfumeBCharacteristics?: Record<string, number>
  onConfirmRecipes?: (payload: ChemistryConfirmedRecipesPayload) => Promise<void> | void
}

export interface ChemistryConfirmedRecipesPayload {
  sessionId: string
  recipeA: GeneratedRecipe
  recipeB: GeneratedRecipe
  selectedA: 1 | 2 | null
  selectedB: 1 | 2 | null
  productType: ProductType
  tasteA: SingleTasteState
  tasteB: SingleTasteState
  result: ChemistryRecipeResult
}

// 한 캐릭터의 취향 데이터
export interface SingleTasteState {
  satisfied: boolean // 만족해서 변경 불필요
  retention: number // 기존 향 유지 비율 0-100
  intensity: ScentIntensity
  feedbackGood: string // 기존 향에서 좋았던/싫었던 점
  feedbackWish: string // 이렇게 바뀌면 좋겠다
}

const createInitialTaste = (): SingleTasteState => ({
  satisfied: true,
  retention: 70,
  intensity: 'moderate',
  feedbackGood: '',
  feedbackWish: '',
})

interface OriginalRecipeCopy {
  reason: string
  fanComment: string
  overallExplanation: string
  maintainedReason: string
  step1: string
  step2: string
  step3: string
  caution: string
  fanMessage: string
}

const DEFAULT_ORIGINAL_RECIPE_COPY: OriginalRecipeCopy = {
  reason: 'The original scent was chosen as the best option.',
  fanComment: 'This scent itself is the answer.',
  overallExplanation: 'A recipe that uses the original scent without changes.',
  maintainedReason: 'Original kept',
  step1: 'Use the original perfume as is.',
  step2: 'It is made as a single scent without extra blending.',
  step3: 'Choose the size and the exact ingredient amount will be calculated.',
  caution: 'This composition uses only the original ingredient without blending.',
  fanMessage: 'Trusting the original finish is a perfect choice.',
}

// 만족 케이스 — 원본 향수 100%짜리 단일 그래뉼 레시피 생성
const buildOriginalRecipe = (
  perfumeId: string,
  perfumeName: string,
  characteristics?: Record<string, number>,
  copy: OriginalRecipeCopy = DEFAULT_ORIGINAL_RECIPE_COPY,
): GeneratedRecipe => {
  const perfume = perfumes.find(p => p.id === perfumeId)
  const mainCategory = perfume?.category || 'citrus'
  return {
    granules: [{
      id: perfumeId,
      name: perfume?.name || perfumeName,
      mainCategory,
      drops: 10,
      ratio: 100,
      reason: copy.reason,
      fanComment: copy.fanComment,
    }],
    overallExplanation: copy.overallExplanation,
    categoryChanges: Object.entries(characteristics || perfume?.characteristics || {}).map(([category, score]) => ({
      category,
      change: 'maintained' as const,
      originalScore: Number(score) || 0,
      newScore: Number(score) || 0,
      reason: copy.maintainedReason,
    })),
    testingInstructions: {
      step1: copy.step1,
      step2: copy.step2,
      step3: copy.step3,
      caution: copy.caution,
    },
    fanMessage: copy.fanMessage,
    totalDrops: 10,
    estimatedStrength: 'medium',
  }
}

type ModalStep = 'formA' | 'formB' | 'generating' | 'result' | 'confirmed' | 'success'

interface ChemistryFeedbackDraft {
  version: 1
  updatedAt: number
  step: Exclude<ModalStep, 'generating' | 'success'>
  tasteA: SingleTasteState
  tasteB: SingleTasteState
  result: ChemistryRecipeResult | null
  resultTab: 'A' | 'B'
  selectedA: 1 | 2 | null
  selectedB: 1 | 2 | null
  confirmedProductType: ProductType
}

const FEEDBACK_DRAFT_TTL_MS = 24 * 60 * 60 * 1000

function readFeedbackDraft(storageKey: string): ChemistryFeedbackDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null

    const parsed = JSON.parse(raw) as ChemistryFeedbackDraft
    if (parsed.version !== 1 || Date.now() - parsed.updatedAt > FEEDBACK_DRAFT_TTL_MS) {
      localStorage.removeItem(storageKey)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeFeedbackDraft(storageKey: string, draft: ChemistryFeedbackDraft) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(storageKey, JSON.stringify(draft))
  } catch {
    // localStorage can fail in private mode or low-storage conditions.
  }
}

function clearFeedbackDraft(storageKey: string) {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(storageKey)
  } catch {
    // Ignore storage cleanup failures.
  }
}

function resolveVisibleResultTab(
  tasteA: SingleTasteState,
  tasteB: SingleTasteState,
  preferred: 'A' | 'B' = 'A'
): 'A' | 'B' {
  if (preferred === 'A' && !tasteA.satisfied) return 'A'
  if (preferred === 'B' && !tasteB.satisfied) return 'B'
  if (!tasteA.satisfied) return 'A'
  if (!tasteB.satisfied) return 'B'
  return 'A'
}

export function ChemistryFeedbackModal({
  isOpen, onClose, sessionId, draftScopeKey,
  characterAName, characterBName,
  perfumeAId, perfumeAName, perfumeBId, perfumeBName,
  perfumeACharacteristics, perfumeBCharacteristics,
  onConfirmRecipes,
}: ChemistryFeedbackModalProps) {
  const t = useTranslations()
  const [tasteA, setTasteA] = useState<SingleTasteState>(createInitialTaste())
  const [tasteB, setTasteB] = useState<SingleTasteState>(createInitialTaste())
  const [step, setStep] = useState<ModalStep>('formA')
  const [result, setResult] = useState<ChemistryRecipeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultTab, setResultTab] = useState<'A' | 'B'>('A')
  const [selectedA, setSelectedA] = useState<1 | 2 | null>(null)
  const [selectedB, setSelectedB] = useState<1 | 2 | null>(null)
  const [confirmedProductType, setConfirmedProductType] = useState<ProductType>('perfume_10ml')
  const [isConfirming, setIsConfirming] = useState(false)
  const [draftReady, setDraftReady] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const storageKey = useMemo(() => {
    const scope = draftScopeKey || sessionId || 'unsaved'
    const identity = [scope, characterAName, characterBName, perfumeAId, perfumeBId].join(':')
    return `chemistry_feedback_draft:${identity}`
  }, [draftScopeKey, sessionId, characterAName, characterBName, perfumeAId, perfumeBId])
  const originalRecipeCopy = useMemo<OriginalRecipeCopy>(() => ({
    reason: t('chemistry.feedbackModal.originalReason'),
    fanComment: t('chemistry.feedbackModal.originalFanComment'),
    overallExplanation: t('chemistry.feedbackModal.originalExplanation'),
    maintainedReason: t('chemistry.feedbackModal.originalMaintained'),
    step1: t('chemistry.feedbackModal.originalStep1'),
    step2: t('chemistry.feedbackModal.originalStep2'),
    step3: t('chemistry.feedbackModal.originalStep3'),
    caution: t('chemistry.feedbackModal.originalCaution'),
    fanMessage: t('chemistry.feedbackModal.originalFanMessage'),
  }), [t])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const goToStep = useCallback((s: ModalStep) => {
    setStep(s)
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }, [])

  // 모달 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const scrollY = window.scrollY
    const { style } = document.body
    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    }

    style.position = 'fixed'
    style.top = `-${scrollY}px`
    style.left = '0'
    style.right = '0'
    style.width = '100%'
    style.overflow = 'hidden'
    return () => {
      style.position = previous.position
      style.top = previous.top
      style.left = previous.left
      style.right = previous.right
      style.width = previous.width
      style.overflow = previous.overflow
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setDraftReady(false)
      return
    }

    const draft = readFeedbackDraft(storageKey)

    if (draft) {
      if (draft.step === 'confirmed') {
        clearFeedbackDraft(storageKey)
      } else {
        setTasteA(draft.tasteA)
        setTasteB(draft.tasteB)
        setStep(draft.step)
        setResult(draft.result)
        setResultTab(resolveVisibleResultTab(draft.tasteA, draft.tasteB, draft.resultTab))
        setSelectedA(draft.selectedA)
        setSelectedB(draft.selectedB)
        setConfirmedProductType(draft.confirmedProductType)
        setError(null)
        setIsConfirming(false)
        setDraftReady(true)
        return
      }
    }

    if (isOpen) {
      setTasteA(createInitialTaste())
      setTasteB(createInitialTaste())
      setStep('formA')
      setResult(null)
      setError(null)
      setResultTab('A')
      setSelectedA(null)
      setSelectedB(null)
      setConfirmedProductType('perfume_10ml')
      setIsConfirming(false)
      setDraftReady(true)
    }
  }, [isOpen, storageKey])

  const applySatisfiedOriginalRecipes = useCallback((nextResult: ChemistryRecipeResult): ChemistryRecipeResult => {
    let patchedResult = nextResult

    if (tasteA.satisfied) {
      const originalA = buildOriginalRecipe(perfumeAId, perfumeAName, perfumeACharacteristics, originalRecipeCopy)
      patchedResult = {
        ...patchedResult,
        recipeA1: originalA,
        recipeA2: originalA,
      }
    }

    if (tasteB.satisfied) {
      const originalB = buildOriginalRecipe(perfumeBId, perfumeBName, perfumeBCharacteristics, originalRecipeCopy)
      patchedResult = {
        ...patchedResult,
        recipeB1: originalB,
        recipeB2: originalB,
      }
    }

    return patchedResult
  }, [
    tasteA.satisfied,
    tasteB.satisfied,
    perfumeAId,
    perfumeAName,
    perfumeACharacteristics,
    perfumeBId,
    perfumeBName,
    perfumeBCharacteristics,
    originalRecipeCopy,
  ])

  useEffect(() => {
    if (!isOpen || !draftReady) return
    if (step === 'generating' || step === 'success') return

    writeFeedbackDraft(storageKey, {
      version: 1,
      updatedAt: Date.now(),
      step,
      tasteA,
      tasteB,
      result,
      resultTab,
      selectedA,
      selectedB,
      confirmedProductType,
    })
  }, [
    isOpen,
    draftReady,
    storageKey,
    step,
    tasteA,
    tasteB,
    result,
    resultTab,
    selectedA,
    selectedB,
    confirmedProductType,
  ])

  // success 단계 진입 시 2.5초 후 자동으로 모달 닫기
  useEffect(() => {
    if (step !== 'success' || !isOpen) return
    const timer = setTimeout(() => onClose(), 2500)
    return () => clearTimeout(timer)
  }, [step, isOpen, onClose])

  // A→B 전환 (A 단계에서는 항상 B로 이동, 만족 판정은 B에서 종합)
  const handleNextFromA = useCallback(() => {
    goToStep('formB')
  }, [goToStep])

  // handleNextFromB는 handleGenerate 아래에서 정의

  const handleGenerate = useCallback(async () => {
    setStep('generating')
    setError(null)
    try {
      const tasteData: ChemistryTasteData = {
        sessionId,
        intensity: tasteA.intensity,
        freeText: `${tasteA.feedbackGood ? `${t('chemistry.feedbackModal.freeTextGoodPrefix')}: ${tasteA.feedbackGood}. ` : ''}${tasteA.feedbackWish ? `${t('chemistry.feedbackModal.freeTextWishPrefix')}: ${tasteA.feedbackWish}` : ''}`.trim(),
      }
      const response = await apiFetch('/api/feedback/chemistry-customize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taste: { ...tasteData, satisfied: tasteA.satisfied, retention: tasteA.retention },
          tasteB: {
            satisfied: tasteB.satisfied, retention: tasteB.retention,
            intensity: tasteB.intensity,
            freeText: `${tasteB.feedbackGood ? `${t('chemistry.feedbackModal.freeTextGoodPrefix')}: ${tasteB.feedbackGood}. ` : ''}${tasteB.feedbackWish ? `${t('chemistry.feedbackModal.freeTextWishPrefix')}: ${tasteB.feedbackWish}` : ''}`.trim(),
          },
          perfumeA: { id: perfumeAId, name: perfumeAName, characteristics: perfumeACharacteristics || {} },
          perfumeB: { id: perfumeBId, name: perfumeBName, characteristics: perfumeBCharacteristics || {} },
          characterAName, characterBName,
        }),
      })
      const data = await response.json()
      if (data.success && data.result) {
        setResult(applySatisfiedOriginalRecipes(data.result))
        setResultTab(resolveVisibleResultTab(tasteA, tasteB))
        setStep('result')
      }
      else throw new Error(data.error || t('chemistry.feedbackModal.recipeGenerateFailed'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('chemistry.feedbackModal.genericError'))
      setStep('formB')
    }
  }, [sessionId, tasteA, tasteB, perfumeAId, perfumeAName, perfumeBId, perfumeBName, perfumeACharacteristics, perfumeBCharacteristics, characterAName, characterBName, applySatisfiedOriginalRecipes, t])

  const handleNextFromB = useCallback(() => {
    if (tasteA.satisfied && tasteB.satisfied) {
      // 둘 다 만족 → API 호출 없이 원본 100% 레시피로 confirmed 단계 이동
      const syntheticRecipeA = buildOriginalRecipe(perfumeAId, perfumeAName, perfumeACharacteristics, originalRecipeCopy)
      const syntheticRecipeB = buildOriginalRecipe(perfumeBId, perfumeBName, perfumeBCharacteristics, originalRecipeCopy)
      setResult({
        recipeA1: syntheticRecipeA,
        recipeA2: syntheticRecipeA,
        recipeB1: syntheticRecipeB,
        recipeB2: syntheticRecipeB,
        layeringNote: t('chemistry.feedbackModal.originalLayeringNote', {
          nameA: characterAName,
          perfumeA: perfumeAName,
          nameB: characterBName,
          perfumeB: perfumeBName,
        }),
        pairExplanation: t('chemistry.feedbackModal.originalPairExplanation'),
      })
      setSelectedA(1)
      setSelectedB(1)
      goToStep('confirmed')
      return
    }
    handleGenerate()
  }, [tasteA.satisfied, tasteB.satisfied, perfumeAId, perfumeAName, perfumeBId, perfumeBName, perfumeACharacteristics, perfumeBCharacteristics, characterAName, characterBName, goToStep, handleGenerate, originalRecipeCopy, t])

  const buildConfirmedPayload = useCallback((): ChemistryConfirmedRecipesPayload | null => {
    if (!result) return null

    const recipeA = tasteA.satisfied
      ? buildOriginalRecipe(perfumeAId, perfumeAName, perfumeACharacteristics, originalRecipeCopy)
      : selectedA === 1
        ? result.recipeA1
        : selectedA === 2
          ? result.recipeA2
          : null

    const recipeB = tasteB.satisfied
      ? buildOriginalRecipe(perfumeBId, perfumeBName, perfumeBCharacteristics, originalRecipeCopy)
      : selectedB === 1
        ? result.recipeB1
        : selectedB === 2
          ? result.recipeB2
          : null

    if (!recipeA || !recipeB) return null

    return {
      sessionId,
      recipeA,
      recipeB,
      selectedA,
      selectedB,
      productType: confirmedProductType,
      tasteA,
      tasteB,
      result,
    }
  }, [result, tasteA, tasteB, selectedA, selectedB, confirmedProductType, sessionId, perfumeAId, perfumeAName, perfumeACharacteristics, perfumeBId, perfumeBName, perfumeBCharacteristics, originalRecipeCopy])

  const handleCompleteConfirmed = useCallback(async () => {
    const payload = buildConfirmedPayload()
    if (!payload || isConfirming) return

    setIsConfirming(true)
    setError(null)

    try {
      if (onConfirmRecipes) {
        await onConfirmRecipes(payload)
      }
      clearFeedbackDraft(storageKey)
      goToStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('chemistry.feedbackModal.recipeSaveFailed'))
    } finally {
      setIsConfirming(false)
    }
  }, [buildConfirmedPayload, goToStep, isConfirming, onConfirmRecipes, storageKey, t])

  if (!isOpen || !isMounted) return null

  const isFormA = step === 'formA'
  const isFormB = step === 'formB'
  const currentTaste = isFormA ? tasteA : tasteB
  const setCurrentTaste = isFormA ? setTasteA : setTasteB
  const confirmedRecipeA = result
    ? tasteA.satisfied
      ? buildOriginalRecipe(perfumeAId, perfumeAName, perfumeACharacteristics, originalRecipeCopy)
      : selectedA === 2
        ? result.recipeA2
        : result.recipeA1
    : null
  const confirmedRecipeB = result
    ? tasteB.satisfied
      ? buildOriginalRecipe(perfumeBId, perfumeBName, perfumeBCharacteristics, originalRecipeCopy)
      : selectedB === 2
        ? result.recipeB2
        : result.recipeB1
    : null
  const intensityOptions = [
    {
      id: 'subtle' as ScentIntensity,
      label: t('chemistry.feedbackModal.intensity.subtle'),
      sub: t('chemistry.feedbackModal.intensity.subtleSub'),
      emoji: '🌬️',
    },
    {
      id: 'moderate' as ScentIntensity,
      label: t('chemistry.feedbackModal.intensity.moderate'),
      sub: t('chemistry.feedbackModal.intensity.moderateSub'),
      emoji: '🌿',
    },
    {
      id: 'bold' as ScentIntensity,
      label: t('chemistry.feedbackModal.intensity.bold'),
      sub: t('chemistry.feedbackModal.intensity.boldSub'),
      emoji: '🔥',
    },
  ]
  const getProductLabel = (productType: ProductType) => {
    if (productType === 'perfume_10ml') return t('chemistry.feedbackModal.productPerfume10')
    if (productType === 'perfume_50ml') return t('chemistry.feedbackModal.productPerfume50')
    return t('chemistry.feedbackModal.productDiffuser5')
  }

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-[455px] bg-[#FFFDF5] rounded-t-3xl border-t-2 border-x-2 border-black max-h-[calc(100svh_-_env(safe-area-inset-top)_-_8px)] flex flex-col"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b-2 border-black bg-yellow-400 rounded-t-3xl flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-black">{t('chemistry.feedbackModal.title')}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20">
            <X size={16} className="text-black" />
          </button>
        </div>

        {/* 진행 표시 — A/B 스텝 인디케이터 */}
        {(isFormA || isFormB) && (
          <div className="px-4 py-2 border-b-2 border-black bg-[#FFFDF5] flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => goToStep('formA')}
                className={`min-w-0 flex-1 rounded-xl p-2 border-2 transition-all text-left ${isFormA ? 'border-black bg-violet-100 shadow-[2px_2px_0_0_black]' : 'border-slate-200 bg-white opacity-60 hover:opacity-80 cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">🌙</span>
                  {!isFormA && <span className="text-xs text-emerald-500 font-black">✓ {t('chemistry.feedbackModal.completedShort')}</span>}
                </div>
                <span className={`text-xs font-black block mt-1 truncate ${isFormA ? 'text-violet-700' : 'text-slate-400'}`}>{characterAName}</span>
                <span className={`text-[10px] block mt-0.5 truncate ${isFormA ? 'text-violet-500' : 'text-slate-400'}`}>{perfumeAName || perfumeAId || "AC'SCENT"}</span>
              </button>
              <button
                onClick={() => goToStep('formB')}
                className={`min-w-0 flex-1 rounded-xl p-2 border-2 transition-all text-left ${isFormB ? 'border-black bg-pink-100 shadow-[2px_2px_0_0_black]' : 'border-slate-200 bg-white opacity-60 hover:opacity-80 cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">☀️</span>
                </div>
                <span className={`text-xs font-black block mt-1 truncate ${isFormB ? 'text-pink-700' : 'text-slate-400'}`}>{characterBName}</span>
                <span className={`text-[10px] block mt-0.5 truncate ${isFormB ? 'text-pink-500' : 'text-slate-400'}`}>{perfumeBName || perfumeBId || "AC'SCENT"}</span>
              </button>
            </div>
          </div>
        )}

        {/* 콘텐츠 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <AnimatePresence mode="wait">
            {/* 폼 A 또는 B */}
            {(isFormA || isFormB) && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: isFormA ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isFormA ? -20 : 20 }}
                className="px-4 py-4 space-y-4"
              >
                {/* 만족 여부 — 첫 질문 */}
                <div>
                  <p className="text-sm font-black text-slate-800 mb-2.5">{t('chemistry.feedbackModal.question')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCurrentTaste(prev => ({ ...prev, satisfied: true }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        currentTaste.satisfied
                          ? 'border-black bg-emerald-100 shadow-[3px_3px_0_0_black] -translate-x-[1px] -translate-y-[1px]'
                          : 'border-slate-300 bg-white hover:border-black'
                      }`}
                    >
                      <span className="text-2xl block mb-1">😍</span>
                      <span className="text-xs font-black block">{t('chemistry.feedbackModal.satisfied')}</span>
                    </button>
                    <button
                      onClick={() => setCurrentTaste(prev => ({ ...prev, satisfied: false }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        !currentTaste.satisfied
                          ? 'border-black bg-amber-100 shadow-[3px_3px_0_0_black] -translate-x-[1px] -translate-y-[1px]'
                          : 'border-slate-300 bg-white hover:border-black'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🔧</span>
                      <span className="text-xs font-black block">{t('chemistry.feedbackModal.wantChange')}</span>
                    </button>
                  </div>
                </div>

                {/* 바꾸고 싶을 때만 상세 폼 펼침 */}
                <AnimatePresence>
                  {!currentTaste.satisfied && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {/* 유지 비율 슬라이더 */}
                      <TasteQuestion number={1} title={t('chemistry.feedbackModal.retentionTitle')}>
                        <div className="bg-white rounded-2xl p-4 border-2 border-black shadow-[3px_3px_0_0_black]">
                          <div className="flex justify-between text-xs font-bold text-slate-500 mb-3">
                            <span>🌱 {t('chemistry.feedbackModal.newCompletely')}</span>
                            <span>{t('chemistry.feedbackModal.keepAlmost')} ✨</span>
                          </div>
                          <input
                            type="range" min={0} max={90} step={10} value={Math.min(currentTaste.retention, 90)}
                            onChange={(e) => setCurrentTaste(prev => ({ ...prev, retention: Number(e.target.value) }))}
                            className="w-full h-3 bg-gradient-to-r from-violet-300 via-amber-200 to-emerald-300 rounded-full appearance-none cursor-pointer
                              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8
                              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2
                              [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:shadow-[2px_2px_0_0_black] [&::-webkit-slider-thumb]:cursor-pointer"
                          />
                          <div className="text-center mt-3">
                            <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-700">
                              {t('chemistry.feedbackModal.retentionSummary', { percent: currentTaste.retention })}
                            </span>
                          </div>
                        </div>
                      </TasteQuestion>

                      {/* 기존 향 피드백 */}
                      <TasteQuestion number={2} title={t('chemistry.feedbackModal.feedbackGoodTitle')}>
                        <textarea
                          value={currentTaste.feedbackGood}
                          onChange={(e) => setCurrentTaste(prev => ({ ...prev, feedbackGood: e.target.value }))}
                          placeholder={t('chemistry.feedbackModal.feedbackGoodPlaceholder')}
                          className="w-full h-16 px-4 py-3 text-base border-2 border-black rounded-xl bg-white focus:shadow-[2px_2px_0_0_black] outline-none resize-none transition-all"
                          maxLength={200}
                        />
                      </TasteQuestion>

                      {/* 원하는 방향 */}
                      <TasteQuestion number={3} title={t('chemistry.feedbackModal.feedbackWishTitle')}>
                        <textarea
                          value={currentTaste.feedbackWish}
                          onChange={(e) => setCurrentTaste(prev => ({ ...prev, feedbackWish: e.target.value }))}
                          placeholder={t('chemistry.feedbackModal.feedbackWishPlaceholder')}
                          className="w-full h-16 px-4 py-3 text-base border-2 border-black rounded-xl bg-white focus:shadow-[2px_2px_0_0_black] outline-none resize-none transition-all"
                          maxLength={200}
                        />
                      </TasteQuestion>

                      {/* 존재감 */}
                      <TasteQuestion number={4} title={t('chemistry.feedbackModal.intensityTitle')} optional>
                        <div className="grid grid-cols-3 gap-2">
                          {intensityOptions.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setCurrentTaste(prev => ({ ...prev, intensity: opt.id }))}
                              className={`p-3 rounded-xl border-2 text-center transition-all ${
                                currentTaste.intensity === opt.id
                                  ? 'border-black bg-yellow-400 text-black shadow-[2px_2px_0_0_black] -translate-x-[1px] -translate-y-[1px]'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-black'
                              }`}
                            >
                              <span className="text-lg block mb-1">{opt.emoji}</span>
                              <span className="text-xs font-black block">{opt.label}</span>
                              <span className="text-[9px] text-slate-500 block mt-0.5">{opt.sub}</span>
                            </button>
                          ))}
                        </div>
                      </TasteQuestion>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="p-3 bg-red-100 border-2 border-red-400 rounded-xl">
                    <p className="text-xs font-bold text-red-700">{error}</p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'generating' && (
              <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 px-5">
                <div className="w-14 h-14 border-4 border-yellow-400 border-t-black rounded-xl animate-spin mb-4" />
                <p className="text-sm font-black text-slate-800">{t('chemistry.feedbackModal.generatingTitle')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('chemistry.feedbackModal.generatingSubtitle')}</p>
              </motion.div>
            )}

            {step === 'result' && result && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* A/B 탭 — sticky로 헤더 아래 고정 */}
                <div className="sticky top-0 z-20 bg-white border-b-2 border-slate-100 px-5 pt-3 pb-3 -mx-0">
                  <div className="flex gap-2">
                    {!tasteA.satisfied && (
                      <button
                        onClick={() => { setResultTab('A'); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-all ${
                          resultTab === 'A'
                            ? 'border-black bg-violet-100 shadow-[2px_2px_0_0_black] font-black text-violet-700'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-black">🌙 {characterAName}</span>
                        {selectedA && <span className="text-emerald-500 ml-1 text-[10px]">✓</span>}
                      </button>
                    )}
                    {!tasteB.satisfied && (
                      <button
                        onClick={() => { setResultTab('B'); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-all ${
                          resultTab === 'B'
                            ? 'border-black bg-pink-100 shadow-[2px_2px_0_0_black] font-black text-pink-700'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-black">☀️ {characterBName}</span>
                        {selectedB && <span className="text-emerald-500 ml-1 text-[10px]">✓</span>}
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-5 space-y-4">

                <AnimatePresence mode="wait">
                  {/* A 레시피 선택 */}
                  {resultTab === 'A' && !tasteA.satisfied && (
                    <motion.div key="recA" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {/* 상단 안내 — 선택 행동을 메인 메시지로 */}
                      <div className="bg-violet-50 border-2 border-violet-300 rounded-xl p-3">
                        <p className="text-sm font-black text-violet-900 flex items-center gap-1.5">
                          👇 <span className="underline decoration-violet-500 decoration-2 underline-offset-2">{t('chemistry.feedbackModal.selectOptionTitle')}</span>
                        </p>
                        <p className="text-[10px] text-slate-600 leading-relaxed mt-1.5">
                          {t('chemistry.feedbackModal.selectOptionHint')}
                        </p>
                      </div>
                      <SelectableRecipeCard
                        label={t('chemistry.feedbackModal.option1')}
                        recipe={result.recipeA1}
                        selected={selectedA === 1}
                        onSelect={() => setSelectedA(1)}
                        accentColor="violet"
                        originalPerfumeId={perfumeAId}
                        originalPerfumeName={perfumeAName}
                        retentionPercentage={tasteA.retention}
                      />
                      <SelectableRecipeCard
                        label={t('chemistry.feedbackModal.option2')}
                        recipe={result.recipeA2}
                        selected={selectedA === 2}
                        onSelect={() => setSelectedA(2)}
                        accentColor="violet"
                        originalPerfumeId={perfumeAId}
                        originalPerfumeName={perfumeAName}
                        retentionPercentage={tasteA.retention}
                      />
                    </motion.div>
                  )}
                  {/* B 레시피 선택 */}
                  {resultTab === 'B' && !tasteB.satisfied && (
                    <motion.div key="recB" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {/* 상단 안내 — 선택 행동을 메인 메시지로 */}
                      <div className="bg-pink-50 border-2 border-pink-300 rounded-xl p-3">
                        <p className="text-sm font-black text-pink-900 flex items-center gap-1.5">
                          👇 <span className="underline decoration-pink-500 decoration-2 underline-offset-2">{t('chemistry.feedbackModal.selectOptionTitle')}</span>
                        </p>
                        <p className="text-[10px] text-slate-600 leading-relaxed mt-1.5">
                          {t('chemistry.feedbackModal.selectOptionHint')}
                        </p>
                      </div>
                      <SelectableRecipeCard
                        label={t('chemistry.feedbackModal.option1')}
                        recipe={result.recipeB1}
                        selected={selectedB === 1}
                        onSelect={() => setSelectedB(1)}
                        accentColor="pink"
                        originalPerfumeId={perfumeBId}
                        originalPerfumeName={perfumeBName}
                        retentionPercentage={tasteB.retention}
                      />
                      <SelectableRecipeCard
                        label={t('chemistry.feedbackModal.option2')}
                        recipe={result.recipeB2}
                        selected={selectedB === 2}
                        onSelect={() => setSelectedB(2)}
                        accentColor="pink"
                        originalPerfumeId={perfumeBId}
                        originalPerfumeName={perfumeBName}
                        retentionPercentage={tasteB.retention}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* 최종 확정 — 실제 제조용 그람 단위 안내 */}
            {step === 'confirmed' && result && (
              <motion.div key="confirmed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-4 space-y-4">
                <div className="bg-green-50 border-2 border-green-500 rounded-xl p-3 shadow-[2px_2px_0_0_black]">
                  <p className="text-sm font-black text-slate-900">⚖️ {t('chemistry.feedbackModal.finalRecipeTitle')}</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed mt-1">
                    {t('chemistry.feedbackModal.finalRecipeDesc')}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 border-2 border-slate-200">
                  <p className="text-xs font-bold text-slate-700 mb-2">{t('chemistry.feedbackModal.productSize')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['perfume_10ml', 'perfume_50ml', 'diffuser_5ml'] as ProductType[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setConfirmedProductType(p)}
                        className={`p-2 rounded-lg border-2 transition-all text-center ${
                          confirmedProductType === p
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl block">{p === 'perfume_10ml' ? '🧴' : p === 'perfume_50ml' ? '🍾' : '🌿'}</span>
                        <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                          {getProductLabel(p)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {confirmedRecipeA && (tasteA.satisfied || selectedA) && (
                    <RecipePreviewCard
                      label={characterAName}
                      emoji="🌙"
                      recipe={confirmedRecipeA}
                      accentColor="violet"
                    />
                  )}
                  {confirmedRecipeB && (tasteB.satisfied || selectedB) && (
                    <RecipePreviewCard
                      label={characterBName}
                      emoji="☀️"
                      recipe={confirmedRecipeB}
                      accentColor="pink"
                    />
                  )}
                </div>

                {result.layeringNote && (
                  <div className="p-3 bg-black rounded-xl border-2 border-black">
                    <span className="text-[9px] font-black text-yellow-400 uppercase tracking-wider block mb-1">Layering Note</span>
                    <p className="text-xs text-white font-bold leading-relaxed">{result.layeringNote}</p>
                  </div>
                )}

                {/* 확정된 A 레시피 — 그람 단위 (만족 시 원본 100%, 아니면 선택된 안) */}
                {confirmedRecipeA && (tasteA.satisfied || selectedA) && (
                  <RecipeGramDisplay
                    recipe={confirmedRecipeA}
                    perfumeName={perfumeAName}
                    titleLabel={t('chemistry.feedbackModal.scentTitle', { name: characterAName })}
                    headerEmoji="🌙"
                    headerColor="violet"
                    showProductSelector={false}
                    externalSelectedProduct={confirmedProductType}
                    onProductChange={setConfirmedProductType}
                  />
                )}

                {/* 확정된 B 레시피 — 그람 단위 (만족 시 원본 100%, 아니면 선택된 안) */}
                {confirmedRecipeB && (tasteB.satisfied || selectedB) && (
                  <RecipeGramDisplay
                    recipe={confirmedRecipeB}
                    perfumeName={perfumeBName}
                    titleLabel={t('chemistry.feedbackModal.scentTitle', { name: characterBName })}
                    headerEmoji="☀️"
                    headerColor="pink"
                    showProductSelector={false}
                    externalSelectedProduct={confirmedProductType}
                    onProductChange={setConfirmedProductType}
                  />
                )}

                {result.pairExplanation && (
                  <div className="p-3 bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl border border-violet-200">
                    <p className="text-xs text-slate-600 leading-relaxed">{result.pairExplanation}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 완료 — 성공 화면 */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                className="flex flex-col items-center justify-center text-center py-16 px-5 gap-5"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 border-4 border-black shadow-[6px_6px_0_0_black] flex items-center justify-center"
                >
                  <Check size={56} className="text-white" strokeWidth={3.5} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{t('chemistry.feedbackModal.successTitle')}</h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">
                    {t('chemistry.feedbackModal.successDesc', { nameA: characterAName, nameB: characterBName })}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-[11px] text-slate-400"
                >
                  {t('chemistry.feedbackModal.autoClose')}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 하단 CTA */}
        <div className="px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t-2 border-black bg-white flex-shrink-0">
          {error && (step === 'result' || step === 'confirmed') && (
            <div className="mb-3 p-3 bg-red-100 border-2 border-red-400 rounded-xl">
              <p className="text-xs font-bold text-red-700">{error}</p>
            </div>
          )}
          {isFormA && (
            <button
              onClick={handleNextFromA}
              className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex flex-col items-center justify-center gap-0.5"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] opacity-80 font-bold">(1/2)</span>
                <span>{t('chemistry.feedbackModal.completeNext', { name: characterAName })}</span>
                <ChevronRight size={16} />
              </span>
              <span className="text-[10px] opacity-70 font-medium">{t('chemistry.feedbackModal.nextStepScent', { name: characterBName })}</span>
            </button>
          )}
          {isFormB && (
            <button
              onClick={handleNextFromB}
              className={`w-full py-3.5 font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex flex-col items-center justify-center gap-0.5 ${
                tasteA.satisfied && tasteB.satisfied
                  ? 'bg-gradient-to-r from-emerald-400 to-green-400 text-black'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-400 text-black'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] opacity-80 font-bold">(2/2)</span>
                {tasteA.satisfied && tasteB.satisfied ? (
                  <><Check size={16} /> <span>{t('chemistry.feedbackModal.confirmOriginal')}</span></>
                ) : (
                  <><Sparkles size={16} /> <span>{t('chemistry.feedbackModal.generateCustom', { name: characterBName })}</span></>
                )}
              </span>
            </button>
          )}
          {step === 'result' && (() => {
            const needA = !tasteA.satisfied
            const needB = !tasteB.satisfied
            const allSelected = (!needA || selectedA !== null) && (!needB || selectedB !== null)
            // A 선택 후 B로 자동 전환
            if (resultTab === 'A' && selectedA && needB && !selectedB) {
              return (
                <button
                  onClick={() => { setResultTab('B'); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-400 to-pink-500 text-white font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] transition-all flex items-center justify-center gap-2"
                >
                  {t('chemistry.feedbackModal.selectScentForName', { name: characterBName })} <ChevronRight size={16} />
                </button>
              )
            }
            return (
              <button
                onClick={() => allSelected ? setStep('confirmed') : null}
                disabled={!allSelected}
                className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Check size={16} /> {t('chemistry.feedbackModal.confirmRecipe')}
              </button>
            )
          })()}
          {step === 'confirmed' && (
            <button
              onClick={handleCompleteConfirmed}
              disabled={isConfirming}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-green-400 text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0"
            >
              <Check size={16} /> {isConfirming ? t('chemistry.feedbackModal.saving') : t('chemistry.feedbackModal.done')}
            </button>
          )}
          {step === 'success' && (
            <button
              onClick={onClose}
              className="w-full py-3.5 bg-slate-900 text-white font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all"
            >
              {t('chemistry.feedbackModal.close')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modal, document.body)
}

// 질문 래퍼
function TasteQuestion({ number, title, hint, optional, children }: {
  number: number; title: string; hint?: string; optional?: boolean; children: React.ReactNode
}) {
  const t = useTranslations()
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 bg-yellow-400 text-black text-xs font-black rounded-lg flex items-center justify-center border-2 border-black shadow-[2px_2px_0_0_black]">{number}</span>
        <span className="text-sm font-black text-slate-800">{title}</span>
        {optional && <span className="text-[10px] text-slate-400">({t('feedback.optional')})</span>}
      </div>
      {hint && <p className="text-[11px] text-slate-500 mb-3 ml-9">{hint}</p>}
      {children}
    </div>
  )
}
function RecipePreviewCard({ label, emoji, recipe, accentColor }: {
  label: string
  emoji: string
  recipe: GeneratedRecipe
  accentColor: 'violet' | 'pink'
}) {
  const theme = accentColor === 'violet'
    ? 'border-violet-300 bg-violet-50 text-violet-700'
    : 'border-pink-300 bg-pink-50 text-pink-700'

  return (
    <div className={`rounded-xl border-2 p-3 ${theme}`}>
      <div className="flex items-center gap-1.5 mb-2 min-w-0">
        <span className="text-sm">{emoji}</span>
        <p className="text-xs font-black truncate">{label}</p>
      </div>
      <div className="space-y-1.5">
        {recipe.granules.slice(0, 3).map((granule) => {
          const color = getGranuleColor(granule.id)
          const textClass = isLightColor(color) ? 'text-slate-800' : 'text-white'
          return (
            <div key={`${granule.id}-${granule.ratio}`} className="flex items-center gap-1.5 min-w-0">
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${textClass}`} style={{ backgroundColor: color }}>
                {granule.drops}
              </span>
              <span className="text-[10px] font-bold text-slate-700 truncate">{granule.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
// 향수 색상 헬퍼
function getGranuleColor(id: string) {
  const p = perfumes.find((pf: { id: string }) => pf.id === id)
  return p?.primaryColor || '#6B7280'
}
function isLightColor(hex: string) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 180
}

// 선택 가능한 레시피 카드
function SelectableRecipeCard({ label, recipe, selected, onSelect, accentColor, originalPerfumeId, originalPerfumeName, retentionPercentage }: {
  label: string
  recipe: GeneratedRecipe
  selected: boolean
  onSelect: () => void
  accentColor: 'violet' | 'pink'
  originalPerfumeId?: string
  originalPerfumeName?: string
  retentionPercentage?: number
}) {
  const t = useTranslations()
  const [chartOpen, setChartOpen] = useState(false)
  const st = accentColor === 'violet'
    ? { border: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', accent: 'bg-violet-500' }
    : { border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', accent: 'bg-pink-500' }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      aria-pressed={selected}
      className={`relative w-full text-left border-2 rounded-xl overflow-hidden transition-all cursor-pointer ${
        selected
          ? `${st.border} ${st.bg} shadow-[3px_3px_0_0_black] -translate-x-[1px] -translate-y-[1px]`
          : 'border-slate-300 bg-white hover:border-black'
      }`}
    >
      {/* 선택 라디오 인디케이터 — 우상단 큰 원 */}
      <div className="absolute top-3 right-3 z-10">
        <div
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
            selected
              ? `${st.accent} border-black shadow-[2px_2px_0_0_black]`
              : 'bg-white border-slate-300'
          }`}
        >
          {selected ? (
            <Check size={16} className="text-white" strokeWidth={3} />
          ) : (
            <span className="w-2 h-2 rounded-full bg-slate-200" />
          )}
        </div>
      </div>

      <div className={`px-4 py-2 border-b ${selected ? 'border-black' : 'border-slate-200'} flex items-center gap-2 pr-12`}>
        <span className={`text-base font-black ${selected ? st.text : 'text-slate-700'}`}>{label}</span>
        {!selected && <span className="text-[10px] text-slate-400 font-bold">{t('chemistry.feedbackModal.tapToSelect')}</span>}
        {selected && <span className={`text-[10px] font-black ${st.text}`}>· {t('chemistry.feedbackModal.selected')}</span>}
      </div>

      {/* 원본 향 표시 */}
      {originalPerfumeId && originalPerfumeName && (
        <div className="p-3 pb-0">
          <OriginalPerfumeCard
            perfumeId={originalPerfumeId}
            perfumeName={originalPerfumeName}
            retentionPercentage={retentionPercentage}
            label={t('chemistry.feedbackModal.baseOriginal')}
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {recipe.granules.map((g, i) => {
          const bgColor = getGranuleColor(g.id)
          const txtCls = isLightColor(bgColor) ? 'text-slate-800 border border-slate-200' : 'text-white'
          const isOriginal = originalPerfumeId && g.id === originalPerfumeId
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-black flex-shrink-0 ${txtCls}`} style={{ backgroundColor: bgColor }}>
                <span className="text-base leading-none">{g.drops}</span>
                <span className="text-[8px] opacity-70">{t('chemistry.feedbackModal.drops')}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">{g.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">{g.ratio}%</span>
                  {isOriginal && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-bold border border-violet-200">{t('chemistry.feedbackModal.original')}</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{g.id}</span>
              </div>
            </div>
          )
        })}
        {recipe.overallExplanation && (
          <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-100">{recipe.overallExplanation}</p>
        )}

        {/* 향 밸런스 변화 차트 — 토글 (기본 접힘) */}
        {recipe.categoryChanges && recipe.categoryChanges.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setChartOpen((v) => !v) }}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
            >
              <span>📊 {t('chemistry.feedbackModal.viewBalanceChange')}</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${chartOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {chartOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <CategoryChangeChart categoryChanges={recipe.categoryChanges} compact />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
