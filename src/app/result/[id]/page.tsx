"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, RotateCcw, Share2, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

// Components
import { TwitterNameDisplay } from '../components/TwitterNameDisplay'
import { TabNavigation } from '../components/TabNavigation'
import { AnalysisTab } from '../components/AnalysisTab'
import { PerfumeTab } from '../components/PerfumeTab'
import { ComparisonTab } from '../components/ComparisonTab'
import { ShareModal } from '../components/ShareModal'
import { Button } from '@/components/ui/button'
import { ImageAnalysisResult } from '@/types/analysis'

// 애니메이션 variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
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

interface SharedResult {
  id: string
  createdAt: string
  userImageUrl: string | null
  analysisData: ImageAnalysisResult
  twitterName: string
  perfumeName: string
  perfumeBrand: string
  matchingKeywords: string[]
  viewCount: number
}

export default function SharedResultPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SharedResult | null>(null)
  const [activeTab, setActiveTab] = useState<'analysis' | 'perfume' | 'comparison'>('analysis')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // 결과 데이터 로드
  useEffect(() => {
    const loadResult = async () => {
      const id = params.id as string
      if (!id) {
        setError('잘못된 링크입니다.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/results/${id}`)
        const data = await response.json()

        if (data.success && data.result) {
          setResult(data.result)
        } else {
          setError(data.error || '결과를 찾을 수 없습니다.')
        }
      } catch (err) {
        console.error('Load error:', err)
        setError('결과를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [params.id])

  const handleStartAnalysis = () => {
    router.push('/')
  }

  const handleShare = useCallback(() => {
    setIsShareModalOpen(true)
  }, [])

  // 로딩 상태
  if (loading) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[#FAFAFA] font-sans">
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
          <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center"
        >
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-700 font-semibold">공유된 결과를 불러오는 중...</p>
        </motion.div>
      </div>
    )
  }

  // 에러 상태
  if (error || !result) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-[#FAFAFA] font-sans">
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#FDFDFD]">
          <div className="absolute inset-0 z-40 bg-noise opacity-[0.4] mix-blend-overlay pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] opacity-40 blur-[100px] saturate-150">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply animate-blob" />
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">결과를 찾을 수 없어요</h2>
          <p className="text-slate-500 text-sm mb-6">{error || '링크가 만료되었거나 잘못되었습니다.'}</p>
          <Button
            onClick={handleStartAnalysis}
            className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-6 py-3 font-bold"
          >
            나도 분석 받기
          </Button>
        </motion.div>
      </div>
    )
  }

  const { analysisData, userImageUrl, twitterName, perfumeName, perfumeBrand } = result

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
          {/* 공유된 결과 배지 */}
          <motion.div variants={fadeInUp} className="text-center pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-400/20 rounded-full mb-3">
              <span className="text-pink-600 text-xs font-bold">💌 친구의 향수 결과</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              친구의 향기를<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-500">
                구경해보세요!
              </span>
            </h1>
          </motion.div>

          {/* 사용자 이미지 + 트위터 이름 */}
          <motion.div variants={fadeInUp} className="glass-card rounded-3xl p-4 space-y-4">
            {userImageUrl && (
              <div className="relative w-full aspect-[5/6] rounded-2xl overflow-hidden bg-slate-100 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={userImageUrl}
                  alt="분석 이미지"
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
                  <AnalysisTab key="analysis" displayedAnalysis={analysisData} />
                )}
                {activeTab === 'perfume' && (
                  <PerfumeTab key="perfume" displayedAnalysis={analysisData} />
                )}
                {activeTab === 'comparison' && (
                  <ComparisonTab key="comparison" displayedAnalysis={analysisData} />
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* 액션 버튼 */}
          <motion.div variants={fadeInUp} className="flex flex-col gap-3 pt-2 pb-4">
            <Button
              onClick={handleStartAnalysis}
              className="w-full h-14 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-amber-500/30 hover:shadow-xl hover:from-yellow-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              <span>나도 분석 받기</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="w-full h-12 border-2 border-slate-200 bg-white/60 text-slate-600 rounded-2xl font-semibold hover:bg-white hover:border-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <Share2 size={16} />
              <span>이 결과 공유하기</span>
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
        </motion.div>
      </main>

      {/* 공유 모달 */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        userImage={userImageUrl || undefined}
        twitterName={twitterName}
        perfumeName={perfumeName}
        perfumeBrand={perfumeBrand}
        analysisData={analysisData}
        shareUrl={typeof window !== 'undefined' ? window.location.href : undefined}
      />
    </div>
  )
}
