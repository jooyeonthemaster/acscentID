"use client"

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw, Share2, MessageSquarePlus, History, CheckCircle2, Loader2, ShoppingCart } from 'lucide-react'

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
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { AuthModal } from '@/components/auth/AuthModal'
// 피규어 모드 컴포넌트
import { MemoryTab, FigureTab } from './figure'

// 애니메이션 variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as any
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
  const { user, unifiedUser, loading: authLoading } = useAuth()

  // 뒤로가기 경로 결정 (마이페이지에서 왔으면 마이페이지로)
  const fromPage = searchParams.get('from')
  const backHref = fromPage === 'mypage' ? '/mypage' : '/'
  // 탭 타입 (피규어 모드 포함)
  type TabType = 'analysis' | 'perfume' | 'comparison' | 'memory' | 'figure'
  const [activeTab, setActiveTab] = useState<TabType>('perfume')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isFeedbackHistoryOpen, setIsFeedbackHistoryOpen] = useState(false)
  const [serviceMode, setServiceMode] = useState<'online' | 'offline'>('offline')
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
    isFigureOnlineMode
  } = useResultData()

  // 피규어 모드일 때 기본 탭을 'memory'로 설정
  useEffect(() => {
    if (isFigureMode) {
      setActiveTab('memory')
    }
  }, [isFigureMode])

  // 서비스 모드 확인 (online: 구매 버튼 / offline: 피드백 버튼)
  useEffect(() => {
    const savedMode = localStorage.getItem('serviceMode')
    if (savedMode === 'online') {
      setServiceMode('online')
    }
  }, [])

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
    productType
  })

  const handleRestart = () => {
    localStorage.removeItem('analysisResult')
    localStorage.removeItem('userImage')
    localStorage.removeItem('savedResultId')
    router.push('/')
  }

  // 바로 구매하기 - productType 정보 저장 후 결제 페이지로 이동
  const handleCheckout = useCallback(() => {
    // 피규어 모드 여부에 따라 productType 저장
    const currentProductType = isFigureMode ? 'figure_diffuser' : 'image_analysis'
    localStorage.setItem('checkoutProductType', currentProductType)
    router.push('/checkout')
  }, [isFigureMode, router])

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
      const perfumeName = topPerfume?.persona?.name || '추천 향수'
      const perfumeBrand = topPerfume?.persona?.recommendation || "AC'SCENT"
      const analysisId = savedResultId || existingResultId || `temp-${Date.now()}`

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          product_type: isFigureMode ? 'figure_diffuser' : 'image_analysis',
          perfume_name: perfumeName,
          perfume_brand: perfumeBrand,
          twitter_name: twitterName,
          size: isFigureMode ? 'set' : '50ml',
          price: isFigureMode ? 48000 : 48000,
          image_url: userImage,
          analysis_data: displayedAnalysis
        })
      })

      const data = await response.json()

      if (data.success) {
        // 장바구니 페이지로 이동
        router.push('/mypage?tab=cart')
      } else {
        alert(data.error || '장바구니 추가에 실패했습니다')
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      alert('장바구니 추가 중 오류가 발생했습니다')
    } finally {
      setIsAddingToCart(false)
    }
  }, [displayedAnalysis, isAddingToCart, user, unifiedUser, savedResultId, existingResultId, isFigureMode, twitterName, userImage, router, setShowLoginPrompt])

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
      const perfumeName = topPerfume?.persona?.name || '추천 향수'
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
  }, [displayedAnalysis, userImage, twitterName, shareUrl, savedResultId])

  // 로딩 상태 - 키치 스타일
  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[#FEF9C3] font-sans">
        {/* 배경 */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply animate-blob animation-delay-4000" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center bg-white rounded-2xl p-8 border-2 border-slate-900 shadow-[4px_4px_0px_#000]"
        >
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-slate-900 rounded-xl animate-spin mx-auto mb-4" />
          <p className="text-slate-900 font-black">분석 결과를 불러오는 중...</p>
          <p className="text-slate-500 text-sm mt-1 font-medium">잠시만 기다려주세요 ✨</p>
        </motion.div>
      </div>
    )
  }

  // 에러 상태 - 키치 스타일
  if (error) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[#FEF9C3] font-sans">
        {/* 배경 */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center bg-white rounded-2xl p-8 max-w-sm border-2 border-slate-900 shadow-[4px_4px_0px_#000]"
        >
          <div className="w-16 h-16 bg-red-100 rounded-xl border-2 border-slate-900 flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#000]">
            <span className="text-3xl">😢</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">오류가 발생했어요</h2>
          <p className="text-slate-500 text-sm mb-6 font-medium">{error}</p>
          <Button
            onClick={handleRestart}
            className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 rounded-xl px-6 py-3 font-black border-2 border-slate-900 shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            처음으로 돌아가기
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-[#FAFAFA] font-sans">
      {/* 배경 - CSS 애니메이션으로 성능 최적화 */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
        <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply animate-blob-rotate" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply animate-blob-rotate-reverse" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply animate-blob-rotate-fast" />
        </div>
      </div>

      {/* 헤더 */}
      <Header
        title="분석 결과"
        showBack={true}
        backHref={backHref}
      />

      {/* 메인 콘텐츠 */}
      <main className="relative z-10 flex-1 px-5 pt-28 pb-6 overflow-y-auto lg:px-8 lg:pt-24 xl:px-12">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="w-full max-w-full px-1 sm:max-w-[420px] sm:px-0 md:max-w-[380px] mx-auto flex flex-col gap-5 lg:max-w-none lg:gap-6"
        >
          {displayedAnalysis && (
            <>
              {/* ========== PC 레이아웃: 좌/우 컬럼 컨테이너 ========== */}
              <div className="hidden lg:block">
                {/* 좌측 사이드바 (fixed) - 블로그 프로필 스타일 - 30% 축소 */}
                <div className="fixed top-36 left-8 xl:left-12 w-[200px] xl:w-[220px] pr-2 flex flex-col gap-3 z-20 max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide">
                  {/* 사용자 이미지 + 트위터 이름 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-xl p-3 space-y-3 border-2 border-slate-900 shadow-[3px_3px_0px_#000]">
                  {userImage && (
                    <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-slate-100 border-2 border-slate-200">
                      <img
                        src={userImage}
                        alt="업로드한 이미지"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <TwitterNameDisplay twitterName={twitterName} idolName={userInfo?.name} idolGender={userInfo?.gender} isCompact={true} />
                </motion.div>

                {/* 액션 버튼 - PC 키치 스타일 - 30% 축소 */}
                <motion.div variants={fadeInUp} className="flex flex-col gap-2">
                  <Button
                    onClick={handleShare}
                    disabled={isSaving}
                    className="w-full h-9 bg-yellow-400 text-slate-900 rounded-lg font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-70"
                  >
                    <Share2 size={14} />
                    <span>{isSaving ? '저장 중...' : '결과 공유하기'}</span>
                  </Button>
                  {serviceMode === 'online' ? (
                    // 온라인 모드: 장바구니 담기 + 구매하기 버튼
                    <div className="flex flex-col gap-1.5">
                      <Button
                        onClick={handleAddToCart}
                        disabled={isAddingToCart}
                        className="w-full h-8 bg-emerald-400 text-slate-900 rounded-lg font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-70"
                      >
                        <ShoppingCart size={14} />
                        <span>{isAddingToCart ? '담는 중...' : '장바구니 담기'}</span>
                      </Button>
                      <Button
                        onClick={handleCheckout}
                        className="w-full h-8 bg-amber-400 text-slate-900 rounded-lg font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>바로 구매하기</span>
                      </Button>
                    </div>
                  ) : (
                    // 오프라인 모드: 피드백 버튼
                    <div className="flex gap-1.5">
                      <Button
                        onClick={() => setIsFeedbackModalOpen(true)}
                        className="flex-1 h-8 bg-pink-400 text-slate-900 rounded-lg font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1"
                      >
                        <MessageSquarePlus size={12} />
                        <span>피드백</span>
                      </Button>
                      <Button
                        onClick={() => setIsFeedbackHistoryOpen(true)}
                        variant="outline"
                        className="h-8 px-2 border-2 border-slate-900 bg-white text-slate-900 rounded-lg font-bold shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center"
                      >
                        <History size={12} />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleRestart}
                    className="w-full h-7 border-2 border-slate-900 bg-white text-slate-900 rounded-lg font-bold text-xs shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={12} />
                    <span>다시 시작</span>
                  </Button>
                </motion.div>

                {/* 푸터 - PC */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 1 }}
                  className="text-left pt-2"
                >
                  <span className="text-[9px] font-semibold text-slate-400/80 tracking-[0.3em] uppercase">
                    © 2025 Ac&apos;scent Identity
                  </span>
                </motion.div>
                </div>

                {/* 우측 상단 고정 탭 네비게이션 */}
                <div className="fixed top-36 left-[252px] xl:left-[276px] right-8 xl:right-12 z-30">
                  <motion.div variants={fadeInUp} className="bg-[#FEF9C3] rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#000] overflow-hidden">
                    <TabNavigation
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      isDesktop={true}
                      isFigureMode={isFigureMode}
                    />
                  </motion.div>
                </div>

                {/* 우측 메인 콘텐츠 영역 - 스크롤 가능한 컨테이너 */}
                <div className="fixed top-[13rem] left-[252px] xl:left-[276px] right-8 xl:right-12 bottom-8 z-10 overflow-y-auto scrollbar-hide">
                  {/* 콘텐츠 - PC 키치 스타일 */}
                  <motion.div variants={fadeInUp} className="bg-white rounded-2xl overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                    <div className="p-6 xl:p-8">
                      <AnimatePresence mode="wait">
                        {activeTab === 'analysis' && (
                          <AnalysisTab key="analysis" displayedAnalysis={displayedAnalysis} isDesktop={true} />
                        )}
                        {activeTab === 'perfume' && (
                          <PerfumeTab key="perfume" displayedAnalysis={displayedAnalysis} isDesktop={true} />
                        )}
                        {activeTab === 'comparison' && !isFigureMode && (
                          <ComparisonTab key="comparison" displayedAnalysis={displayedAnalysis} isDesktop={true} />
                        )}
                        {/* 피규어 모드 전용 탭 */}
                        {activeTab === 'memory' && isFigureMode && (
                          <MemoryTab key="memory" displayedAnalysis={displayedAnalysis} memoryImage={userImage || undefined} isDesktop={true} />
                        )}
                        {activeTab === 'figure' && isFigureMode && (
                          <FigureTab key="figure" displayedAnalysis={displayedAnalysis} figureImage={figureImage || undefined} isDesktop={true} />
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* ========== 모바일 레이아웃 - 키치 스타일 ========== */}
              <div className="lg:hidden flex flex-col gap-5 w-full">
                {/* 타이틀 섹션 - 모바일 키치 스타일 */}
                <motion.div variants={fadeInUp} className="text-center pt-2">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#000]">
                      <span className="text-slate-900 text-xs font-black">✨ 분석 완료</span>
                    </div>
                    {isAutoSaving && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border-2 border-slate-300">
                        <Loader2 size={12} className="text-slate-600 animate-spin" />
                        <span className="text-slate-600 text-xs font-bold">저장 중</span>
                      </div>
                    )}
                    {isAutoSaved && !isAutoSaving && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-100 rounded-xl border-2 border-emerald-400">
                        <CheckCircle2 size={12} className="text-emerald-700" />
                        <span className="text-emerald-700 text-xs font-bold">저장됨</span>
                      </div>
                    )}
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 leading-tight">
                    {isFigureMode ? (
                      <>
                        기억을 향기로<br />
                        <span className="text-pink-500">
                          담았어요! 💕
                        </span>
                      </>
                    ) : (
                      <>
                        당신만의 향기를<br />
                        <span className="text-yellow-500">
                          찾았어요! 💛
                        </span>
                      </>
                    )}
                  </h1>
                </motion.div>

                {/* 사용자 이미지 + 트위터 이름 - 모바일 키치 스타일 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-4 space-y-4 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                  {userImage && (
                    <div className="relative w-full aspect-[5/6] rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={userImage}
                        alt="업로드한 이미지"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <TwitterNameDisplay twitterName={twitterName} idolName={userInfo?.name} idolGender={userInfo?.gender} />
                </motion.div>

                {/* 오프라인 모드: 피드백 버튼 (본문에 유지) */}
                {serviceMode === 'offline' && (
                  <motion.div variants={fadeInUp} className="flex gap-2">
                    <Button
                      onClick={() => setIsFeedbackModalOpen(true)}
                      className="flex-1 h-12 bg-pink-400 text-slate-900 rounded-xl font-black border-2 border-slate-900 shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquarePlus size={18} />
                      <span>피드백 기록</span>
                    </Button>
                    <Button
                      onClick={() => setIsFeedbackHistoryOpen(true)}
                      variant="outline"
                      className="h-12 px-4 border-2 border-slate-900 bg-white text-slate-900 rounded-xl font-bold shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-2"
                    >
                      <History size={18} />
                    </Button>
                  </motion.div>
                )}

                {/* 탭 네비게이션 + 콘텐츠 - 모바일 키치 스타일 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-2xl overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                  <TabNavigation
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isFigureMode={isFigureMode}
                  />

                  <div className="p-5">
                    <AnimatePresence mode="wait">
                      {activeTab === 'analysis' && (
                        <AnalysisTab key="analysis" displayedAnalysis={displayedAnalysis} />
                      )}
                      {activeTab === 'perfume' && (
                        <PerfumeTab key="perfume" displayedAnalysis={displayedAnalysis} />
                      )}
                      {activeTab === 'comparison' && !isFigureMode && (
                        <ComparisonTab key="comparison" displayedAnalysis={displayedAnalysis} />
                      )}
                      {/* 피규어 모드 전용 탭 */}
                      {activeTab === 'memory' && isFigureMode && (
                        <MemoryTab key="memory" displayedAnalysis={displayedAnalysis} memoryImage={userImage || undefined} />
                      )}
                      {activeTab === 'figure' && isFigureMode && (
                        <FigureTab key="figure" displayedAnalysis={displayedAnalysis} figureImage={figureImage || undefined} />
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
                  <span className="text-[9px] font-semibold text-slate-400/80 tracking-[0.3em] uppercase">
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
          onFeedback={() => setIsFeedbackModalOpen(true)}
          onFeedbackHistory={() => setIsFeedbackHistoryOpen(true)}
          isShareSaving={isSaving}
          isAddingToCart={isAddingToCart}
          serviceMode={serviceMode}
        />
      )}

      {/* 공유 모달 */}
      {displayedAnalysis && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          userImage={userImage || undefined}
          twitterName={twitterName}
          userName={userInfo?.name || '익명'}
          userGender={userInfo?.gender || 'Unknown'}
          perfumeName={displayedAnalysis.matchingPerfumes?.[0]?.persona?.name || '추천 향수'}
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
          perfumeName={displayedAnalysis.matchingPerfumes[0].persona?.name || '추천 향수'}
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
        title="로그인하고 결과 저장하기"
        description="로그인하면 분석 결과가 내 계정에 영구 저장됩니다!"
      />
    </div>
  )
}
