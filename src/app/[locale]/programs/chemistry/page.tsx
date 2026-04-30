"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  ChevronRight, Sparkles, Palette, FileCheck,
  Heart, Camera, Layers, FlaskConical
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useTransition } from "@/contexts/TransitionContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { useTranslations } from 'next-intl'
import { useProductDetail } from '@/hooks/useProductDetail'
import { InactiveProductGuard } from '@/components/programs/InactiveProductGuard'
import { CustomDetailRenderer } from '@/components/programs/CustomDetailRenderer'
import { ProgramImageGallery } from "@/components/programs/ProgramImageGallery"
import { ProgramLoginPrompt } from "@/components/programs/ProgramLoginPrompt"
import { ProgramReviewSection, ReviewTrigger } from "@/components/programs/ProgramReviewSection"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"

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

export default function ChemistryProgramPage() {
  const { user, unifiedUser, loading } = useAuth()
  const { getOption, getOptions } = useProductPricing()
  const chemSet10 = getOption('chemistry_set', 'set_10ml')
  const chemSet50 = getOption('chemistry_set', 'set_50ml')
  const chemMin = getOptions('chemistry_set').reduce<number | null>(
    (acc, o) => (acc === null || o.price < acc ? o.price : acc),
    null,
  )
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const t = useTranslations()

  // 리뷰 통계 (히어로 ReviewTrigger용)
  const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null)
  useEffect(() => {
    getReviewStats('chemistry_set').then(setReviewStats).catch(() => {})
  }, [])

  const isLoggedIn = !!(user || unifiedUser)
  const currentUserId = user?.id || unifiedUser?.id

  const { isCustomMode, detail } = useProductDetail('chemistry')
  const { startTransition } = useTransition()

  const handleStartClick = () => {
    if (loading) return
    if (isLoggedIn) {
      startTransition("/input?type=chemistry&mode=online")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  return (
    <InactiveProductGuard productSlug="chemistry">
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
      <Header />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <section className="pt-28 pb-10 px-4">
        <div className="w-full">
          {/* 이미지 갤러리 (공유 컴포넌트) */}
          <ProgramImageGallery
            productSlug="chemistry"
            fallbackImages={[
              "/images/perfume/KakaoTalk_20260125_225218071.jpg",
              "/images/perfume/KakaoTalk_20260125_225218071_01.jpg",
            ]}
            badge="NEW"
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
              <span className="text-black font-bold">{t('products.chemistry')}</span>
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
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-pink-500 to-rose-500">
                  {t('products.chemistry')}
                </span>
              </h1>
              <p className="text-sm text-slate-600 font-medium">
                {t('programs.subtitle.chemistry')}
              </p>
            </div>

            {/* 가격 + 구성품 안내 */}
            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0_0_black] mb-4">
              {/* 가격 */}
              <div className="flex items-end gap-2 mb-3">
                <span className="text-xl font-black text-black">{t('currency.symbol')}{formatPrice(chemMin ?? 38000)}~</span>
                <span className="text-xs text-slate-400">(세트 기준)</span>
              </div>
              <div className="text-xs text-slate-500 mb-3">
                10ml x 2 세트 {t('currency.symbol')}{formatPrice(chemSet10?.price ?? 38000)} / 50ml x 2 세트 {t('currency.symbol')}{formatPrice(chemSet50?.price ?? 60000)}
              </div>

              {/* 구성품 안내 */}
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <FlaskConical size={14} className="text-violet-500" />
                  <span className="font-bold text-xs text-black">{t('programs.includes.chemistry')}</span>
                </div>
                <ul className="space-y-0.5 text-[11px] text-slate-600 pl-5">
                  <li className="list-disc">10ml x 2 / 50ml x 2 용량 선택 가능</li>
                  <li className="list-disc">{t('shipping.estimated')}</li>
                </ul>
              </div>
            </div>

            {/* CTA 버튼 - idol-image와 동일한 yellow-amber 스타일 */}
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
                  <span className="font-bold text-xs">AI 케미 분석</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Palette size={14} className="text-cyan-400" />
                  <span className="font-bold text-xs">레이어링 세트</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck size={14} className="text-cyan-400" />
                  <span className="font-bold text-xs">케미 프로필 카드</span>
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
                <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-violet-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
                  {t('programs.process.badge')}
                </motion.div>
                <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black break-keep">
                  {t('programs.process.title')}
                </motion.h2>
              </div>

              <div className="relative">
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  {[
                    { step: "01", title: "정보 입력", desc: "이미지와 이름 입력", icon: Camera, color: "bg-violet-400" },
                    { step: "02", title: "관계 설정", desc: "트로프 & 아키타입 선택", icon: Heart, color: "bg-pink-400" },
                    { step: "03", title: "AI 케미 분석", desc: "각 캐릭터 향수 분석", icon: Sparkles, color: "bg-rose-400" },
                    { step: "04", title: "향수 세트", desc: "맞춤 케미 세트 완성", icon: FlaskConical, color: "bg-purple-400" },
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
              케미 향수만의 특별함
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
                  ✨ SPECIAL
                </motion.div>
                <motion.h2 variants={fadeInUp} className="text-xl font-black text-black mb-3 break-keep">
                  케미 향수만의 특별함
                </motion.h2>
              </div>

              <motion.div variants={staggerContainer} className="space-y-4">
                <motion.div variants={fadeInUp} className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0_0_black]">
                  <h3 className="text-sm font-black text-black mb-1.5">🧪 10가지 케미 분석</h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">향 케미, 레이어링 가이드, 색채 케미, 특성 시너지, 관계 다이나믹, 만약에 시나리오, 대표 대사, 계절/시간, 이름 케미, 미래 예측까지!</p>
                </motion.div>

                <motion.div variants={fadeInUp} className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0_0_black]">
                  <h3 className="text-sm font-black text-black mb-1.5">🎭 4대 케미향</h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">밀당 케미, 슬로우번 케미, 달달 케미, 폭풍 케미 중 AI가 판정한 케미 유형과 동적 칭호를 받아보세요!</p>
                </motion.div>

                <motion.div variants={fadeInUp} className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0_0_black]">
                  <h3 className="text-sm font-black text-black mb-1.5">💜 레이어링 세트</h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">두 캐릭터에게 각각 다른 향수가 매칭되며, 두 향을 함께 레이어링할 수 있는 세트로 제공됩니다.</p>
                </motion.div>
              </motion.div>
            </motion.div>
          </section>
        </>
      )}

      {/* ============================================
          실제 후기 (공유 컴포넌트)
      ============================================ */}
      <ProgramReviewSection
        programType="chemistry_set"
        programName={t('products.chemistry')}
        currentUserId={currentUserId}
        isLoggedIn={isLoggedIn}
        onLoginRequired={() => setShowLoginPrompt(true)}
      />

      {/* 로그인 안내 모달 (공유 컴포넌트) */}
      <ProgramLoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLoginClick}
      />

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/input?type=chemistry&mode=online"
      />
    </main>
    </InactiveProductGuard>
  )
}
