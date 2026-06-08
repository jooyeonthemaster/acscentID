"use client"

import { type CSSProperties, useState, useEffect, useMemo } from "react"
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  Star, X,
  ShoppingCart,
  Sparkles, Heart, Package
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { ReviewModal, ReviewTrigger, ReviewWriteModal, ReviewStats, ReviewList } from "@/components/review"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
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

export default function LeQuackPage() {
  const t = useTranslations()
  const { getOption } = useProductPricing()
  const sigOpt = getOption('signature', '10ml')
  const sigDiscount = (sigOpt?.price && sigOpt.original_price && sigOpt.original_price > sigOpt.price)
    ? Math.round(((sigOpt.original_price - sigOpt.price) / sigOpt.original_price) * 100)
    : null

  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const productName = useProductDisplayName('le-quack', t('programs.detail.leQuack.productNameFallback'))

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
        const stats = await getReviewStats('le-quack')
        setReviewStats(stats)
      } catch (error) {
        console.error('Failed to load review stats:', error)
      }
    }
    loadReviewStats()
  }, [])

  const { imageUrls: dynamicImages, loading: imagesLoading } = useProductImages('le-quack')
  const productImages = imagesLoading ? [] : dynamicImages
  const currentImage = productImages[selectedImage] || productImages[0] || ''

  const { isCustomMode, detail } = useProductDetail('le-quack')
  const pageSubtitle = t('programs.detail.leQuack.heroSubtitle')
  const pageInfoTitle = t('programs.detail.leQuack.heroInfoTitle')
  const pageInfoBody = t('programs.detail.leQuack.heroInfoBody')
  const pageCtaLabel = t('programs.detail.leQuack.ctaLabel')
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(detail?.custom_html, {
      badge: 'SIGNATURE',
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

  // 바로 구매하기 - 주문 폼으로 이동
  const handlePurchaseClick = () => {
    if (loading) return
    if (isLoggedIn) {
      // 로그인 상태면 바로 주문 폼으로 이동
      router.push("/checkout?product=le-quack&type=signature")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleGuestPurchase = () => {
    // 비회원도 구매 가능
    router.push("/checkout?product=le-quack&type=signature&guest=true")
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  return (
    <InactiveProductGuard productSlug="le-quack">
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
      <Header />
      <ProgramAdminBridge productSlug="le-quack" />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <UnifiedDetailHero
        productSlug="le-quack"
        title={productName}
        imageAlt={productName}
        pageContent={pageContent}
        pagePositionStyle={pagePositionStyle}
        breadcrumbs={[
          { label: t('programs.breadcrumbHome'), href: "/" },
          { label: t('programs.detail.leQuack.breadcrumbSignature'), href: "/" },
          { label: productName },
        ]}
        images={{
          urls: productImages,
          loading: imagesLoading,
          selectedIndex: selectedImage,
          onSelect: setSelectedImage,
        }}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <ReviewTrigger
              averageRating={reviewStats?.average_rating || 4.9}
              totalCount={reviewStats?.total_count || 0}
              onClick={() => setShowReviewModal(true)}
            />
            <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-black text-white">
              SIGNATURE
            </span>
          </div>
        }
        price={
          <>
            <div className="mb-3 rounded-xl border-2 border-black bg-black p-3 text-center text-sm font-black text-white shadow-[2px_2px_0_0_#cbd5e1]">
              {t('programs.detail.leQuack.signaturePerfumeLabel')}
            </div>
            <div className="flex items-end gap-2">
              <span className="text-xl font-black text-black">{t('currency.symbol')}{formatPrice(sigOpt?.price ?? 34000)}</span>
              {sigOpt?.original_price && sigOpt.original_price > sigOpt.price && (
                <>
                  <span className="text-xs text-slate-400 line-through">{t('currency.symbol')}{formatPrice(sigOpt.original_price)}</span>
                  {sigDiscount !== null && (
                    <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">{sigDiscount}% OFF</span>
                  )}
                </>
              )}
            </div>
          </>
        }
        infoIcon={<Star size={14} className="fill-slate-900 text-slate-900" />}
        infoItems={[
          t('programs.detail.leQuack.infoDelivery'),
          t('programs.detail.leQuack.infoKeyringIncluded'),
          t('programs.detail.leQuack.infoPremiumPackage'),
          t('programs.detail.leQuack.infoFreeShipping'),
        ]}
        cta={{
          onClick: handlePurchaseClick,
          disabled: loading,
          label: pageContent.ctaLabel,
          hint: t('programs.detail.leQuack.ctaHint'),
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
                  <span className="text-lg">🦆</span>
                  <span className="font-bold text-xs">{t('programs.detail.leQuack.featureKeyring')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" />
                  <span className="font-bold text-xs">{t('programs.detail.leQuack.featureSignatureScent')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Package size={14} className="text-amber-400" />
                  <span className="font-bold text-xs">{t('programs.detail.leQuack.featureFastDelivery')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart size={14} className="text-amber-400" />
                  <span className="font-bold text-xs">{t('programs.detail.leQuack.featureGiftRecommend')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ============================================
              제품 특징
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
                <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-amber-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
                  ✨ FEATURES
                </motion.div>
                <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black break-keep">
                  {t('programs.detail.leQuack.featuresHeadingLine1')}
                  <br />
                  {t('programs.detail.leQuack.featuresHeadingLine2')}
                </motion.h2>
              </div>

              <div className="space-y-4">
                {/* 퍼퓸키링 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🦆</div>
                    <div>
                      <h3 className="font-black text-slate-900 mb-2">{t('programs.detail.leQuack.cardKeyringTitle')}</h3>
                      <p className="text-slate-600 text-sm">{t('programs.detail.leQuack.cardKeyringBodyLine1')}<br />{t('programs.detail.leQuack.cardKeyringBodyLine2')}</p>
                    </div>
                  </div>
                </motion.div>

                {/* 시그니처 향 */}
                <motion.div variants={fadeInUp} className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">✨</div>
                    <div>
                      <h3 className="font-black text-slate-900 mb-2">{t('programs.detail.leQuack.cardScentTitle')}</h3>
                      <p className="text-slate-600 text-sm">{t('programs.detail.leQuack.cardScentBodyLine1')}<br />{t('programs.detail.leQuack.cardScentBodyLine2')}</p>
                    </div>
                  </div>
                </motion.div>

                {/* 선물용 */}
                <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">🎁</div>
                    <div>
                      <h3 className="font-black text-slate-900 mb-2">{t('programs.detail.leQuack.cardGiftTitle')}</h3>
                      <p className="text-slate-600 text-sm">{t('programs.detail.leQuack.cardGiftBodyLine1')}<br />{t('programs.detail.leQuack.cardGiftBodyLine2')}</p>
                    </div>
                  </div>
                </motion.div>

              </div>
            </motion.div>
          </section>
        </div>
      )}

      {/* ============================================
          실제 후기
      ============================================ */}
      <section id="reviews" className="py-12 px-4 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-yellow-400 text-black text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
              💬 REAL REVIEWS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black mb-2 break-keep">
              {t('programs.detail.leQuack.reviewsHeading')}
            </motion.h2>
            <motion.button
              variants={fadeInUp}
              onClick={() => setShowReviewModal(true)}
              className="text-xs text-slate-500 hover:text-black transition-colors underline underline-offset-4"
            >
              {t('programs.detail.leQuack.viewAllReviews')}
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
              programType="le-quack"
              currentUserId={currentUserId}
              ratingFilter={reviewRatingFilter}
              onRatingFilterChange={setReviewRatingFilter}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================
          하단 고정 구매 버튼
      ============================================ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-black p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-[455px] mx-auto">
          <button
            onClick={handlePurchaseClick}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-black py-3 text-base font-black text-white shadow-[3px_3px_0_0_#cbd5e1] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#cbd5e1] disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            {t('programs.detail.leQuack.ctaLabel')}
          </button>
        </div>
      </div>

      {/* 하단 여백 (고정 버튼 공간) */}
      <div className="h-24" />

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
                  <span className="text-3xl">🦆</span>
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">{t('programs.detail.leQuack.loginModalTitle')}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t('programs.detail.leQuack.loginModalDescPrefix')}<br />
                  <span className="font-bold text-amber-600">{t('programs.detail.leQuack.loginModalDescHighlight')}</span>{t('programs.detail.leQuack.loginModalDescSuffix')}
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('programs.detail.leQuack.loginBenefitSaveOrders')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('programs.detail.leQuack.loginBenefitTrackDelivery')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-slate-600">{t('programs.detail.leQuack.loginBenefitGuestAllowed')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#cbd5e1] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#cbd5e1] transition-all border-2 border-black"
                >
                  {t('programs.detail.leQuack.loginSignupButton')}
                </button>

                <button
                  onClick={handleGuestPurchase}
                  className="w-full h-12 bg-white text-slate-600 rounded-2xl font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                >
                  <span>{t('programs.detail.leQuack.guestPurchaseButton')}</span>
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
        redirectPath="/checkout?product=le-quack&type=signature"
      />

      {/* 리뷰 모달 */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        programType="le-quack"
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
        programType="le-quack"
        programName={productName}
        userId={currentUserId || ''}
        onSuccess={() => {
          // 리뷰 통계 새로고침
          getReviewStats('le-quack').then(setReviewStats)
        }}
      />
    </main>
    </InactiveProductGuard>
  )
}
