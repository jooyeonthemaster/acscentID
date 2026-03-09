"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Star, X, AlertTriangle,
  Gift, ChevronRight,
  FileText, Camera, Sparkles, GraduationCap, Clock
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useTransition } from "@/contexts/TransitionContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { ReviewModal, ReviewTrigger, ReviewWriteModal, ReviewStats, ReviewList } from "@/components/review"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useTranslations } from 'next-intl'

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

export default function GraduationPage() {
  const { user, unifiedUser, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const t = useTranslations()

  // 리뷰 관련 상태
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showReviewWriteModal, setShowReviewWriteModal] = useState(false)
  const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null)
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | null>(null)

  const isLoggedIn = !!(user || unifiedUser)
  const currentUserId = user?.id || unifiedUser?.id

  // 리뷰 통계 로드
  useEffect(() => {
    const loadReviewStats = async () => {
      try {
        const stats = await getReviewStats('graduation')
        setReviewStats(stats)
      } catch (error) {
        console.error('Failed to load review stats:', error)
      }
    }
    loadReviewStats()
  }, [])

  const productImages = [
    "/images/jollduck/KakaoTalk_20260130_201156204.jpg",
    "/images/jollduck/KakaoTalk_20260130_201156204_01.jpg",
    "/images/jollduck/KakaoTalk_20260130_201156204_02.jpg",
  ]

  const { startTransition } = useTransition()

  const handleStartClick = () => {
    if (loading) return
    if (isLoggedIn) {
      startTransition("/input?type=graduation&mode=online")
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
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
      <Header />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <section className="pt-28 pb-10 px-4">
        <div className="w-full">
          {/* 이미지 갤러리 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            {/* 메인 이미지 */}
            <div className="relative bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] mb-3">
              <div className="absolute top-3 left-3 z-10 flex gap-2">
                <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-black animate-pulse">
                  {t('programs.graduation.limitedBadge')}
                </span>
              </div>
              <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50">
                <motion.img
                  key={selectedImage}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  src={productImages[selectedImage]}
                  alt={t('products.graduation')}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 썸네일 */}
            {productImages.length > 1 && (
              <div className="flex gap-2 justify-center">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${selectedImage === idx
                      ? 'border-black shadow-[2px_2px_0_0_black] scale-105'
                      : 'border-slate-300 hover:border-slate-500'
                      }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain bg-white p-1" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

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
              <span className="text-black font-bold">{t('products.graduation')}</span>
            </div>

            {/* 타이틀 */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <ReviewTrigger
                  averageRating={reviewStats?.average_rating || 4.9}
                  totalCount={reviewStats?.total_count || 0}
                  onClick={() => setShowReviewModal(true)}
                />
                <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                  {t('programs.graduation.deadline')}
                </span>
              </div>
              <h1 className="text-xl font-black text-black leading-tight mb-1.5 break-keep">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500">
                  {t('products.graduation')}
                </span>
              </h1>
              <p className="text-sm text-slate-600 font-medium">
                {t('programs.graduation.subtitle')}
              </p>
            </div>

            {/* 기간 한정 배너 */}
            <div className="bg-red-500 border-2 border-black rounded-xl p-3 mb-3 shadow-[3px_3px_0_0_black]">
              <div className="flex items-center justify-center gap-2 text-white">
                <span className="text-lg">🎓</span>
                <span className="font-black text-sm">{t('programs.graduation.limitedBanner')}</span>
                <span className="text-lg">⏰</span>
              </div>
            </div>

            {/* 가격 + 구성품 안내 */}
            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0_0_black] mb-4">
              {/* 가격 */}
              <div className="flex items-end gap-2 mb-3">
                <span className="text-xl font-black text-black">{t('currency.symbol')}34,000</span>
                <span className="text-xs text-slate-400 line-through">{t('currency.symbol')}49,000</span>
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">31% OFF</span>
              </div>

              {/* 구성품 안내 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <div className="space-y-1 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-xs text-black">{t('programs.graduation.compPerfume')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-xs text-black">{t('programs.graduation.compKeyring')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold text-xs text-black">{t('programs.graduation.compReport')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA 버튼 */}
            <button
              onClick={handleStartClick}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {t('buttons.analyzeNow')}
            </button>

            <p className="text-center text-xs text-red-500 font-bold mt-2">
              {t('programs.graduation.urgentText')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          Feature Bar - 검은 배경
      ============================================ */}
      <section className="py-6 px-4 bg-black">
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-center gap-4 text-white">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded animate-pulse">
                ~2/28
              </span>
              <span className="font-bold text-xs">{t('programs.graduation.featureLimited')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap size={14} className="text-amber-400" />
              <span className="font-bold text-xs">{t('programs.graduation.featureGraduation')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span className="font-bold text-xs">{t('programs.graduation.featureCustom')}</span>
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
                { step: "01", title: t('programs.graduation.processStep1'), desc: t('programs.graduation.processStep1Desc'), icon: FileText, color: "bg-amber-400" },
                { step: "02", title: t('programs.graduation.processStep2'), desc: t('programs.graduation.processStep2Desc'), icon: Clock, color: "bg-blue-400" },
                { step: "03", title: t('programs.graduation.processStep3'), desc: t('programs.graduation.processStep3Desc'), icon: Camera, color: "bg-pink-400" },
                { step: "04", title: t('programs.graduation.processStep4'), desc: t('programs.graduation.processStep4Desc'), icon: Gift, color: "bg-purple-400" },
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
            <motion.p variants={fadeInUp} className="text-sm text-slate-600">
              <span className="whitespace-pre-line">{t('programs.graduation.resultPreviewDesc')}</span>
            </motion.p>
          </div>

          {/* 결과 미리보기 카드들 */}
          <motion.div variants={fadeInUp} className="space-y-4">
            {/* 향수 노트 구성 카드 */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
              <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🌸</span> {t('programs.graduation.noteStructure')}
              </h3>
              <div className="flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                    <span>🍋</span>
                  </div>
                  <div className="text-xs font-bold text-amber-700">{t('programs.graduation.topNote')}</div>
                  <div className="text-[10px] text-slate-500">{t('programs.graduation.topNoteDesc')}</div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
                <div className="flex-1">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
                    <span>🌹</span>
                  </div>
                  <div className="text-xs font-bold text-blue-700">{t('programs.graduation.middleNote')}</div>
                  <div className="text-[10px] text-slate-500">{t('programs.graduation.middleNoteDesc')}</div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
                <div className="flex-1">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center">
                    <span>🪵</span>
                  </div>
                  <div className="text-xs font-bold text-purple-700">{t('programs.graduation.baseNote')}</div>
                  <div className="text-[10px] text-slate-500">{t('programs.graduation.baseNoteDesc')}</div>
                </div>
              </div>
            </div>

            {/* 축하 메시지 카드 */}
            <div className="bg-white rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🎉</div>
                <div>
                  <h3 className="font-black text-slate-900 mb-2">{t('programs.graduation.congratsTitle')}</h3>
                  <p className="text-slate-600 text-sm"><span className="whitespace-pre-line">{t('programs.graduation.congratsDesc')}</span></p>
                </div>
              </div>
            </div>

            {/* 맞춤 향수 카드 */}
            <div className="bg-white rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
              <div className="flex items-start gap-3">
                <div className="text-3xl">💎</div>
                <div>
                  <h3 className="font-black text-slate-900 mb-2">{t('programs.graduation.customRecommendation')}</h3>
                  <p className="text-slate-600 text-sm"><span className="whitespace-pre-line">{t('programs.graduation.customRecommendationDesc')}</span></p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          실제 후기
      ============================================ */}
      <section id="reviews" className="py-12 px-4 bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-yellow-400 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
              {t('programs.reviews.badge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black mb-2 break-keep">
              {t('programs.graduation.reviewsTitle')}
            </motion.h2>
            <motion.button
              variants={fadeInUp}
              onClick={() => setShowReviewModal(true)}
              className="text-xs text-slate-500 hover:text-black transition-colors underline underline-offset-4"
            >
              {t('programs.reviews.viewAll')}
            </motion.button>
          </div>

          {/* 리뷰 통계 */}
          {reviewStats && (
            <motion.div variants={fadeInUp} className="mb-6">
              <ReviewStats
                stats={reviewStats}
                onRatingFilter={setReviewRatingFilter}
                selectedRating={reviewRatingFilter}
              />
            </motion.div>
          )}

          {/* 리뷰 목록 */}
          <motion.div variants={fadeInUp}>
            <ReviewList
              programType="graduation"
              currentUserId={currentUserId}
              ratingFilter={reviewRatingFilter}
              onRatingFilterChange={setReviewRatingFilter}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          로그인 안내 모달
      ============================================ */}
      <AnimatePresence>
        {showLoginPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginPrompt(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-black"
            >
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-amber-50 to-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0_0_black]">
                  <AlertTriangle size={28} className="text-black" />
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">{t('auth.guestWarningTitle')}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t('auth.guestWarningText')}
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('auth.guestBenefit1')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('auth.guestBenefit2')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-slate-600">{t('auth.guestWarning')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#FCD34D] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#FCD34D] transition-all border-2 border-black"
                >
                  {t('buttons.loginSignup')}
                </button>

                <button
                  onClick={handleGuestStart}
                  className="w-full h-12 bg-white text-slate-600 rounded-2xl font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                >
                  <span>{t('buttons.startAsGuest')}</span>
                  <span className="text-xs text-slate-400">{t('auth.notSaved')}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/input?type=graduation&mode=online"
      />

      {/* 리뷰 모달 */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        programType="graduation"
        programName={t('products.graduation')}
        currentUserId={currentUserId}
        onWriteReview={() => {
          setShowReviewModal(false)
          setShowReviewWriteModal(true)
        }}
      />

      {/* 리뷰 작성 모달 */}
      <ReviewWriteModal
        isOpen={showReviewWriteModal}
        onClose={() => setShowReviewWriteModal(false)}
        programType="graduation"
        programName={t('products.graduation')}
        userId={currentUserId || ''}
        onSuccess={() => {
          // 리뷰 통계 새로고침
          getReviewStats('graduation').then(setReviewStats)
        }}
      />
    </main>
  )
}
