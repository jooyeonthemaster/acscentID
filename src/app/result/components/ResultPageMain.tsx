"use client"

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, RotateCcw, Share2, Sparkles, MessageSquarePlus, History, CheckCircle2, Loader2, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

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
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { AuthModal } from '@/components/auth/AuthModal'

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
  const { user, unifiedUser, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'analysis' | 'perfume' | 'comparison'>('perfume')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isFeedbackHistoryOpen, setIsFeedbackHistoryOpen] = useState(false)
  const [serviceMode, setServiceMode] = useState<'online' | 'offline'>('offline')

  const {
    loading,
    error,
    isLoaded,
    userImage,
    twitterName,
    userInfo,
    displayedAnalysis,
    existingResultId,
    idolName
  } = useResultData()

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
    idolName  // 최애 이름
  })

  const handleRestart = () => {
    localStorage.removeItem('analysisResult')
    localStorage.removeItem('userImage')
    localStorage.removeItem('savedResultId')
    router.push('/')
  }

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
        backHref="/"
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
              <div className="hidden lg:flex lg:flex-row lg:items-start lg:gap-8 xl:gap-12">
                {/* 좌측 사이드바 (sticky) - 키치 스타일 */}
                <div className="flex flex-col w-[320px] xl:w-[360px] flex-shrink-0 sticky top-24 gap-4">
                  {/* 사용자 이미지 + 트위터 이름 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-4 space-y-4 border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                  {userImage && (
                    <div className="relative w-full aspect-[5/6] rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200">
                      <img
                        src={userImage}
                        alt="업로드한 이미지"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <TwitterNameDisplay twitterName={twitterName} />
                </motion.div>

                {/* 액션 버튼 - PC 키치 스타일 */}
                <motion.div variants={fadeInUp} className="flex flex-col gap-3">
                  <Button
                    onClick={handleShare}
                    disabled={isSaving}
                    className="w-full h-12 bg-yellow-400 text-slate-900 rounded-xl font-black text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <Share2 size={16} />
                    <span>{isSaving ? '저장 중...' : '결과 공유하기'}</span>
                  </Button>
                  {serviceMode === 'online' ? (
                    // 온라인 모드: 향수 구매 버튼
                    <Button
                      onClick={() => router.push('/checkout')}
                      className="w-full h-11 bg-emerald-400 text-slate-900 rounded-xl font-black text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={16} />
                      <span>향수 구매하기</span>
                    </Button>
                  ) : (
                    // 오프라인 모드: 피드백 버튼
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsFeedbackModalOpen(true)}
                        className="flex-1 h-11 bg-pink-400 text-slate-900 rounded-xl font-black text-sm border-2 border-slate-900 shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquarePlus size={16} />
                        <span>피드백</span>
                      </Button>
                      <Button
                        onClick={() => setIsFeedbackHistoryOpen(true)}
                        variant="outline"
                        className="h-11 px-3 border-2 border-slate-900 bg-white text-slate-900 rounded-xl font-bold shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center"
                      >
                        <History size={16} />
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleRestart}
                    className="w-full h-10 border-2 border-slate-900 bg-white text-slate-900 rounded-xl font-bold text-sm shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} />
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

                {/* 우측 메인 콘텐츠 영역 */}
                <div className="flex-1 min-w-0 mt-28">
                  {/* 탭 네비게이션 + 콘텐츠 - PC 키치 스타일 */}
                  <motion.div variants={fadeInUp} className="bg-white rounded-2xl overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                    <TabNavigation
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                      isDesktop={true}
                    />

                    <div className="p-6 xl:p-8">
                      <AnimatePresence mode="wait">
                        {activeTab === 'analysis' && (
                          <AnalysisTab key="analysis" displayedAnalysis={displayedAnalysis} isDesktop={true} />
                        )}
                        {activeTab === 'perfume' && (
                          <PerfumeTab key="perfume" displayedAnalysis={displayedAnalysis} isDesktop={true} />
                        )}
                        {activeTab === 'comparison' && (
                          <ComparisonTab key="comparison" displayedAnalysis={displayedAnalysis} isDesktop={true} />
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
                    당신만의 향기를<br />
                    <span className="text-yellow-500">
                      찾았어요! 💛
                    </span>
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
                  <TwitterNameDisplay twitterName={twitterName} />
                </motion.div>

                {/* 액션 버튼 - 모바일 키치 스타일 */}
                <motion.div variants={fadeInUp} className="flex flex-col gap-3">
                  <Button
                    onClick={handleShare}
                    disabled={isSaving}
                    className="w-full h-14 bg-yellow-400 text-slate-900 rounded-xl font-black text-base border-2 border-slate-900 shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <Share2 size={18} />
                    <span>{isSaving ? '저장 중...' : '결과 공유하기'}</span>
                  </Button>
                  {serviceMode === 'online' ? (
                    // 온라인 모드: 향수 구매 버튼
                    <Button
                      onClick={() => router.push('/checkout')}
                      className="w-full h-12 bg-emerald-400 text-slate-900 rounded-xl font-black border-2 border-slate-900 shadow-[3px_3px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingCart size={18} />
                      <span>향수 구매하기</span>
                    </Button>
                  ) : (
                    // 오프라인 모드: 피드백 버튼
                    <div className="flex gap-2">
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
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleRestart}
                    className="w-full h-12 border-2 border-slate-900 bg-white text-slate-900 rounded-xl font-bold shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={16} />
                    <span>다시 시작하기</span>
                  </Button>
                </motion.div>

                {/* 탭 네비게이션 + 콘텐츠 - 모바일 키치 스타일 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-2xl overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_#000]">
                  <TabNavigation
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
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
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* 푸터 - 모바일 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 1 }}
                  className="w-full text-center pb-4"
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
