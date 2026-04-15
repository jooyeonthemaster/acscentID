"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import type { ChemistryAnalysisResult, ImageAnalysisResult } from "@/types/analysis"
import { ChemistryPrologue } from "./ChemistryPrologue"
import { CharacterScentChapter } from "./CharacterScentChapter"
import { ChemistryMeetingChapter } from "./ChemistryMeetingChapter"
import { ChemistryBottomActions } from "./ChemistryBottomActions"
import { ChemistryFeedbackModal } from "./ChemistryFeedbackModal"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import { apiFetch } from "@/lib/api-client"
import { PRODUCT_PRICING } from "@/types/cart"

interface ChemistryFormMeta {
  character1Name: string
  character2Name: string
  image1Preview: string | null
  image2Preview: string | null
  serviceMode?: string
  qrCode?: string | null
  pin?: string | null
}

type MainTabType = 'characterA' | 'characterB' | 'chemistry'
type CharSubTabType = 'perfume' | 'analysis'

const CHEMISTRY_SECTIONS = [
  { id: 'face', label: '얼굴합', emoji: '\u{1F4F8}' },
  { id: 'type', label: '케미 타입', emoji: '\u{1F36F}' },
  { id: 'traits', label: '특성', emoji: '\u{1F4CA}' },
  { id: 'scent', label: '향', emoji: '\u{1F9EA}' },
  { id: 'dynamic', label: '관계', emoji: '\u{1F4AB}' },
] as const

