"use client"

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'

// Hooks
import { useResultData } from '../hooks/useResultData'
import { useAutoSave } from '../hooks/useAutoSave'

// Auth
import { useAuth } from '@/contexts/AuthContext'

// Components
import { TwitterNameDisplay } from './TwitterNameDisplay'
import { TabNavigation } from './TabNavigation'
import { AnalysisTab } from './AnalysisTab'
import { PerfumeTab } from './PerfumeTab'
import { ComparisonTab } from './ComparisonTab'
import { ShareModal } from './ShareModal'
import { FeedbackModal } from './FeedbackModal'
import { FeedbackHistory } from './feedback/FeedbackHistory'
import { ResultBottomActions } from './ResultBottomActions'
import { DesktopResultActions } from './DesktopResultActions'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { AuthModal } from '@/components/auth/AuthModal'
import { ViewportSwitch } from '@/components/desktop/ViewportSwitch'
// 졸업 모드 컴포넌트
import { GraduationTab } from './graduation'

import { useProductPricing } from '@/hooks/useProductPricing'
import { useLocalizedPerfumes } from '@/hooks/useLocalizedPerfumes'
import { SCENT_PAPER_SIZE, STANDARD_PERFUME_10ML_PRICE, type ProductType } from '@/types/cart'
import type { GraduationAnalysisResult } from '@/types/analysis'

// 애니메이션 variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
}

