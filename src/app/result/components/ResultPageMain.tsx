"use client"

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, RotateCcw, Share2, Sparkles, MessageSquarePlus, History, CheckCircle2, Loader2 } from 'lucide-react'
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
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'analysis' | 'perfume' | 'comparison'>('perfume')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isFeedbackHistoryOpen, setIsFeedbackHistoryOpen] = useState(false)

  const {
    loading,
    error,
    isLoaded,
    userImage,
    twitterName,
    userInfo,
    displayedAnalysis
  } = useResultData()

  // 자동 저장 훅
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
    user
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

      // API로 결과 저장
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImageUrl: userImage || null,
          analysisData: displayedAnalysis,
          twitterName,
          perfumeName,
          perfumeBrand,
          matchingKeywords: displayedAnalysis.matchingKeywords || []
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

  // 로딩 상태
  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[#FAFAFA] font-sans">
        {/* 배경 */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
          <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply animate-blob animation-delay-4000" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center"
        >
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-700 font-semibold">분석 결과를 불러오는 중...</p>
          <p className="text-slate-400 text-sm mt-1">잠시만 기다려주세요</p>
        </motion.div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[#FAFAFA] font-sans">
        {/* 배경 */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
          <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center glass-card rounded-3xl p-8 max-w-sm"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">오류가 발생했어요</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <Button
            onClick={handleRestart}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-6 py-3 font-bold"
          >
            처음으로 돌아가기
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col min-h-screen overflow-hidden bg-[#FAFAFA] font-sans">
      {/* 배경 */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
        <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply"
          />
        </div>
      </div>

      {/* 헤더 */}
      <Header
        title="분석 결과"
        showBack={true}
        backHref="/"
      />

      {/* 메인 콘텐츠 */}
      <main className="relative z-10 flex-1 px-5 pb-6 overflow-y-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="w-full max-w-full px-1 sm:max-w-[420px] sm:px-0 md:max-w-[380px] lg:max-w-[340px] mx-auto flex flex-col gap-5"
        >
          {displayedAnalysis && (
            <>
              {/* 타이틀 섹션 */}
              <motion.div variants={fadeInUp} className="text-center pt-2">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/20 rounded-full">
                    <span className="text-yellow-600 text-xs font-bold">✨ 분석 완료</span>
                  </div>
                  {/* 저장 상태 배지 */}
                  {isAutoSaving && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 rounded-full">
                      <Loader2 size={12} className="text-slate-500 animate-spin" />
                      <span className="text-slate-500 text-xs font-medium">저장 중</span>
                    </div>
                  )}
                  {isAutoSaved && !isAutoSaving && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-100 rounded-full">
                      <CheckCircle2 size={12} className="text-green-600" />
                      <span className="text-green-600 text-xs font-medium">저장됨</span>
                    </div>
                  )}
                </div>
                <h1 className="text-2xl font-black text-slate-900 leading-tight">
                  당신만의 향기를<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-500">
                    찾았어요!
                  </span>
                </h1>
              </motion.div>

              {/* 사용자 이미지 + 트위터 이름 */}
              <motion.div variants={fadeInUp} className="glass-card rounded-3xl p-4 space-y-4">
                {userImage && (
                  <div className="relative w-full aspect-[5/6] rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
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

              {/* 탭 네비게이션 + 콘텐츠 */}
              <motion.div variants={fadeInUp} className="glass-card rounded-3xl overflow-hidden">
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

              {/* 액션 버튼 */}
              <motion.div variants={fadeInUp} className="flex flex-col gap-3 pt-2 pb-4">
                <Button
                  onClick={handleShare}
                  disabled={isSaving}
                  className="w-full h-14 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-amber-500/30 hover:shadow-xl hover:from-yellow-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Share2 size={18} />
                  <span>{isSaving ? '저장 중...' : '결과 공유하기'}</span>
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquarePlus size={18} />
                    <span>피드백 기록</span>
                  </Button>
                  <Button
                    onClick={() => setIsFeedbackHistoryOpen(true)}
                    variant="outline"
                    className="h-12 px-4 border-2 border-purple-200 bg-white/60 text-purple-600 rounded-2xl font-semibold hover:bg-purple-50 hover:border-purple-300 transition-all flex items-center justify-center gap-2"
                  >
                    <History size={18} />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleRestart}
                  className="w-full h-12 border-2 border-slate-200 bg-white/60 text-slate-600 rounded-2xl font-semibold hover:bg-white hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  <span>다시 시작하기</span>
                </Button>
              </motion.div>

              {/* 푸터 */}
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
        // characterName은 전달하지 않음 - twitterName은 주접 멘트이지 캐릭터 이름이 아님
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
