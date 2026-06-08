"use client"

import { type CSSProperties, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Sparkles, Palette, FileCheck,
  Heart, Camera, FlaskConical
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useTransition } from "@/contexts/TransitionContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { useTranslations } from 'next-intl'
import { useProductDetail } from '@/hooks/useProductDetail'
import { InactiveProductGuard } from '@/components/programs/InactiveProductGuard'
import { CustomDetailRenderer } from '@/components/programs/CustomDetailRenderer'
import { ProgramAdminBridge } from '@/components/programs/ProgramAdminBridge'
import { ProgramLoginPrompt } from "@/components/programs/ProgramLoginPrompt"
import { ProgramReviewSection, ReviewTrigger } from "@/components/programs/ProgramReviewSection"
import { UnifiedDetailHero } from "@/components/products/UnifiedDetailHero"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice, isScentPaperSize } from "@/types/cart"
import { useProductDisplayName } from '@/hooks/useAdminContent'
import { extractProductPageContentWithFallback, type ProductPagePositionField } from "@/lib/products/page-content"

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
  // 시향지(저가 애드온)는 세트 최소가가 아니므로 제외한다.
  const chemMin = getOptions('chemistry_set')
    .filter((o) => !isScentPaperSize(o.size))
    .reduce<number | null>(
      (acc, o) => (acc === null || o.price < acc ? o.price : acc),
      null,
    )
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const t = useTranslations()
  const productName = useProductDisplayName('chemistry', t('products.chemistry'))

  // 리뷰 통계 (히어로 ReviewTrigger용)
  const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null)
  useEffect(() => {
    getReviewStats('chemistry_set').then(setReviewStats).catch(() => {})
  }, [])

  const isLoggedIn = !!(user || unifiedUser)
  const currentUserId = user?.id || unifiedUser?.id

  const { isCustomMode, detail } = useProductDetail('chemistry')
  const { startTransition } = useTransition()
  const pageSubtitle = t('programs.subtitle.chemistry')
  const pageInfoTitle = t('programs.includes.chemistry')
  const pageInfoBody = `${t('programs.detail.chemistry.info.volumeOptions')} / ${t('shipping.estimated')}`
  const pageCtaLabel = t('buttons.analyzeNow')
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(detail?.custom_html, {
      badge: 'NEW',
      subtitle: pageSubtitle,
      infoTitle: pageInfoTitle,
      infoBody: pageInfoBody,
      ctaLabel: pageCtaLabel,
    }),
    [detail?.custom_html, pageSubtitle, pageInfoTitle, pageInfoBody, pageCtaLabel],
  )
  const pagePositionStyle = (field: ProductPagePositionField): CSSProperties | undefined => {
    const position = pageContent.positions[field]
    if (!position || (!position.x && !position.y)) return undefined

    return {
      transform: `translate(${position.x}px, ${position.y}px)`,
    }
  }

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
      <ProgramAdminBridge productSlug="chemistry" />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <UnifiedDetailHero
        productSlug="chemistry"
        title={productName}
        imageAlt={t('programs.productImage')}
        pageContent={pageContent}
        pagePositionStyle={pagePositionStyle}
        breadcrumbs={[
          { label: t('programs.breadcrumbHome'), href: '/' },
          { label: t('programs.breadcrumbPrograms'), href: '/' },
          { label: productName },
        ]}
        meta={
          <ReviewTrigger
            averageRating={reviewStats?.average_rating || 4.9}
            totalCount={reviewStats?.total_count || 0}
            onClick={() => {
              document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })
            }}
          />
        }
        price={
          <>
            <div className="flex items-end gap-2">
              <span className="text-xl font-black text-black">{t('currency.symbol')}{formatPrice(chemMin ?? 38000)}~</span>
              <span className="text-xs text-slate-400">{t('programs.detail.chemistry.price.setBasis')}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {t('programs.detail.chemistry.price.setLine', { p10: `${t('currency.symbol')}${formatPrice(chemSet10?.price ?? 38000)}`, p50: `${t('currency.symbol')}${formatPrice(chemSet50?.price ?? 60000)}` })}
            </div>
          </>
        }
        infoIcon={<FlaskConical size={14} className="text-slate-900" />}
        infoItems={[t('programs.detail.chemistry.info.volumeOptions'), t('shipping.estimated')]}
        cta={{
          onClick: handleStartClick,
          disabled: loading,
          label: pageContent.ctaLabel,
          hint: t('programs.hint'),
        }}
      />

      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <div data-admin-editable="detail_html">
          {/* ============================================
              Feature Bar - 검은 배경
          ============================================ */}
          <section className="py-6 px-4 bg-black">
            <div className="w-full">
              <div className="flex flex-wrap items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span className="font-bold text-xs">{t('programs.detail.chemistry.featureBar.aiAnalysis')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Palette size={14} className="text-cyan-400" />
                  <span className="font-bold text-xs">{t('programs.detail.chemistry.featureBar.layeringSet')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck size={14} className="text-cyan-400" />
                  <span className="font-bold text-xs">{t('programs.detail.chemistry.featureBar.profileCard')}</span>
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
                    { step: "01", title: t('programs.detail.chemistry.process.step1Title'), desc: t('programs.detail.chemistry.process.step1Desc'), icon: Camera, color: "bg-violet-400" },
                    { step: "02", title: t('programs.detail.chemistry.process.step2Title'), desc: t('programs.detail.chemistry.process.step2Desc'), icon: Heart, color: "bg-pink-400" },
                    { step: "03", title: t('programs.detail.chemistry.process.step3Title'), desc: t('programs.detail.chemistry.process.step3Desc'), icon: Sparkles, color: "bg-rose-400" },
                    { step: "04", title: t('programs.detail.chemistry.process.step4Title'), desc: t('programs.detail.chemistry.process.step4Desc'), icon: FlaskConical, color: "bg-purple-400" },
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
              레이어링 퍼퓸만의 특별함
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
                  {t('programs.detail.chemistry.special.heading')}
                </motion.h2>
              </div>

              <motion.div variants={staggerContainer} className="space-y-4">
                <motion.div variants={fadeInUp} className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0_0_black]">
                  <h3 className="text-sm font-black text-black mb-1.5">🧪 {t('programs.detail.chemistry.special.card1Title')}</h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{t('programs.detail.chemistry.special.card1Desc')}</p>
                </motion.div>

                <motion.div variants={fadeInUp} className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0_0_black]">
                  <h3 className="text-sm font-black text-black mb-1.5">🎭 {t('programs.detail.chemistry.special.card2Title')}</h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{t('programs.detail.chemistry.special.card2Desc')}</p>
                </motion.div>

                <motion.div variants={fadeInUp} className="bg-[#FFFDF5] border-2 border-black rounded-2xl p-5 shadow-[3px_3px_0_0_black]">
                  <h3 className="text-sm font-black text-black mb-1.5">💜 {t('programs.detail.chemistry.special.card3Title')}</h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{t('programs.detail.chemistry.special.card3Desc')}</p>
                </motion.div>
              </motion.div>
            </motion.div>
          </section>
        </div>
      )}

      {/* ============================================
          실제 후기 (공유 컴포넌트)
      ============================================ */}
      <ProgramReviewSection
        programType="chemistry_set"
        programName={productName}
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