export default function ResultPageMain() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations()
  const { user, unifiedUser, loading: authLoading } = useAuth()
  const { getOption, getDefaultPrice, getDefaultSize } = useProductPricing()
  const { getLocalizedName } = useLocalizedPerfumes()

  // 뒤로가기 경로 결정 (마이페이지에서 왔으면 마이페이지로)
  const fromPage = searchParams.get('from')
  const backHref = fromPage === 'mypage' ? '/mypage' : '/'
  // 탭 타입 (피규어 모드, 졸업 모드 포함)
  type TabType = 'analysis' | 'perfume' | 'comparison' | 'graduation'
  const [activeTab, setActiveTab] = useState<TabType>('perfume')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isFeedbackHistoryOpen, setIsFeedbackHistoryOpen] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const {
    loading,
    error,
    userImage,
    twitterName,
    userInfo,
    displayedAnalysis,
    existingResultId,
    idolName,
    // 피규어 모드 데이터
    isFigureMode,
    figureImage,
    // 피규어 온라인 모드 데이터
    modelingImage,
    modelingRequest,
    productType,
    isFigureOnlineMode,
    // 졸업 모드
    isGraduationMode,
    // 서비스 모드 (DB 또는 localStorage에서 로드)
    serviceMode: loadedServiceMode,
    // 분석 대상 타입 (idol: 최애 / self: 나)
    targetType
  } = useResultData()

  // 서비스 모드: DB/localStorage에서 로드된 값 사용, 없으면 기본값 'offline'
  const serviceMode = loadedServiceMode || 'offline'
  const checkoutProductType: ProductType = isFigureMode ? 'figure_diffuser' : ((productType as ProductType) || 'image_analysis')
  const canBuyScentPaper = serviceMode === 'online' && checkoutProductType === 'image_analysis' && !isGraduationMode
  const topPerfume = displayedAnalysis?.matchingPerfumes?.[0]
  const topPerfumeName = topPerfume?.perfumeId
    ? getLocalizedName(topPerfume.perfumeId, topPerfume.persona?.name)
    : topPerfume?.persona?.name

  // 졸업 모드일 때 기본 탭을 'perfume'으로 설정 (추천 향수 먼저 표시)
  useEffect(() => {
    if (isGraduationMode) {
      setActiveTab('perfume')
    }
  }, [isGraduationMode])


  // 자동 저장 훅 (authLoading이 완료된 후에만 저장 시작)
  const {
    isSaved: isAutoSaved,
    isSaving: isAutoSaving,
    savedResultId,
    showLoginPrompt,
    setShowLoginPrompt
  } = useAutoSave({
    analysisResult: displayedAnalysis,
    userImage,
    twitterName,
    userId: user?.id || unifiedUser?.id || null,
    authLoading,  // 로딩 완료 후 저장하도록 전달
    existingResultId,  // URL에 id가 있으면 저장 스킵
    idolName,  // 최애 이름
    idolGender: userInfo?.gender || null,  // 최애 성별
    // 피규어 온라인 모드 전용
    modelingImage,
    modelingRequest,
    productType,
    // 오프라인 모드 인증 번호
    pin: userInfo?.pin || null,
    // 분석 대상 타입 (최애/나)
    targetType
  })

  const handleRestart = () => {
    localStorage.removeItem('analysisResult')
    localStorage.removeItem('userImage')
    localStorage.removeItem('savedResultId')
    router.push('/')
  }

  // 바로 구매하기 - productType, analysisId 정보 저장 후 결제 페이지로 이동
  const handleCheckout = useCallback(() => {
    localStorage.setItem('checkoutProductType', checkoutProductType)

    // 분석 ID 저장 (주문과 분석 결과 연결용)
    const analysisIdToSave = savedResultId || existingResultId
    if (analysisIdToSave) {
      localStorage.setItem('checkoutAnalysisId', analysisIdToSave)
    }

    router.push('/checkout')
  }, [checkoutProductType, savedResultId, existingResultId, router])

  // 시향지로 먼저 받아보기 - 같은 분석 결과를 시향지 옵션으로 결제
  const handleScentPaperCheckout = useCallback(() => {
    if (!canBuyScentPaper) return

    localStorage.setItem('checkoutProductType', 'image_analysis')
    localStorage.setItem('checkoutSelectedSize', SCENT_PAPER_SIZE)

    const analysisIdToSave = savedResultId || existingResultId
    if (analysisIdToSave) {
      localStorage.setItem('checkoutAnalysisId', analysisIdToSave)
    }

    router.push('/checkout')
  }, [canBuyScentPaper, savedResultId, existingResultId, router])

  // 장바구니 담기
  const handleAddToCart = useCallback(async () => {
    if (!displayedAnalysis || isAddingToCart) return

    // 로그인 확인
    if (!user && !unifiedUser) {
      setShowLoginPrompt(true)
      return
    }

    setIsAddingToCart(true)

    try {
      const topPerfume = displayedAnalysis.matchingPerfumes?.[0]
      const perfumeName = topPerfume?.perfumeId
        ? getLocalizedName(topPerfume.perfumeId, topPerfume.persona?.name)
        : topPerfume?.persona?.name || t('result.recommendedPerfume')
      const perfumeBrand = topPerfume?.persona?.recommendation || "AC'SCENT"
      const analysisId = savedResultId || existingResultId || `temp-${Date.now()}`

      // productType에 따른 상품 정보 결정 (isFigureMode면 무조건 figure_diffuser)
      const currentProductType: ProductType = isFigureMode ? 'figure_diffuser' : ((productType as ProductType) || 'image_analysis')
      let cartSize: string
      let cartPrice: number

      if (currentProductType === 'figure_diffuser') {
        cartSize = 'set'
        cartPrice = getOption('figure_diffuser', 'set')?.price ?? 48000
      } else if (currentProductType === 'graduation') {
        cartSize = '10ml'
        cartPrice = getOption('graduation', '10ml')?.price ?? STANDARD_PERFUME_10ML_PRICE
      } else {
        // image_analysis, personal_scent 등 — 기본 50ml
        cartSize = '50ml'
        cartPrice = getOption(currentProductType, '50ml')?.price
          ?? getDefaultPrice(currentProductType)
          ?? 48000
        // 50ml 옵션이 없으면 기본 사이즈로 폴백
        if (!getOption(currentProductType, '50ml')) {
          cartSize = getDefaultSize(currentProductType)
        }
      }

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          product_type: currentProductType,
          perfume_name: perfumeName,
          perfume_brand: perfumeBrand,
          twitter_name: twitterName,
          size: cartSize,
          price: cartPrice,
          image_url: userImage,
          analysis_data: displayedAnalysis
        })
      })

      const data = await response.json()

      if (data.success) {
        // 장바구니 페이지로 이동
        router.push('/mypage?tab=cart')
      } else {
        alert(data.error || t('errors.cartAddFailed'))
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      alert(t('errors.cartAddError'))
    } finally {
      setIsAddingToCart(false)
    }
  }, [displayedAnalysis, isAddingToCart, user, unifiedUser, savedResultId, existingResultId, isFigureMode, productType, twitterName, userImage, router, setShowLoginPrompt, getLocalizedName, t])

  // 결과 저장 및 공유 URL 생성
  const handleShare = useCallback(async () => {
    if (!displayedAnalysis) return

    // 이미 저장된 URL이 있으면 바로 모달 열기
    if (shareUrl) {
      setIsShareModalOpen(true)
      return
    }

    // 자동 저장된 ID가 있으면 사용
    if (savedResultId) {
      const newShareUrl = `${window.location.origin}/result/${savedResultId}`
      setShareUrl(newShareUrl)
      setIsShareModalOpen(true)
      return
    }

    setIsSaving(true)

    try {
      // 향수 정보 추출
      const topPerfume = displayedAnalysis.matchingPerfumes?.[0]
      const perfumeName = topPerfume?.perfumeId
        ? getLocalizedName(topPerfume.perfumeId, topPerfume.persona?.name)
        : topPerfume?.persona?.name || t('result.recommendedPerfume')
      const perfumeBrand = topPerfume?.persona?.recommendation || 'AC\'SCENT'

      // fingerprint 가져오기
      const fingerprint = typeof window !== 'undefined'
        ? localStorage.getItem('user_fingerprint')
        : null

      // API로 결과 저장 (userId, userFingerprint 포함)
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImageUrl: userImage || null,
          analysisData: displayedAnalysis,
          twitterName,
          perfumeName,
          perfumeBrand,
          matchingKeywords: displayedAnalysis.matchingKeywords || [],
          userId: user?.id || unifiedUser?.id || null,
          userFingerprint: fingerprint
        })
      })

      const data = await response.json()

      if (data.success && data.id) {
        const newShareUrl = `${window.location.origin}/result/${data.id}`
        setShareUrl(newShareUrl)
      }

      setIsShareModalOpen(true)
    } catch (error) {
      console.error('Save error:', error)
      // 저장 실패해도 현재 URL로 공유 가능하게
      setIsShareModalOpen(true)
    } finally {
      setIsSaving(false)
    }
  }, [displayedAnalysis, userImage, twitterName, shareUrl, savedResultId, getLocalizedName, t])

  // 로딩 상태 - 키치 스타일
  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[var(--canvas)] font-wanted">
        {/* 배경 */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--line)] rounded-full mix-blend-multiply animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[var(--line)] rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-[var(--line)] rounded-full mix-blend-multiply animate-blob animation-delay-4000" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center bg-[var(--soft)] rounded-[6px] p-8 border border-[var(--line)]"
        >
          <div className="w-16 h-16 border-4 border-[var(--line)] border-t-[var(--line)] rounded-[6px] animate-spin mx-auto mb-4" />
          <p className="text-[var(--ink)] font-bold">{t('result.loading')}</p>
          <p className="text-[var(--muted-ink)] text-sm lg:text-base mt-1 font-medium">{t('result.loadingHintEmoji')}</p>
        </motion.div>
      </div>
    )
  }

  // 에러 상태 - 키치 스타일
  if (error) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[var(--canvas)] font-wanted">
        {/* 배경 */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--line)] rounded-full mix-blend-multiply animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[var(--line)] rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center bg-[var(--soft)] rounded-[6px] p-8 max-w-sm border border-[var(--line)]"
        >
          <div className="w-16 h-16 bg-red-100 rounded-[6px] border border-[var(--line)] flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--ink)] mb-2">{t('errors.generic')}</h2>
          <p className="text-[var(--muted-ink)] text-sm lg:text-base mb-6 font-medium">{error}</p>
          <Button
            onClick={handleRestart}
            className="bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--soft)] rounded-[6px] px-6 py-3 font-bold border border-[var(--line)] transition-all"
          >
            {t('result.goBack')}
          </Button>
        </motion.div>
      </div>
    )
  }

  // ===== 모바일/데스크탑 공유 블록 (문자 그대로 호이스팅) =====
  const titleSection = (
                <motion.div variants={fadeInUp} className="text-center pt-8">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--ink)] rounded-[6px] border border-[var(--line)]">
                      <span className="text-[var(--ink)] text-xs lg:text-sm font-medium">{t('result.analysisComplete')}</span>
                    </div>
                    {isAutoSaving && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]">
                        <Loader2 size={12} className="text-[var(--muted-ink)] animate-spin" />
                        <span className="text-[var(--muted-ink)] text-xs lg:text-sm font-medium">{t('result.saving')}</span>
                      </div>
                    )}
                    {isAutoSaved && !isAutoSaving && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--soft)] rounded-[6px] border border-[var(--line)]">
                        <CheckCircle2 size={12} className="text-[var(--muted-ink)]" />
                        <span className="text-[var(--muted-ink)] text-xs lg:text-sm font-medium">{t('result.saved')}</span>
                      </div>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-[var(--ink)] leading-tight">
                    {isGraduationMode ? (
                      <>
                        {t('result.graduationTitle')}<br />
                        <span className="text-[var(--muted-ink)]">
                          {t('result.graduationSubtitle')}
                        </span>
                      </>
                    ) : isFigureMode ? (
                      <>
                        {t('result.figureTitle')}<br />
                        <span className="text-[var(--muted-ink)]">
                          {t('result.figureSubtitle')}
                        </span>
                      </>
                    ) : (
                      <>
                        {t('result.defaultTitle')}<br />
                        <span className="text-[var(--muted-ink)]">
                          {t('result.defaultSubtitle')}
                        </span>
                      </>
                    )}
                  </h1>
                </motion.div>
  )

  const imageSection = (
                <motion.div variants={fadeInUp} className="bg-[var(--soft)] rounded-[6px] p-4 space-y-4 border border-[var(--line)]">
                  {userImage && (
                    <div className="relative w-full aspect-[5/6] rounded-[6px] overflow-hidden bg-[var(--soft)] border border-[var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={userImage}
                        alt={t('result.uploadedImage')}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <TwitterNameDisplay twitterName={twitterName} idolName={userInfo?.name} idolGender={userInfo?.gender} />
                </motion.div>
  )

  const mobileResult = (
    <>
      {/* 헤더 */}
      <Header
        title={t('result.title')}
        showBack={true}
        backHref={backHref}
      />

      {/* 메인 콘텐츠 - 455px 고정 */}
      <main className="relative z-10 flex-1 pt-28 pb-6 overflow-y-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[455px] mx-auto px-4 flex flex-col gap-5"
        >
          {displayedAnalysis && (
            <>
              {/* ========== 455px 고정 레이아웃 ========== */}
              <div className="flex flex-col gap-5 w-full">
                {titleSection}

                {imageSection}

                {/* 탭 네비게이션 + 콘텐츠 - 모바일 키치 스타일 */}
                <motion.div variants={fadeInUp} className="bg-[var(--soft)] rounded-[6px] overflow-hidden border border-[var(--line)]">
                  <TabNavigation
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isFigureMode={isFigureMode}
                    isGraduationMode={isGraduationMode}
                  />

                  <div className="p-5">
                    <AnimatePresence mode="wait">
                      {activeTab === 'analysis' && (
                        <AnalysisTab key="analysis" displayedAnalysis={displayedAnalysis} />
                      )}
                      {activeTab === 'perfume' && (
                        <PerfumeTab key="perfume" displayedAnalysis={displayedAnalysis} />
                      )}
                      {activeTab === 'comparison' && (
                        <ComparisonTab key="comparison" displayedAnalysis={displayedAnalysis} />
                      )}
                      {/* 졸업 모드 전용 탭 */}
                      {activeTab === 'graduation' && isGraduationMode && (
                        <GraduationTab key="graduation" displayedAnalysis={displayedAnalysis as GraduationAnalysisResult} userName={userInfo?.name} />
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* 푸터 - 모바일 (하단 고정 버튼 공간 확보) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 1 }}
                  className="w-full text-center pb-36"
                >
                  <span className="text-[9px] font-semibold text-stone-400/80 tracking-[0.3em] uppercase">
                    © 2025 Ac&apos;scent Identity
                  </span>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      </main>

      {/* 모바일 하단 고정 액션 버튼 */}
      {displayedAnalysis && (
        <ResultBottomActions
          onShare={handleShare}
          onAddToCart={handleAddToCart}
          onCheckout={handleCheckout}
          onScentPaperCheckout={canBuyScentPaper ? handleScentPaperCheckout : undefined}
          onFeedback={() => setIsFeedbackModalOpen(true)}
          onFeedbackHistory={() => setIsFeedbackHistoryOpen(true)}
          isShareSaving={isSaving}
          isAddingToCart={isAddingToCart}
          serviceMode={serviceMode}
        />
      )}
    </>
  )

  const desktopResult = (
    <main className="relative z-10 flex-1 pb-16 pt-[116px]">
      {displayedAnalysis && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto grid w-full max-w-[1120px] grid-cols-[420px_minmax(0,1fr)] items-start gap-8 px-8"
        >
          {/* 좌측: 타이틀 + 이미지 + 액션 패널 (sticky) */}
          <div className="sticky top-[108px] flex flex-col gap-5 self-start">
            {titleSection}
            {imageSection}
            <motion.div variants={fadeInUp}>
              <DesktopResultActions
                onShare={handleShare}
                onAddToCart={handleAddToCart}
                onCheckout={handleCheckout}
                onScentPaperCheckout={canBuyScentPaper ? handleScentPaperCheckout : undefined}
                onFeedback={() => setIsFeedbackModalOpen(true)}
                onFeedbackHistory={() => setIsFeedbackHistoryOpen(true)}
                isShareSaving={isSaving}
                isAddingToCart={isAddingToCart}
                serviceMode={serviceMode}
              />
            </motion.div>
          </div>

          {/* 우측: 탭 카드 — 휴면 isDesktop 레이아웃 활성 */}
          <motion.div variants={fadeInUp} className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--line)] bg-[var(--soft)]">
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isFigureMode={isFigureMode}
              isGraduationMode={isGraduationMode}
              isDesktop
            />

            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'analysis' && (
                  <AnalysisTab key="analysis" displayedAnalysis={displayedAnalysis} isDesktop />
                )}
                {activeTab === 'perfume' && (
                  <PerfumeTab key="perfume" displayedAnalysis={displayedAnalysis} isDesktop />
                )}
                {activeTab === 'comparison' && (
                  <ComparisonTab key="comparison" displayedAnalysis={displayedAnalysis} isDesktop />
                )}
                {activeTab === 'graduation' && isGraduationMode && (
                  <GraduationTab key="graduation" displayedAnalysis={displayedAnalysis as GraduationAnalysisResult} userName={userInfo?.name} isDesktop />
                )}
              </AnimatePresence>
            </div>

            <div className="pb-6 text-center">
              <span className="text-[9px] font-semibold text-stone-400/80 tracking-[0.3em] uppercase">
                © 2025 Ac&apos;scent Identity
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </main>
  )

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-[var(--canvas)] font-wanted">
      {/* 배경 - CSS 애니메이션으로 성능 최적화 (뷰포트 모드 무관 단일 인스턴스) */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none bg-[var(--canvas)]">
        <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--line)] rounded-full mix-blend-multiply animate-blob-rotate" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[var(--line)] rounded-full mix-blend-multiply animate-blob-rotate-reverse" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-[var(--line)] rounded-full mix-blend-multiply animate-blob-rotate-fast" />
        </div>
      </div>

      <ViewportSwitch mobile={mobileResult} desktop={desktopResult} />

      {/* 공유 모달 */}
      {displayedAnalysis && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          userImage={userImage || undefined}
          twitterName={twitterName}
          userName={userInfo?.name || t('result.anonymous')}
          userGender={userInfo?.gender || 'Unknown'}
          perfumeName={topPerfumeName || t('result.recommendedPerfume')}
          perfumeBrand={displayedAnalysis.matchingPerfumes?.[0]?.persona?.recommendation || 'AC\'SCENT'}
          analysisData={displayedAnalysis}
          shareUrl={shareUrl}
        />
      )}

      {/* 피드백 모달 */}
      {displayedAnalysis && displayedAnalysis.matchingPerfumes?.[0] && (
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          perfumeId={displayedAnalysis.matchingPerfumes[0].perfumeId || 'AC\'SCENT 01'}
          perfumeName={topPerfumeName || t('result.recommendedPerfume')}
          perfumeCharacteristics={displayedAnalysis.matchingPerfumes[0].persona?.categories || { citrus: 5, floral: 5, woody: 5, musky: 5, fruity: 5, spicy: 5 }}
          perfumeCategory={
            displayedAnalysis.matchingPerfumes[0].persona?.categories
              ? Object.entries(displayedAnalysis.matchingPerfumes[0].persona.categories).reduce(
                (max, [key, val]) => (val > max.val ? { key, val } : max),
                { key: 'floral', val: 0 }
              ).key
              : 'floral'
          }
          resultId={existingResultId || savedResultId || undefined}
        />
      )}

      {/* 피드백 히스토리 모달 */}
      <FeedbackHistory
        isOpen={isFeedbackHistoryOpen}
        onClose={() => setIsFeedbackHistoryOpen(false)}
      />

      {/* 로그인 유도 모달 (익명 사용자용) */}
      <AuthModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        title={t('result.saveLoginTitle')}
        description={t('result.saveLoginDesc')}
      />
    </div>
  )
}