// 개별 캐릭터 프로필 헤더
function CharacterProfileHeader({ name, emoji, imagePreview, accentColor, analysis }: {
  name: string
  emoji: string
  imagePreview: string | null
  accentColor: 'violet' | 'pink'
  analysis: ImageAnalysisResult
}) {
  const isViolet = accentColor === 'violet'
  const borderColor = isViolet ? 'border-violet-400' : 'border-pink-400'
  const shadowColor = isViolet ? 'shadow-[3px_3px_0_0_#8b5cf6]' : 'shadow-[3px_3px_0_0_#ec4899]'
  const ringColor = isViolet ? 'ring-violet-200' : 'ring-pink-200'
  const bgGradient = isViolet ? 'from-violet-50 to-violet-100/50' : 'from-pink-50 to-pink-100/50'
  const textColor = isViolet ? 'text-violet-600' : 'text-pink-600'
  const perfume = analysis.matchingPerfumes?.[0]
  const mood = analysis.analysis?.mood || ''

  return (
    <div className="px-4 mb-5">
      <div className={`bg-gradient-to-br ${bgGradient} border-2 border-black rounded-2xl shadow-[4px_4px_0_0_black] overflow-hidden`}>
        <div className="flex items-center gap-4 p-5">
          {/* 이미지 */}
          <div className={`w-20 h-20 rounded-full border-3 ${borderColor} overflow-hidden flex-shrink-0 ${shadowColor} ring-2 ${ringColor} ring-offset-2`}>
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-white flex items-center justify-center text-2xl`}>{emoji}</div>
            )}
          </div>
          {/* 텍스트 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{emoji}</span>
              <h2 className="text-lg font-black text-slate-900 truncate">{name}</h2>
            </div>
            {mood && (
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{mood}</p>
            )}
            {perfume?.persona?.name && (
              <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-white/80 rounded-full border border-slate-200`}>
                <span className="text-[10px]">{String.fromCodePoint(0x1F48E)}</span>
                <span className={`text-[11px] font-bold ${textColor} truncate max-w-[140px]`}>{perfume.persona.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChemistryResultPage() {
  const router = useRouter()
  const { user, unifiedUser } = useAuth()
  const { showToast } = useToast()
  const [result, setResult] = useState<ChemistryAnalysisResult | null>(null)
  const [formMeta, setFormMeta] = useState<ChemistryFormMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<MainTabType>('characterA')
  const [charSubTab, setCharSubTab] = useState<CharSubTabType>('perfume')
  const [isAdding, setIsAdding] = useState(false)
  const [isShareSaving, setIsShareSaving] = useState(false)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)
  const [feedbackTarget, setFeedbackTarget] = useState<'A' | 'B' | null>(null)
  const tabContentRef = useRef<HTMLDivElement>(null)
  const chemistrySectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const handleTabChange = useCallback((tab: MainTabType) => {
    setMainTab(tab)
    if (tab !== 'chemistry') setCharSubTab('perfume')
    setTimeout(() => {
      tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [])

  const scrollToChemistrySection = useCallback((sectionId: string) => {
    const el = chemistrySectionRefs.current[sectionId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  useEffect(() => {
    try {
      const resultStr = sessionStorage.getItem('chemistry_result')
      const formStr = sessionStorage.getItem('chemistry_form')

      if (resultStr) {
        setResult(JSON.parse(resultStr))
      }
      if (formStr) {
        setFormMeta(JSON.parse(formStr))
      }
    } catch (error) {
      console.error('Failed to load chemistry result:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── 공통: DB에 결과 저장 (중복 방지) ──
  const saveResultToDb = useCallback(async (
    analysisResult: ChemistryAnalysisResult,
    meta: ChemistryFormMeta | null,
  ): Promise<string | null> => {
    // 이미 저장된 경우 기존 sessionId 반환
    if (savedSessionId) return savedSessionId

    const userId = user?.id || unifiedUser?.id
    const fingerprint = typeof window !== 'undefined'
      ? localStorage.getItem('user_fingerprint')
      : null

    const saveResponse = await apiFetch('/api/results/chemistry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisResult,
        character1Name: meta?.character1Name || 'A',
        character2Name: meta?.character2Name || 'B',
        character1ImageUrl: meta?.image1Preview || null,
        character2ImageUrl: meta?.image2Preview || null,
        userId: userId || null,
        userFingerprint: fingerprint,
        serviceMode: meta?.serviceMode || 'online',
        pin: meta?.pin || null,
        qrCode: meta?.qrCode || null,
      }),
    })
    const saveData = await saveResponse.json()

    if (saveData.success && saveData.sessionId) {
      setSavedSessionId(saveData.sessionId)
      return saveData.sessionId
    }
    return null
  }, [savedSessionId, user, unifiedUser])

  // ── 자동 저장: 결과 페이지 로드 시 DB에 바로 저장 ──
  useEffect(() => {
    if (!result || savedSessionId) return
    if (!user && !unifiedUser) return // 로그인 필요

    saveResultToDb(result, formMeta).catch((err) => {
      console.error('[Chemistry AutoSave] Failed:', err)
    })
  }, [result, formMeta, user, unifiedUser, savedSessionId, saveResultToDb])

  const handleShare = useCallback(async () => {
    if (!result) return
    setIsShareSaving(true)
    try {
      const sessionId = await saveResultToDb(result, formMeta)

      if (sessionId) {
        const shareUrl = `${window.location.origin}/result/${sessionId}`
        if (typeof navigator.share !== 'undefined') {
          await navigator.share({
            title: `${formMeta?.character1Name} x ${formMeta?.character2Name} 케미 분석`,
            url: shareUrl,
          })
        } else {
          await navigator.clipboard.writeText(shareUrl)
          showToast("공유 링크가 복사되었습니다!", "success")
        }
      } else {
        showToast("공유 링크 생성에 실패했습니다.", "error")
      }
    } catch (error) {
      console.error('Share error:', error)
      showToast("공유에 실패했습니다.", "error")
    } finally {
      setIsShareSaving(false)
    }
  }, [result, formMeta, showToast, saveResultToDb])

  const handleAddToCart = useCallback(async () => {
    if (!result || isAdding) return
    if (!user && !unifiedUser) {
      showToast("로그인이 필요합니다.", "error")
      return
    }
    setIsAdding(true)
    try {
      const perfumeA = result.characterA.matchingPerfumes[0]?.persona
      const perfumeB = result.characterB.matchingPerfumes[0]?.persona
      const pricing = PRODUCT_PRICING.chemistry_set
      const selectedOption = pricing[0]

      const sessionId = await saveResultToDb(result, formMeta)
      if (!sessionId) throw new Error('결과 저장 실패')

      const cartResponse = await apiFetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: sessionId,
          product_type: 'chemistry_set',
          perfume_name: `${perfumeA?.name || '향수 A'} x ${perfumeB?.name || '향수 B'}`,
          perfume_brand: "AC'SCENT",
          twitter_name: `${formMeta?.character1Name || 'A'} x ${formMeta?.character2Name || 'B'}`,
          size: selectedOption.size,
          price: selectedOption.price,
          quantity: 1,
        }),
      })
      const cartData = await cartResponse.json()
      if (cartData.success) {
        showToast("장바구니에 추가되었습니다!", "success")
      } else {
        throw new Error(cartData.error)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '장바구니 추가에 실패했습니다.'
      showToast(msg, "error")
    } finally {
      setIsAdding(false)
    }
  }, [result, isAdding, user, unifiedUser, formMeta, showToast, saveResultToDb])

  const handleCheckout = useCallback(async () => {
    if (!result || isAdding) return
    if (!user && !unifiedUser) {
      showToast("로그인이 필요합니다.", "error")
      return
    }

    setIsAdding(true)
    try {
      const perfumeA = result.characterA.matchingPerfumes[0]?.persona
      const perfumeB = result.characterB.matchingPerfumes[0]?.persona
      const pricing = PRODUCT_PRICING.chemistry_set
      const selectedOption = pricing[0]

      const sessionId = await saveResultToDb(result, formMeta)
      if (!sessionId) throw new Error('결과 저장 실패')

      // 장바구니 추가
      await apiFetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: sessionId,
          product_type: 'chemistry_set',
          perfume_name: `${perfumeA?.name || '향수 A'} x ${perfumeB?.name || '향수 B'}`,
          perfume_brand: "AC'SCENT",
          twitter_name: `${formMeta?.character1Name || 'A'} x ${formMeta?.character2Name || 'B'}`,
          size: selectedOption.size,
          price: selectedOption.price,
          quantity: 1,
        }),
      })

      // 체크아웃 페이지에 필요한 localStorage 데이터 설정
      localStorage.setItem('checkoutProductType', 'chemistry_set')
      localStorage.setItem('checkoutAnalysisId', sessionId)

      // 체크아웃 이동
      router.push('/checkout')
    } catch (error) {
      const msg = error instanceof Error ? error.message : '결제 진행에 실패했습니다.'
      showToast(msg, "error")
      setIsAdding(false)
    }
  }, [result, isAdding, user, unifiedUser, formMeta, showToast, router, saveResultToDb])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEF9C3] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 border-2 border-slate-900 shadow-[4px_4px_0px_#000] text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-slate-900 rounded-xl animate-spin mx-auto mb-4" />
          <p className="text-slate-900 font-black">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!result || !formMeta) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center gap-4">
        <div className="bg-white rounded-2xl p-8 border-2 border-slate-900 shadow-[4px_4px_0px_#000] text-center">
          <p className="text-slate-500 mb-4">결과를 찾을 수 없습니다.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-yellow-400 text-black font-black rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all"
          >
            홈으로
          </button>
        </div>
      </div>
    )
  }

  const { characterA, characterB, chemistry } = result
  const { character1Name, character2Name, image1Preview, image2Preview } = formMeta

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* 배경 */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
        <div className="absolute inset-0 z-0 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200 rounded-full mix-blend-multiply animate-blob-rotate" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply animate-blob-rotate-reverse" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply animate-blob-rotate-fast" />
        </div>
      </div>

      <Header showBack backHref="/" />

      {/* 통합 스티키 네비게이션 - 헤더(86px) 바로 아래 */}
      <div className="fixed top-[86px] left-0 right-0 z-40">
        <div className="w-full max-w-[455px] mx-auto bg-[#FAFAFA]/95 backdrop-blur-md border-b border-slate-200/60">
          {/* 메인 탭 */}
          <div className="px-4 pt-2 pb-1.5 space-y-1">
            {/* 두 인물 탭 — 2열 */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => handleTabChange('characterA')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-bold transition-all rounded-lg ${
                  mainTab === 'characterA'
                    ? 'text-white bg-violet-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="text-xs">{String.fromCodePoint(0x1F319)}</span>
                <span className="truncate max-w-[70px]">{character1Name}</span>
              </button>
              <button
                onClick={() => handleTabChange('characterB')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-bold transition-all rounded-lg ${
                  mainTab === 'characterB'
                    ? 'text-white bg-pink-500 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="text-xs">{String.fromCodePoint(0x2600, 0xFE0F)}</span>
                <span className="truncate max-w-[70px]">{character2Name}</span>
              </button>
            </div>
            {/* 케미 탭 — 가로 전체, 강조 색상 */}
            <div className="bg-gradient-to-r from-violet-100 to-pink-100 p-1 rounded-xl">
              <button
                onClick={() => handleTabChange('chemistry')}
                className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-bold transition-all rounded-lg ${
                  mainTab === 'chemistry'
                    ? 'text-white bg-gradient-to-r from-violet-500 to-pink-500 shadow-sm'
                    : 'text-violet-500 hover:text-violet-700'
                }`}
              >
                <span className="text-xs">{String.fromCodePoint(0x26A1)}</span>
                <span>케미 분석</span>
              </button>
            </div>
          </div>

          {/* 하위 탭 - 캐릭터 탭일 때 */}
          {(mainTab === 'characterA' || mainTab === 'characterB') && (
            <div className="px-4 pb-2">
              <div className="grid grid-cols-2 gap-1 bg-white/80 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setCharSubTab('perfume')}
                  className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                    charSubTab === 'perfume'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>{String.fromCodePoint(0x1F48E)}</span>
                  <span>퍼퓸 추천</span>
                </button>
                <button
                  onClick={() => setCharSubTab('analysis')}
                  className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                    charSubTab === 'analysis'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>{String.fromCodePoint(0x1F50D)}</span>
                  <span>분석 결과</span>
                </button>
              </div>
            </div>
          )}

          {/* 하위 탭 - 케미 탭일 때: 섹션 앵커 */}
          {mainTab === 'chemistry' && (
            <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1 min-w-max">
                {CHEMISTRY_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToChemistrySection(section.id)}
                    className="flex items-center gap-0.5 px-2.5 py-1 bg-white/80 border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all active:scale-95 whitespace-nowrap"
                  >
                    <span>{section.emoji}</span>
                    <span>{section.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[455px] mx-auto pb-32">
        {/* 헤더(86px) + 스티키 탭(메인~84 + 하위~47 + border 1 = ~132px) 여백 */}
        <div className="h-[256px]" />

        {/* 탭 콘텐츠 */}
        <div ref={tabContentRef} className="scroll-mt-[256px]">
          <AnimatePresence mode="wait">
            {mainTab === 'characterA' && (
              <motion.div
                key="charA"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* 캐릭터 프로필 헤더 */}
                <CharacterProfileHeader
                  name={character1Name}
                  emoji={String.fromCodePoint(0x1F319)}
                  imagePreview={image1Preview}
                  accentColor="violet"
                  analysis={characterA}
                />
                <CharacterScentChapter
                  characterName={character1Name}
                  emoji={String.fromCodePoint(0x1F319)}
                  analysis={characterA}
                  accentColor="violet"
                  activeSubTab={charSubTab}
                />
              </motion.div>
            )}
            {mainTab === 'characterB' && (
              <motion.div
                key="charB"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* 캐릭터 프로필 헤더 */}
                <CharacterProfileHeader
                  name={character2Name}
                  emoji={String.fromCodePoint(0x2600, 0xFE0F)}
                  imagePreview={image2Preview}
                  accentColor="pink"
                  analysis={characterB}
                />
                <CharacterScentChapter
                  characterName={character2Name}
                  emoji={String.fromCodePoint(0x2600, 0xFE0F)}
                  analysis={characterB}
                  accentColor="pink"
                  activeSubTab={charSubTab}
                />
              </motion.div>
            )}
            {mainTab === 'chemistry' && (
              <motion.div
                key="chemistry"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {/* 케미 프롤로그 — 케미 탭에서만 */}
                <ChemistryPrologue
                  chemistry={chemistry}
                  character1Name={character1Name}
                  character2Name={character2Name}
                  image1Preview={image1Preview}
                  image2Preview={image2Preview}
                />
                <div className="mt-5">
                  <ChemistryMeetingChapter
                    chemistry={chemistry}
                    character1Name={character1Name}
                    character2Name={character2Name}
                    characterA={characterA}
                    characterB={characterB}
                    sectionRefs={chemistrySectionRefs}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. 푸터 */}
        <div className="w-full text-center pt-12 pb-8">
          <span className="text-[9px] font-semibold text-slate-400/80 tracking-[0.3em] uppercase">
            &copy; 2025 Ac&apos;scent Identity
          </span>
        </div>
      </div>

      {/* 5. 하단 액션 바 */}
      <ChemistryBottomActions
        onShare={handleShare}
        onAddToCart={handleAddToCart}
        onCheckout={handleCheckout}
        isShareSaving={isShareSaving}
        isAddingToCart={isAdding}
        isOffline={formMeta?.serviceMode === 'offline'}
        onFeedback={() => setFeedbackTarget('A')}
      />

      {/* 6. 케미 취향 반영 모달 */}
      <ChemistryFeedbackModal
        isOpen={feedbackTarget !== null}
        onClose={() => setFeedbackTarget(null)}
        sessionId={savedSessionId || ''}
        characterAName={character1Name}
        characterBName={character2Name}
        perfumeAId={characterA.matchingPerfumes?.[0]?.perfumeId || ''}
        perfumeAName={characterA.matchingPerfumes?.[0]?.persona?.name || ''}
        perfumeBId={characterB.matchingPerfumes?.[0]?.perfumeId || ''}
        perfumeBName={characterB.matchingPerfumes?.[0]?.persona?.name || ''}
        perfumeACharacteristics={(characterA.scentCategories ?? {}) as unknown as Record<string, number>}
        perfumeBCharacteristics={(characterB.scentCategories ?? {}) as unknown as Record<string, number>}
      />
    </div>
  )
}
