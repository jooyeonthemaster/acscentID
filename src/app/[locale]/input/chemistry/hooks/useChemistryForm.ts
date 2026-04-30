"use client"

import { useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/contexts/AuthContext"
import { compressImage } from "@/lib/image/compressor"
import { apiFetch } from "@/lib/api-client"
import type { ChemistryAnalysisResult } from "@/types/analysis"

export type ChemistryPhase = 'summon' | 'deck' | 'catalyst'

export interface ChemistryFormState {
  pin: string
  character1Name: string
  character2Name: string
  character1ImageBase64: string | null
  character2ImageBase64: string | null
  relationTropes: string[]
  character1Archetypes: string[]
  character2Archetypes: string[]
  scenes: string[]
  emotionKeywords: string[]
  scentDirection: number
  message: string
  // 주관식 직접 입력 필드
  customTrope: string
  customArchetype1: string
  customArchetype2: string
  customScene: string
  customEmotion: string
}

const INITIAL_FORM_DATA: ChemistryFormState = {
  pin: "",
  character1Name: "",
  character2Name: "",
  character1ImageBase64: null,
  character2ImageBase64: null,
  relationTropes: [],
  character1Archetypes: [],
  character2Archetypes: [],
  scenes: [],
  emotionKeywords: [],
  scentDirection: 50,
  message: "",
  customTrope: "",
  customArchetype1: "",
  customArchetype2: "",
  customScene: "",
  customEmotion: "",
}

export function useChemistryForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()
  const mode = searchParams.get("mode")
  const serviceMode = searchParams.get("service_mode")
  // [FIX] CRITICAL #11: QR 코드 파라미터 추출
  const qrCode = searchParams.get("qr_code")

  // 인증 상태 — 케미는 온라인/오프라인 무관하게 로그인 필수
  const { user, unifiedUser, loading: authLoading } = useAuth()
  const isLoggedIn = !!(user || unifiedUser)
  const showAuthGate = !isLoggedIn && !authLoading

  const [phase, setPhase] = useState<ChemistryPhase>('summon')
  const [currentCard, setCurrentCard] = useState(0)
  const [formData, setFormData] = useState<ChemistryFormState>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
  const [isCompressing1, setIsCompressing1] = useState(false)
  const [isCompressing2, setIsCompressing2] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ChemistryAnalysisResult | null>(null)

  const isOffline = mode === "qr" || serviceMode === "offline"
  const isOnline = !isOffline

  const TOTAL_CARDS = 6

  // 이미지 업로드 핸들러
  const handleImage1Upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsCompressing1(true)
    try {
      const base64 = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 })
      setFormData(prev => ({ ...prev, character1ImageBase64: base64 }))
    } catch {
      showToast("이미지 처리 중 오류가 발생했습니다.", "error")
    } finally {
      setIsCompressing1(false)
    }
  }, [showToast])

  const handleImage2Upload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsCompressing2(true)
    try {
      const base64 = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 })
      setFormData(prev => ({ ...prev, character2ImageBase64: base64 }))
    } catch {
      showToast("이미지 처리 중 오류가 발생했습니다.", "error")
    } finally {
      setIsCompressing2(false)
    }
  }, [showToast])

  const removeImage1 = useCallback(() => {
    setFormData(prev => ({ ...prev, character1ImageBase64: null }))
  }, [])

  const removeImage2 = useCallback(() => {
    setFormData(prev => ({ ...prev, character2ImageBase64: null }))
  }, [])

  // Phase 전환
  const isSummonValid = useCallback(() => {
    return (
      formData.character1Name.trim().length > 0 &&
      formData.character2Name.trim().length > 0 &&
      formData.character1ImageBase64 !== null &&
      formData.character2ImageBase64 !== null &&
      (isOnline || formData.pin.length === 4)
    )
  }, [formData, isOnline])

  const goToDeck = useCallback(() => {
    if (showAuthGate) return
    if (!isSummonValid()) return
    setPhase('deck')
    setCurrentCard(0)
  }, [isSummonValid, showAuthGate])

  // 카드 네비게이션
  const nextCard = useCallback(() => {
    if (currentCard < TOTAL_CARDS - 1) {
      setCurrentCard(prev => prev + 1)
    } else {
      setPhase('catalyst')
    }
  }, [currentCard])

  const prevCard = useCallback(() => {
    if (currentCard > 0) {
      setCurrentCard(prev => prev - 1)
    } else {
      setPhase('summon')
    }
  }, [currentCard])

  // 카드별 유효성 검사
  const isCardValid = useCallback((cardIndex: number): boolean => {
    switch (cardIndex) {
      case 0: return formData.relationTropes.length > 0 || (formData.customTrope?.trim().length ?? 0) > 0
      case 1: return formData.character1Archetypes.length > 0 || (formData.customArchetype1?.trim().length ?? 0) > 0
      case 2: return formData.character2Archetypes.length > 0 || (formData.customArchetype2?.trim().length ?? 0) > 0
      case 3: return formData.scenes.length > 0 || (formData.customScene?.trim().length ?? 0) > 0
      case 4: return formData.emotionKeywords.length >= 2 || (formData.customEmotion?.trim().length ?? 0) > 0
      case 5: return true // 슬라이더는 항상 유효
      default: return false
    }
  }, [formData])

  // 감정 키워드 토글
  const toggleEmotion = useCallback((keyword: string) => {
    setFormData(prev => {
      const current = prev.emotionKeywords
      if (current.includes(keyword)) {
        return { ...prev, emotionKeywords: current.filter(k => k !== keyword) }
      }
      if (current.length >= 3) return prev
      return { ...prev, emotionKeywords: [...current, keyword] }
    })
  }, [])

  // 분석 시작
  const handleComplete = useCallback(async () => {
    if (showAuthGate) return
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      // [FIX] CRITICAL #11: serviceMode/PIN/qrCode를 API에 전달
      const response = await apiFetch('/api/analyze/chemistry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character1Name: formData.character1Name,
          character2Name: formData.character2Name,
          character1ImageBase64: formData.character1ImageBase64,
          character2ImageBase64: formData.character2ImageBase64,
          relationTropes: formData.relationTropes,
          character1Archetypes: formData.character1Archetypes,
          character2Archetypes: formData.character2Archetypes,
          scenes: formData.scenes,
          emotionKeywords: formData.emotionKeywords,
          scentDirection: formData.scentDirection,
          message: formData.message,
          customTrope: formData.customTrope || null,
          customArchetype1: formData.customArchetype1 || null,
          customArchetype2: formData.customArchetype2 || null,
          customScene: formData.customScene || null,
          customEmotion: formData.customEmotion || null,
          serviceMode: isOffline ? 'offline' : 'online',
          pin: formData.pin || null,
          qrCode: qrCode || null,
        }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        setAnalysisResult(data.data)
        setIsAnalysisComplete(true)
      } else {
        throw new Error(data.error || '분석에 실패했습니다.')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류'
      showToast(`분석 오류: ${errorMsg}`, "error")
      setIsSubmitting(false)
    }
  }, [formData, isSubmitting, showToast])

  // 결과 페이지로 이동
  const navigateToResult = useCallback(() => {
    if (!analysisResult) return

    // [FIX] CRITICAL #12: 결과와 서비스 메타데이터를 sessionStorage에 저장
    sessionStorage.setItem('chemistry_result', JSON.stringify(analysisResult))
    sessionStorage.setItem('chemistry_form', JSON.stringify({
      character1Name: formData.character1Name,
      character2Name: formData.character2Name,
      image1Preview: formData.character1ImageBase64,
      image2Preview: formData.character2ImageBase64,
      serviceMode: isOffline ? 'offline' : 'online',
      qrCode: qrCode || null,
      pin: formData.pin || null,
    }))

    router.push('/result?type=chemistry')
  }, [analysisResult, formData, router])

  return {
    phase,
    setPhase,
    currentCard,
    formData,
    setFormData,
    isSubmitting,
    isAnalysisComplete,
    isCompressing1,
    isCompressing2,
    isOffline,
    isOnline,
    showAuthGate,
    TOTAL_CARDS,
    isSummonValid,
    isCardValid,
    goToDeck,
    nextCard,
    prevCard,
    toggleEmotion,
    handleImage1Upload,
    handleImage2Upload,
    removeImage1,
    removeImage2,
    handleComplete,
    navigateToResult,
    image1Preview: formData.character1ImageBase64,
    image2Preview: formData.character2ImageBase64,
  }
}
