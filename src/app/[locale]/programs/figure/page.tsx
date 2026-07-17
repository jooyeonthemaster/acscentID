"use client"

import { type CSSProperties, useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, X, AlertTriangle,
  Truck, ShoppingCart,
  Box, Droplets, Gem, Camera
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useTransition } from "@/contexts/TransitionContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { ReviewModal, ReviewTrigger, ReviewWriteModal, ReviewStats, ReviewList } from "@/components/review"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useTranslations } from 'next-intl'
import { useProductDisplayName, useProductImages } from '@/hooks/useAdminContent'
import { useProductDetail } from '@/hooks/useProductDetail'
import { InactiveProductGuard } from '@/components/programs/InactiveProductGuard'
import { CustomDetailRenderer } from '@/components/programs/CustomDetailRenderer'
import { ProgramAdminBridge } from '@/components/programs/ProgramAdminBridge'
import { UnifiedDetailHero } from "@/components/products/UnifiedDetailHero"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"
import { extractProductPageContentWithFallback, type ProductPagePositionField } from "@/lib/products/page-content"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { FigureDesktop } from "./_desktop/FigureDesktop"

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

export default function FigurePage() {
  const { user, unifiedUser, loading } = useAuth()
  const { getOption } = useProductPricing()
  const figureOpt = getOption('figure_diffuser', 'set')
  const figureDiscount = (figureOpt?.price && figureOpt.original_price && figureOpt.original_price > figureOpt.price)
    ? Math.round(((figureOpt.original_price - figureOpt.price) / figureOpt.original_price) * 100)
    : null
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const t = useTranslations()
  const productName = useProductDisplayName('figure', t('products.figureDiffuser'))

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
        const stats = await getReviewStats('figure')
        setReviewStats(stats)
      } catch (error) {
        console.error('Failed to load review stats:', error)
      }
    }
    loadReviewStats()
  }, [])

  const { imageUrls: dynamicImages, loading: imagesLoading } = useProductImages('figure')
  const productImages = imagesLoading ? [] : dynamicImages
  const currentImage = productImages[selectedImage] || productImages[0] || ''

  const { isCustomMode, detail } = useProductDetail('figure')
  const { startTransition } = useTransition()
  const pageSubtitle = t('programs.subtitle.figure')
  const pageInfoTitle = t('programs.includes.figure')
  const pageInfoBody = `${t('programs.figure.sachetsIncluded')} / ${t('shipping.afterProduction')}`
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
      startTransition("/input?type=figure&mode=online")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const productComponents = [
    { icon: Box, name: t('programs.figure.comp3dFigure'), desc: t('programs.figure.comp3dFigureDesc'), color: "bg-[#EFE4C8]" },
    { icon: Gem, name: t('programs.figure.compSachets'), desc: t('programs.figure.compSachetsDesc'), color: "bg-[#EFE4C8]" },
    { icon: Sparkles, name: t('programs.figure.compAiEssence'), desc: t('programs.figure.compAiEssenceDesc'), color: "bg-[#EFE4C8]" },
  ]

  const heroSection = (
    <>
      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <UnifiedDetailHero
        productSlug="figure"
        title={productName}
        imageAlt={t('programs.productImage')}
        pageContent={pageContent}
        pagePositionStyle={pagePositionStyle}
        breadcrumbs={[
          { label: t('programs.breadcrumbHome'), href: '/' },
          { label: t('programs.breadcrumbPrograms'), href: '/' },
          { label: productName },
        ]}
        images={{
          urls: productImages,
          loading: imagesLoading,
          selectedIndex: selectedImage,
          onSelect: setSelectedImage,
        }}
        secondaryBadges={
          <span className="inline-flex min-h-11 items-center rounded-full border-[3px] border-[#D8CFBB] bg-[#EFE4C8] px-5 text-sm lg:text-base font-black text-[#1A1610]">
            DIY KIT
          </span>
        }
        meta={
          <ReviewTrigger
            averageRating={reviewStats?.average_rating || 4.8}
            totalCount={reviewStats?.total_count || 0}
            onClick={() => setShowReviewModal(true)}
          />
        }
        price={
          <div className="flex items-end gap-2">
            <span className="text-xl font-black text-[#1A1610]">{t('currency.symbol')}{formatPrice(figureOpt?.price ?? 48000)}</span>
            {figureOpt?.original_price && figureOpt.original_price > figureOpt.price && (
              <>
                <span className="text-xs lg:text-sm text-[#8B8578] line-through">{t('currency.symbol')}{formatPrice(figureOpt.original_price)}</span>
                {figureDiscount !== null && (
                  <span className="rounded-[12px] bg-red-500 px-1.5 py-0.5 text-[10px] lg:text-[12px] font-bold text-white">{figureDiscount}% OFF</span>
                )}
              </>
            )}
          </div>
        }
        infoIcon={<Sparkles size={14} className="text-[#1A1610]" />}
        infoItems={[t('programs.figure.sachetsIncluded'), t('shipping.afterProduction')]}
        cta={{
          onClick: handleStartClick,
          disabled: loading,
          label: pageContent.ctaLabel,
          hint: t('programs.figure.hint'),
        }}
      />
    </>
  )

  const detailBody = (
    <>
      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <div data-admin-editable="detail_html">
          {/* ============================================
              구성품 배너
          ============================================ */}
          <section className="py-6 px-4 bg-[#FDFAF1]">
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-center gap-4 text-[#1A1610]">
            {productComponents.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <item.icon size={14} className="text-[#8B8578]" />
                <span className="font-bold text-xs lg:text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          진행 과정
      ============================================ */}
      <section className="py-12 px-4 bg-[#F0FDFF]">
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

          {/* 2x2 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { step: "01", title: t('programs.figure.processStep1'), desc: t('programs.figure.processStep1Desc'), icon: Camera, color: "bg-[#EFE4C8]" },
              { step: "02", title: t('programs.figure.processStep2'), desc: t('programs.figure.processStep2Desc'), icon: Sparkles, color: "bg-[#EFE4C8]" },
              { step: "03", title: t('programs.figure.processStep3'), desc: t('programs.figure.processStep3Desc'), icon: ShoppingCart, color: "bg-[#EFE4C8]" },
              { step: "04", title: t('programs.figure.processStep4'), desc: t('programs.figure.processStep4Desc'), icon: Truck, color: "bg-[#EFE4C8]" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="relative bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[12px] p-3"
              >
                {/* 스텝 번호 배지 */}
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#FDFAF1] text-[#1A1610] rounded-full flex items-center justify-center font-black text-[10px] lg:text-[12px] border-2 border-[#5C564A]">
                  {item.step}
                </div>

                {/* 아이콘 */}
                <div className={`w-10 h-10 ${item.color} border-2 border-[#D8CFBB] rounded-[12px] flex items-center justify-center mx-auto mb-2`}>
                  <item.icon size={20} className="text-[#1A1610]" />
                </div>

                {/* 텍스트 */}
                <h3 className="text-xs lg:text-sm font-black text-[#1A1610] mb-0.5 text-center">{item.title}</h3>
                <p className="text-[10px] lg:text-[12px] text-[#8B8578] text-center leading-tight">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          구성품 상세
      ============================================ */}
      <section className="py-12 px-4 bg-gradient-to-b from-[#F0FDFF] to-[#F5EFE2]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-[#EEB62B] text-[#1A1610] text-xs lg:text-sm font-black rounded-full border-2 border-[#B8880F] mb-3">
              {t('programs.figure.packageBadge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-[#1A1610] break-keep">
              {t('programs.figure.packageTitle')}
            </motion.h2>
          </div>

          {/* 메인 구성품 - 가로 가운데 정렬 */}
          <div className="flex justify-center gap-3 pt-4 pb-4">
            {productComponents.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="w-[140px] group relative bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[12px] p-4"
              >
                {/* 번호 배지 */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#FDFAF1] text-[#1A1610] rounded-full flex items-center justify-center font-black text-[10px] lg:text-[12px] border-2 border-[#5C564A]">
                  {idx + 1}
                </div>

                {/* 아이콘 */}
                <div className={`w-12 h-12 ${item.color} border-2 border-[#D8CFBB] rounded-[12px] flex items-center justify-center mx-auto mb-3`}>
                  <item.icon size={22} className="text-[#1A1610]" />
                </div>

                {/* 텍스트 */}
                <p className="text-[10px] lg:text-[12px] text-[#8B8578] text-center">{item.desc}</p>
                <h3 className="font-black text-xs lg:text-sm text-[#1A1610] text-center">{item.name}</h3>
              </motion.div>
            ))}
          </div>

          {/* 하단 안내 */}
          <motion.div variants={fadeInUp} className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#EDE5D2] to-[#EDE5D2] rounded-full border border-[#D8CFBB]">
              <Truck size={14} className="text-[#5C564A]" />
              <span className="text-xs lg:text-sm text-[#5C564A] font-medium">{t('programs.figure.packageShipping')}</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          결과물 미리보기
      ============================================ */}
      <section className="py-10 px-4 bg-[#F5EFE2] border-y-2 border-[#D8CFBB]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-6">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-[#EEB62B] text-[#1A1610] text-xs lg:text-sm font-black rounded-full border-2 border-[#B8880F] mb-3">
              {t('programs.figure.resultBadge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-xl font-black text-[#1A1610] mb-3 break-keep">
              {t('programs.figure.resultTitle')}
            </motion.h2>
          </div>

          <motion.div variants={fadeInUp} className="bg-gradient-to-br from-[#FDFAF1] to-[#FDFAF1] border-2 border-[#D8CFBB] rounded-[12px] p-4">
            {/* 완성품 이미지 */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative">
                <div className="w-40 h-40 bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[12px] flex items-center justify-center overflow-hidden">
                  {currentImage ? (
                    <img src={currentImage} alt={t('programs.productImage')} className="w-[80%] h-[80%] object-contain" />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#EDE5D2] to-[#D8CFBB]" />
                  )}
                </div>
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#EFE4C8] text-[#1A1610] font-black rounded-full border-2 border-[#D8CFBB] text-[10px] lg:text-[12px]">
                  {t('programs.figure.badge3d')}
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-black text-[#1A1610] mb-1">{t('programs.figure.myFigure')}</h3>
                <p className="text-xs lg:text-sm text-[#5C564A]">{t('programs.figure.myFigureDesc')}</p>
              </div>
            </div>

            {/* 디퓨저 사용법 */}
            <div className="bg-[#F5EFE2] border-2 border-[#D8CFBB] rounded-[12px] p-3">
              <h4 className="font-black text-sm lg:text-base mb-2 flex items-center gap-2">
                <Droplets size={16} className="text-[#8B8578]" />
                {t('programs.figure.diffuserTitle')}
              </h4>
              <div className="space-y-1.5 text-xs lg:text-sm">
                <div className="flex items-center gap-2 p-1.5 bg-[#FDFAF1] rounded-[12px]">
                  <span className="w-5 h-5 bg-[#EFE4C8] text-[#1A1610] rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-bold border border-[#D8CFBB] flex-shrink-0">1</span>
                  <span>{t('programs.figure.diffuserStep1')}</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-[#FDFAF1] rounded-[12px]">
                  <span className="w-5 h-5 bg-[#EFE4C8] text-[#1A1610] rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-bold border border-[#D8CFBB] flex-shrink-0">2</span>
                  <span>{t('programs.figure.diffuserStep2')}</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-[#FDFAF1] rounded-[12px]">
                  <span className="w-5 h-5 bg-[#EFE4C8] text-[#1A1610] rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-bold border border-[#D8CFBB] flex-shrink-0">3</span>
                  <span>{t('programs.figure.diffuserStep3')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
        </div>
      )}
    </>
  )

  const reviewSection = (
    <>
      {/* ============================================
          실제 후기
      ============================================ */}
      <section id="reviews" className="py-12 px-4 bg-[#F5EFE2]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-[#EEB62B] text-[#1A1610] text-xs lg:text-sm font-black rounded-full border-2 border-[#B8880F] mb-3">
              {t('programs.reviews.badge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-[#1A1610] mb-2 break-keep">
              {t('programs.reviews.title')}
            </motion.h2>
            <motion.button
              variants={fadeInUp}
              onClick={() => setShowReviewModal(true)}
              className="text-xs lg:text-sm text-[#8B8578] hover:text-[#1A1610] transition-colors underline underline-offset-4"
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
              programType="figure"
              currentUserId={currentUserId}
              ratingFilter={reviewRatingFilter}
              onRatingFilterChange={setReviewRatingFilter}
            />
          </motion.div>
        </motion.div>
      </section>
    </>
  )

  const mobileTree = (
    <main className="relative min-h-screen bg-[#F0FDFF] font-wanted">
      <Header />
      <ProgramAdminBridge productSlug="figure" />

      {heroSection}

      {detailBody}

      {reviewSection}
    </main>
  )

  return (
    <InactiveProductGuard productSlug="figure">
      <ViewportSwitch
        mobile={mobileTree}
        desktop={
          <FigureDesktop
            title={productName}
            imageAlt={t('programs.productImage')}
            pageContent={pageContent}
            pagePositionStyle={pagePositionStyle}
            breadcrumbs={[
              { label: t('programs.breadcrumbHome'), href: '/' },
              { label: t('programs.breadcrumbPrograms'), href: '/' },
              { label: productName },
            ]}
            images={{
              urls: productImages,
              loading: imagesLoading,
              selectedIndex: selectedImage,
              onSelect: setSelectedImage,
            }}
            secondaryBadges={
              <span className="inline-flex min-h-11 items-center rounded-full border-[3px] border-[#D8CFBB] bg-[#EFE4C8] px-5 text-sm lg:text-base font-black text-[#1A1610]">
                DIY KIT
              </span>
            }
            meta={
              <ReviewTrigger
                averageRating={reviewStats?.average_rating || 4.8}
                totalCount={reviewStats?.total_count || 0}
                onClick={() => setShowReviewModal(true)}
              />
            }
            price={
              <div className="flex items-end gap-2">
                <span className="text-xl font-black text-[#1A1610]">{t('currency.symbol')}{formatPrice(figureOpt?.price ?? 48000)}</span>
                {figureOpt?.original_price && figureOpt.original_price > figureOpt.price && (
                  <>
                    <span className="text-xs lg:text-sm text-[#8B8578] line-through">{t('currency.symbol')}{formatPrice(figureOpt.original_price)}</span>
                    {figureDiscount !== null && (
                      <span className="rounded-[12px] bg-red-500 px-1.5 py-0.5 text-[10px] lg:text-[12px] font-bold text-white">{figureDiscount}% OFF</span>
                    )}
                  </>
                )}
              </div>
            }
            infoIcon={<Sparkles size={14} className="text-[#1A1610]" />}
            infoItems={[t('programs.figure.sachetsIncluded'), t('shipping.afterProduction')]}
            cta={{
              onClick: handleStartClick,
              disabled: loading,
              label: pageContent.ctaLabel,
              hint: t('programs.figure.hint'),
            }}
            detailBody={detailBody}
            reviewSection={reviewSection}
          />
        }
      />

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
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-[#F5EFE2] rounded-[12px] shadow-2xl overflow-hidden border-2 border-[#D8CFBB]"
            >
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-[#FDFAF1] to-[#F5EFE2]">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#EDE5D2] transition-colors"
                >
                  <X size={20} className="text-[#8B8578]" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-[#EFE4C8] rounded-[12px] flex items-center justify-center shadow-lg border-2 border-[#D8CFBB]">
                  <AlertTriangle size={28} className="text-[#1A1610]" />
                </div>

                <h2 className="text-xl font-black text-[#1A1610] mb-2">{t('auth.guestWarningTitle')}</h2>
                <p className="text-sm lg:text-base text-[#5C564A] leading-relaxed">
                  {t('programs.figure.loginWarning')}<br />
                  <span className="font-bold text-red-500">{t('auth.notSavedBold')}</span>
                </p>
              </div>

              <div className="px-6 py-4 bg-[#EDE5D2] border-y-2 border-[#D8CFBB]">
                <div className="space-y-2 text-sm lg:text-base">
                  <div className="flex items-start gap-2">
                    <span className="text-[#8B8578] font-bold">✓</span>
                    <span className="text-[#5C564A]">{t('programs.figure.loginBenefit1')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#8B8578] font-bold">✓</span>
                    <span className="text-[#5C564A]">{t('programs.figure.loginBenefit2')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#8B8578] font-bold">!</span>
                    <span className="text-[#5C564A]">{t('programs.figure.loginWarningGuest')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-[#12141D] text-[#F5EFE2] rounded-[12px] font-bold text-lg transition-all border-2 border-[#12141D]"
                >
                  {t('buttons.loginSignup')}
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
        redirectPath="/input?type=figure&mode=online"
      />

      {/* 리뷰 모달 */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        programType="figure"
        programName={productName}
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
        programType="figure"
        programName={productName}
        userId={currentUserId || ''}
        onSuccess={() => {
          // 리뷰 통계 새로고침
          getReviewStats('figure').then(setReviewStats)
        }}
      />
    </InactiveProductGuard>
  )
}
