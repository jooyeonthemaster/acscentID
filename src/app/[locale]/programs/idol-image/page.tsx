"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Star, Gift, Zap, ChevronRight,
  FileText, Camera, Sparkles, Palette, FileCheck,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useTransition } from "@/contexts/TransitionContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { AnalysisPreviewPlayer } from "@/components/remotion/AnalysisPreviewPlayer"
import { useTranslations } from 'next-intl'
import { useProductDetail } from '@/hooks/useProductDetail'
import { InactiveProductGuard } from '@/components/programs/InactiveProductGuard'
import { CustomDetailRenderer } from '@/components/programs/CustomDetailRenderer'
import { ProgramImageGallery } from "@/components/programs/ProgramImageGallery"
import { ProgramLoginPrompt } from "@/components/programs/ProgramLoginPrompt"
import { ProgramReviewSection, ReviewTrigger } from "@/components/programs/ProgramReviewSection"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
}

export default function IdolImagePage() {
  const { user, unifiedUser, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const t = useTranslations()

  // 리뷰 통계 (히어로 ReviewTrigger용)
  const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null)
  useEffect(() => {
    getReviewStats('idol_image').then(setReviewStats).catch(() => {})
  }, [])

  const isLoggedIn = !!(user || unifiedUser)
  const currentUserId = user?.id || unifiedUser?.id

  const { isCustomMode, detail } = useProductDetail('idol-image')
  const { startTransition } = useTransition()

  const handleStartClick = () => {
    if (loading) return
    if (isLoggedIn) {
      startTransition("/input?type=idol_image&mode=online")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleGuestStart = () => {
    setShowAuthModal(true)
    setShowLoginPrompt(false)
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  return (
    <InactiveProductGuard productSlug="idol-image">
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
      <Header />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <section className="pt-28 pb-10 px-4">
        <div className="w-full">
          {/* 이미지 갤러리 (공유 컴포넌트) */}
          <ProgramImageGallery
            productSlug="idol-image"
            fallbackImages={[
              "/images/perfume/KakaoTalk_20260125_225218071.jpg",
              "/images/perfume/KakaoTalk_20260125_225218071_01.jpg",
            ]}
            badge="BEST"
          />

          {/* 제품 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* 브레드크럼 */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
              <Link href="/" className="hover:text-black">{t('programs.breadcrumbHome')}</Link>
              <ChevronRight size={12} />
              <Link href="/" className="hover:text-black">{t('programs.breadcrumbPrograms')}</Link>
              <ChevronRight size={12} />
              <span className="text-black font-bold">{t('products.idolImage')}</span>
            </div>

            {/* 타이틀 */}
            <div className="mb-4">
              <div className="mb-2">
                <ReviewTrigger
                  averageRating={reviewStats?.average_rating || 4.9}
                  totalCount={reviewStats?.total_count || 0}
                  onClick={() => {
                    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                />
              </div>
              <h1 className="text-xl font-black text-black leading-tight mb-1.5 break-keep">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500">
                  {t('products.idolImage')}
                </span>
              </h1>
              <p className="text-sm text-slate-600 font-medium">
                {t('programs.subtitle.idolImage')}
              </p>
            </div>

            {/* 가격 + 구성품 안내 */}
            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0_0_black] mb-4">
              {/* 가격 */}
              <div className="flex items-end gap-2 mb-3">
                <span className="text-xl font-black text-black">{t('currency.symbol')}24,000~</span>
                <span className="text-xs text-slate-400 line-through">{t('currency.symbol')}35,000</span>
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">31% OFF</span>
              </div>

              {/* 구성품 안내 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-xs text-black">{t('programs.includes.idolImage')}</span>
                </div>
                <ul className="space-y-0.5 text-[11px] text-slate-600 pl-5">
                  <li className="list-disc">{t('programs.sizeSelectable')}</li>
                  <li className="list-disc">{t('shipping.estimated')}</li>
                </ul>
              </div>
            </div>

            {/* CTA 버튼 */}
            <button
              onClick={handleStartClick}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {t('buttons.analyzeNow')}
            </button>

            <p className="text-center text-xs text-slate-500 mt-2">
              {t('programs.hint')}
            </p>
          </motion.div>
        </div>
      </section>

      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <>
          {/* ============================================
              Feature Bar - 검은 배경
          ============================================ */}
          <section className="py-6 px-4 bg-black">
            <div className="w-full">
              <div className="flex flex-wrap items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span className="font-bold text-xs">{t('programs.features.aiAnalysis')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Palette size={14} className="text-cyan-400" />
                  <span className="font-bold text-xs">{t('programs.features.customPerfume')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck size={14} className="text-cyan-400" />
                  <span className="font-bold text-xs">{t('programs.features.analysisReport')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================
              진행 과정
          ============================================ */}
          <section className="py-12 px-4 bg-[#FFFDF5]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="w-full"
            >
              <div className="text-center mb-8">
                <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-blue-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
                  {t('programs.process.badge')}
                </motion.div>
                <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black break-keep">
                  {t('programs.process.title')}
                </motion.h2>
              </div>

              <div className="relative">
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  {[
                    { step: "01", title: t('programs.process.step1Title'), desc: t('programs.process.step1Desc'), icon: Camera, color: "bg-yellow-400" },
                    { step: "02", title: t('programs.process.step2Title'), desc: t('programs.process.step2Desc'), icon: FileText, color: "bg-orange-400" },
                    { step: "03", title: t('programs.process.step3Title'), desc: t('programs.process.step3Desc'), icon: Zap, color: "bg-pink-400" },
                    { step: "04", title: t('programs.process.step4Title'), desc: t('programs.process.step4Desc'), icon: Gift, color: "bg-purple-400" },
                  ].map((item, idx) => (
                    <motion.div key={idx} variants={fadeInUp} className="flex flex-col items-center text-center">
                      <div className={`w-14 h-14 ${item.color} border-2 border-black rounded-xl shadow-[3px_3px_0_0_black] flex items-center justify-center mb-2`}>
                        <item.icon size={24} className="text-white" />
                      </div>
                      <span className="text-xl font-black text-slate-200 mb-1">{item.step}</span>
                      <h3 className="text-sm font-black text-black mb-0.5">{item.title}</h3>
                      <p className="text-[11px] text-slate-600">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </section>

          {/* ============================================
              분석 결과 미리보기
          ============================================ */}
          <section className="py-12 px-4 bg-white border-y-2 border-black">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="w-full"
            >
              <div className="text-center mb-8">
                <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-pink-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
                  {t('programs.resultPreview.badge')}
                </motion.div>
                <motion.h2 variants={fadeInUp} className="text-xl font-black text-black mb-3 break-keep">
                  {t('programs.resultPreview.title')}
                </motion.h2>
                <motion.p variants={fadeInUp} className="text-sm text-slate-600 whitespace-pre-line">
                  {t('programs.resultPreview.description')}
                </motion.p>
              </div>

              {/* 결과 미리보기 - Remotion Player */}
              <motion.div variants={fadeInUp} className="flex justify-center">
                <div className="w-full">
                  <AnalysisPreviewPlayer
                    colors={['#C084FC', '#F9A8D4', '#1E293B']}
                    keywords={['시크', '달콤', '카리스마']}
                    moodScore={87}
                    perfumeName={"AC'SCENT 27\n스모키 블랜드 우드"}
                    topNotes="베르가못, 블랙커런트"
                    middleNotes="다마스크 로즈, 피오니"
                    baseNotes="머스크, 샌달우드"
                  />
                  <p className="text-center text-xs text-slate-500 mt-3">
                    {t('programs.previewCaption')}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </section>
        </>
      )}

      {/* ============================================
          실제 후기 (공유 컴포넌트)
      ============================================ */}
      <ProgramReviewSection
        programType="idol_image"
        programName={t('footer.aiImageAnalysis')}
        currentUserId={currentUserId}
        isLoggedIn={isLoggedIn}
        onLoginRequired={() => setShowLoginPrompt(true)}
      />

      {/* 로그인 안내 모달 (공유 컴포넌트) */}
      <ProgramLoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLoginClick}
        onGuest={handleGuestStart}
      />

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/input?type=idol_image&mode=online"
      />
    </main>
    </InactiveProductGuard>
  )
}
