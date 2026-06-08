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
    { icon: Box, name: t('programs.figure.comp3dFigure'), desc: t('programs.figure.comp3dFigureDesc'), color: "bg-cyan-400" },
    { icon: Gem, name: t('programs.figure.compSachets'), desc: t('programs.figure.compSachetsDesc'), color: "bg-purple-400" },
    { icon: Sparkles, name: t('programs.figure.compAiEssence'), desc: t('programs.figure.compAiEssenceDesc'), color: "bg-yellow-400" },
  ]

  return (
    <InactiveProductGuard productSlug="figure">
    <main className="relative min-h-screen bg-[#F0FDFF] font-sans">
      <Header />
      <ProgramAdminBridge productSlug="figure" />

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
          <span className="inline-flex min-h-11 items-center rounded-full border-[3px] border-black bg-[#FCD34D] px-5 text-sm font-black text-black shadow-[2px_2px_0_0_black]">
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
            <span className="text-xl font-black text-black">{t('currency.symbol')}{formatPrice(figureOpt?.price ?? 48000)}</span>
            {figureOpt?.original_price && figureOpt.original_price > figureOpt.price && (
              <>
                <span className="text-xs text-slate-400 line-through">{t('currency.symbol')}{formatPrice(figureOpt.original_price)}</span>
                {figureDiscount !== null && (
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{figureDiscount}% OFF</span>
                )}
              </>
            )}
          </div>
        }
        infoIcon={<Sparkles size={14} className="text-slate-900" />}
        infoItems={[t('programs.figure.sachetsIncluded'), t('shipping.afterProduction')]}
        cta={{
          onClick: handleStartClick,
          disabled: loading,
          label: pageContent.ctaLabel,
          hint: t('programs.figure.hint'),
        }}
      />

      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <div data-admin-editable="detail_html">
          {/* ============================================
              구성품 배너
          ============================================ */}
          <section className="py-6 px-4 bg-black">
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-center gap-4 text-white">
            {productComponents.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <item.icon size={14} className="text-cyan-400" />
                <span className="font-bold text-xs">{item.name}</span>
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
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-blue-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
              {t('programs.process.badge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black break-keep">
              {t('programs.process.title')}
            </motion.h2>
          </div>

          {/* 2x2 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { step: "01", title: t('programs.figure.processStep1'), desc: t('programs.figure.processStep1Desc'), icon: Camera, color: "bg-cyan-400" },
              { step: "02", title: t('programs.figure.processStep2'), desc: t('programs.figure.processStep2Desc'), icon: Sparkles, color: "bg-purple-400" },
              { step: "03", title: t('programs.figure.processStep3'), desc: t('programs.figure.processStep3Desc'), icon: ShoppingCart, color: "bg-blue-400" },
              { step: "04", title: t('programs.figure.processStep4'), desc: t('programs.figure.processStep4Desc'), icon: Truck, color: "bg-pink-400" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="relative bg-white border-2 border-black rounded-xl p-3 shadow-[2px_2px_0_0_black]"
              >
                {/* 스텝 번호 배지 */}
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center font-black text-[10px] border-2 border-white">
                  {item.step}
                </div>

                {/* 아이콘 */}
                <div className={`w-10 h-10 ${item.color} border-2 border-black rounded-lg shadow-[2px_2px_0_0_black] flex items-center justify-center mx-auto mb-2`}>
                  <item.icon size={20} className="text-white" />
                </div>

                {/* 텍스트 */}
                <h3 className="text-xs font-black text-black mb-0.5 text-center">{item.title}</h3>
                <p className="text-[10px] text-slate-500 text-center leading-tight">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          구성품 상세
      ============================================ */}
      <section className="py-12 px-4 bg-gradient-to-b from-[#F0FDFF] to-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-cyan-400 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
              {t('programs.figure.packageBadge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black break-keep">
              {t('programs.figure.packageTitle')}
            </motion.h2>
          </div>

          {/* 메인 구성품 - 가로 가운데 정렬 */}
          <div className="flex justify-center gap-3 pt-4 pb-4">
            {productComponents.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="w-[140px] group relative bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0_0_black]"
              >
                {/* 번호 배지 */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center font-black text-[10px] border-2 border-white">
                  {idx + 1}
                </div>

                {/* 아이콘 */}
                <div className={`w-12 h-12 ${item.color} border-2 border-black rounded-lg shadow-[2px_2px_0_0_black] flex items-center justify-center mx-auto mb-3`}>
                  <item.icon size={22} className="text-white" />
                </div>

                {/* 텍스트 */}
                <p className="text-[10px] text-slate-500 text-center">{item.desc}</p>
                <h3 className="font-black text-xs text-black text-center">{item.name}</h3>
              </motion.div>
            ))}
          </div>

          {/* 하단 안내 */}
          <motion.div variants={fadeInUp} className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-100 to-purple-100 rounded-full border border-slate-200">
              <Truck size={14} className="text-slate-600" />
              <span className="text-xs text-slate-600 font-medium">{t('programs.figure.packageShipping')}</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          결과물 미리보기
      ============================================ */}
      <section className="py-10 px-4 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-6">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-pink-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
              {t('programs.figure.resultBadge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-xl font-black text-black mb-3 break-keep">
              {t('programs.figure.resultTitle')}
            </motion.h2>
          </div>

          <motion.div variants={fadeInUp} className="bg-gradient-to-br from-cyan-50 to-purple-50 border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0_0_black]">
            {/* 완성품 이미지 */}
            <div className="flex flex-col items-center mb-5">
              <div className="relative">
                <div className="w-40 h-40 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_black] flex items-center justify-center overflow-hidden">
                  {currentImage ? (
                    <img src={currentImage} alt={t('programs.productImage')} className="w-[80%] h-[80%] object-contain" />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
                  )}
                </div>
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-cyan-400 text-black font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] text-[10px]">
                  {t('programs.figure.badge3d')}
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-black text-black mb-1">{t('programs.figure.myFigure')}</h3>
                <p className="text-xs text-slate-600">{t('programs.figure.myFigureDesc')}</p>
              </div>
            </div>

            {/* 디퓨저 사용법 */}
            <div className="bg-white border-2 border-black rounded-xl p-3 shadow-[2px_2px_0_0_black]">
              <h4 className="font-black text-sm mb-2 flex items-center gap-2">
                <Droplets size={16} className="text-blue-500" />
                {t('programs.figure.diffuserTitle')}
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 p-1.5 bg-cyan-50 rounded-lg">
                  <span className="w-5 h-5 bg-cyan-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-black flex-shrink-0">1</span>
                  <span>{t('programs.figure.diffuserStep1')}</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-cyan-50 rounded-lg">
                  <span className="w-5 h-5 bg-cyan-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-black flex-shrink-0">2</span>
                  <span>{t('programs.figure.diffuserStep2')}</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-cyan-50 rounded-lg">
                  <span className="w-5 h-5 bg-cyan-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold border border-black flex-shrink-0">3</span>
                  <span>{t('programs.figure.diffuserStep3')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
        </div>
      )}

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
              {t('programs.reviews.title')}
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
              programType="figure"
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
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-cyan-50 to-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-cyan-400 rounded-2xl flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0_0_black]">
                  <AlertTriangle size={28} className="text-black" />
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">{t('auth.guestWarningTitle')}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t('programs.figure.loginWarning')}<br />
                  <span className="font-bold text-red-500">{t('auth.notSavedBold')}</span>
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('programs.figure.loginBenefit1')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('programs.figure.loginBenefit2')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-slate-600">{t('programs.figure.loginWarningGuest')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#cbd5e1] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#cbd5e1] transition-all border-2 border-black"
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
    </main>
    </InactiveProductGuard>
  )
}
