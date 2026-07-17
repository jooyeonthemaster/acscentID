"use client"

import { type CSSProperties, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Star, Gift, Zap,
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
import { ProgramAdminBridge } from '@/components/programs/ProgramAdminBridge'
import { ProgramLoginPrompt } from "@/components/programs/ProgramLoginPrompt"
import { ProgramReviewSection, ReviewTrigger } from "@/components/programs/ProgramReviewSection"
import { UnifiedDetailHero } from "@/components/products/UnifiedDetailHero"
import { DesktopDetailHero } from "@/components/desktop/DesktopDetailHero"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"
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

export default function IdolImagePage() {
  const { user, unifiedUser, loading } = useAuth()
  const { getOption } = useProductPricing()
  const idolOpt = getOption('image_analysis', '10ml')
  const idolDiscount = (idolOpt?.price && idolOpt.original_price && idolOpt.original_price > idolOpt.price)
    ? Math.round(((idolOpt.original_price - idolOpt.price) / idolOpt.original_price) * 100)
    : null
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const t = useTranslations()
  const productName = useProductDisplayName('idol-image', t('products.idolImage'))

  // 리뷰 통계 (히어로 ReviewTrigger용)
  const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null)
  useEffect(() => {
    getReviewStats('idol_image').then(setReviewStats).catch(() => {})
  }, [])

  const isLoggedIn = !!(user || unifiedUser)
  const currentUserId = user?.id || unifiedUser?.id

  const { isCustomMode, detail } = useProductDetail('idol-image')
  const { startTransition } = useTransition()
  const pageSubtitle = t('programs.subtitle.idolImage')
  const pageInfoTitle = t('programs.includes.idolImage')
  const pageInfoBody = `${t('programs.sizeSelectable')} / ${t('shipping.estimated')}`
  const pageCtaLabel = t('buttons.analyzeNow')
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(detail?.custom_html, {
      badge: 'BEST',
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
      startTransition("/input?type=idol_image&mode=online")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const heroProps = {
    productSlug: "idol-image",
    title: productName,
    imageAlt: t('programs.productImage'),
    pageContent,
    pagePositionStyle,
    breadcrumbs: [
      { label: t('programs.breadcrumbHome'), href: '/' },
      { label: t('programs.breadcrumbPrograms'), href: '/' },
      { label: productName },
    ],
    meta: (
      <ReviewTrigger
        averageRating={reviewStats?.average_rating || 4.9}
        totalCount={reviewStats?.total_count || 0}
        onClick={() => {
          document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
    ),
    price: (
      <div className="flex items-end gap-2">
        <span className="text-xl font-black text-[#1A1610]">{t('currency.symbol')}{formatPrice(idolOpt?.price ?? 24000)}~</span>
        {idolOpt?.original_price && idolOpt.original_price > idolOpt.price && (
          <>
            <span className="text-xs lg:text-sm text-[#8B8578] line-through">{t('currency.symbol')}{formatPrice(idolOpt.original_price)}</span>
            {idolDiscount !== null && (
              <span className="rounded-[12px] bg-red-500 px-1.5 py-0.5 text-[10px] lg:text-[12px] font-bold text-white">{idolDiscount}% OFF</span>
            )}
          </>
        )}
      </div>
    ),
    infoIcon: <Star size={14} className="fill-[#1A1610] text-[#1A1610]" />,
    infoItems: [t('programs.sizeSelectable'), t('shipping.estimated')],
    cta: {
      onClick: handleStartClick,
      disabled: loading,
      label: pageContent.ctaLabel,
      hint: t('programs.hint'),
    },
  }

  const detailBody = (
    <>
      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <div data-admin-editable="detail_html">
          {/* ============================================
              Feature Bar - 검은 배경
          ============================================ */}
          <section className="py-6 px-4 bg-[#FDFAF1]">
            <div className="w-full">
              <div className="flex flex-wrap items-center justify-center gap-4 text-[#1A1610]">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#8B8578]" />
                  <span className="font-bold text-xs lg:text-sm">{t('programs.features.aiAnalysis')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Palette size={14} className="text-[#8B8578]" />
                  <span className="font-bold text-xs lg:text-sm">{t('programs.features.customPerfume')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCheck size={14} className="text-[#8B8578]" />
                  <span className="font-bold text-xs lg:text-sm">{t('programs.features.analysisReport')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================
              진행 과정
          ============================================ */}
          <section className="py-12 px-4 bg-[#FDFAF1]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="w-full"
            >
              <div className="text-center mb-8">
                <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-[#EEB62B] text-[#1A1610] text-xs lg:text-sm font-black rounded-full border-2 border-[#B8880F] mb-3">
                  {t('programs.process.badge')}
                </motion.div>
                <motion.h2 variants={fadeInUp} className="text-2xl font-black text-[#1A1610] break-keep">
                  {t('programs.process.title')}
                </motion.h2>
              </div>

              <div className="relative">
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  {[
                    { step: "01", title: t('programs.process.step1Title'), desc: t('programs.process.step1Desc'), icon: Camera, color: "bg-[#EFE4C8]" },
                    { step: "02", title: t('programs.process.step2Title'), desc: t('programs.process.step2Desc'), icon: FileText, color: "bg-[#EFE4C8]" },
                    { step: "03", title: t('programs.process.step3Title'), desc: t('programs.process.step3Desc'), icon: Zap, color: "bg-[#EFE4C8]" },
                    { step: "04", title: t('programs.process.step4Title'), desc: t('programs.process.step4Desc'), icon: Gift, color: "bg-[#EFE4C8]" },
                  ].map((item, idx) => (
                    <motion.div key={idx} variants={fadeInUp} className="flex flex-col items-center text-center">
                      <div className={`w-14 h-14 ${item.color} border-2 border-[#D8CFBB] rounded-[12px] flex items-center justify-center mb-2`}>
                        <item.icon size={24} className="text-[#1A1610]" />
                      </div>
                      <span className="text-xl font-black text-[#B5A582] mb-1">{item.step}</span>
                      <h3 className="text-sm lg:text-base font-black text-[#1A1610] mb-0.5">{item.title}</h3>
                      <p className="text-[11px] lg:text-[13px] text-[#5C564A]">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </section>

          {/* ============================================
              분석 결과 미리보기
          ============================================ */}
          <section className="py-12 px-4 bg-[#F5EFE2] border-y-2 border-[#D8CFBB]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="w-full"
            >
              <div className="text-center mb-8">
                <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-[#EEB62B] text-[#1A1610] text-xs lg:text-sm font-black rounded-full border-2 border-[#B8880F] mb-3">
                  {t('programs.resultPreview.badge')}
                </motion.div>
                <motion.h2 variants={fadeInUp} className="text-xl font-black text-[#1A1610] mb-3 break-keep">
                  {t('programs.resultPreview.title')}
                </motion.h2>
                <motion.p variants={fadeInUp} className="text-sm lg:text-base text-[#5C564A] whitespace-pre-line">
                  {t('programs.resultPreview.description')}
                </motion.p>
              </div>

              {/* 결과 미리보기 - Remotion Player */}
              <motion.div variants={fadeInUp} className="flex justify-center">
                <div className="w-full">
                  <AnalysisPreviewPlayer
                    colors={['#9F9F9F', '#C0C0C0', '#292929']}
                    keywords={[
                      t('programs.detail.idolImage.previewKeyword1'),
                      t('programs.detail.idolImage.previewKeyword2'),
                      t('programs.detail.idolImage.previewKeyword3'),
                    ]}
                    moodScore={87}
                    perfumeName={`AC'SCENT 27\n${t('programs.detail.idolImage.previewPerfumeName')}`}
                    topNotes={t('programs.detail.idolImage.previewTopNotes')}
                    middleNotes={t('programs.detail.idolImage.previewMiddleNotes')}
                    baseNotes={t('programs.detail.idolImage.previewBaseNotes')}
                  />
                  <p className="text-center text-xs lg:text-sm text-[#8B8578] mt-3">
                    {t('programs.previewCaption')}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </section>
        </div>
      )}
    </>
  )

  const reviewSection = (
    <ProgramReviewSection
      programType="idol_image"
      programName={productName}
      currentUserId={currentUserId}
      isLoggedIn={isLoggedIn}
      onLoginRequired={() => setShowLoginPrompt(true)}
    />
  )

  return (
    <InactiveProductGuard productSlug="idol-image">
    <ViewportSwitch
      mobile={
        <main className="relative min-h-screen bg-[#0C0E16] font-wanted">
          <Header />
          <ProgramAdminBridge productSlug="idol-image" />
          <UnifiedDetailHero {...heroProps} />
          {detailBody}
          {reviewSection}
        </main>
      }
      desktop={
        <main className="relative min-h-screen bg-[#0C0E16] pb-16 font-wanted">
          <DesktopDetailHero {...heroProps} />
          <div className="mx-auto w-full max-w-[960px]">{detailBody}</div>
          <div className="mx-auto w-full max-w-[960px]">{reviewSection}</div>
        </main>
      }
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
      redirectPath="/input?type=idol_image&mode=online"
    />
    </InactiveProductGuard>
  )
}
