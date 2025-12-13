"use client"

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, RotateCcw, Share2, Sparkles } from 'lucide-react'
import Link from 'next/link'

// Hooks
import { useResultData } from '../hooks/useResultData'

// Components
import { TwitterNameDisplay } from './TwitterNameDisplay'
import { TabNavigation } from './TabNavigation'
import { AnalysisTab } from './AnalysisTab'
import { PerfumeTab } from './PerfumeTab'
import { ComparisonTab } from './ComparisonTab'
import { ShareModal } from './ShareModal'
import { Button } from '@/components/ui/button'

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
  const [activeTab, setActiveTab] = useState<'analysis' | 'perfume' | 'comparison'>('analysis')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  const {
    loading,
    error,
    isLoaded,
    userImage,
    twitterName,
    displayedAnalysis
  } = useResultData()

  const handleRestart = () => {
    localStorage.removeItem('analysisResult')
    localStorage.removeItem('userImage')
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
  }, [displayedAnalysis, userImage, twitterName, shareUrl])

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
      <header className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/50 transition-colors">
          <ChevronLeft size={24} className="text-slate-800" />
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-yellow-500" />
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            AC&apos;SCENT IDENTITY
          </span>
        </div>
        <div className="w-10" />
      </header>

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
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/20 rounded-full mb-3">
                  <span className="text-yellow-600 text-xs font-bold">✨ 분석 완료</span>
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
          perfumeName={displayedAnalysis.matchingPerfumes?.[0]?.persona?.name || '추천 향수'}
          perfumeBrand={displayedAnalysis.matchingPerfumes?.[0]?.persona?.recommendation || 'AC\'SCENT'}
          analysisData={displayedAnalysis}
          shareUrl={shareUrl}
        />
      )}
    </div>
  )
}
