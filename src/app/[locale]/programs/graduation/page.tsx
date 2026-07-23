"use client"

import { type CSSProperties, useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, AlertTriangle,
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
import { GraduationDesktop } from "./_desktop/GraduationDesktop"

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
  const { getOption } = useProductPricing()
  const gradOpt = getOption('graduation', '10ml')
  const gradDiscount = (gradOpt?.price && gradOpt.original_price && gradOpt.original_price > gradOpt.price)
    ? Math.round(((gradOpt.original_price - gradOpt.price) / gradOpt.original_price) * 100)
    : null
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const t = useTranslations()
  const productName = useProductDisplayName('graduation', t('products.graduation'))

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

  const { imageUrls: dynamicImages, loading: imagesLoading } = useProductImages('graduation')
  const productImages = imagesLoading ? [] : dynamicImages
  const currentImage = productImages[selectedImage] || productImages[0] || ''

  const { isCustomMode, detail } = useProductDetail('graduation')
  const { startTransition } = useTransition()
  const pageSubtitle = t('programs.graduation.subtitle')
  const pageInfoTitle = t('programs.detail.graduation.packageInfoTitle')
  const pageInfoBody = `${t('programs.graduation.compPerfume')} / ${t('programs.graduation.compKeyring')} / ${t('programs.graduation.compReport')}`
  const pageCtaLabel = t('buttons.analyzeNow')
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(detail?.custom_html, {
      badge: t('programs.graduation.limitedBadge'),
      subtitle: pageSubtitle,
      infoTitle: pageInfoTitle,
      infoBody: pageInfoBody,
      ctaLabel: pageCtaLabel,
    }),
    [detail?.custom_html, t, pageSubtitle, pageInfoTitle, pageInfoBody, pageCtaLabel],
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
      startTransition("/input?type=graduation&mode=online")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const heroSection = (
    <>
      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <UnifiedDetailHero
        productSlug="graduation"
        title={productName}
        imageAlt={productName}
        pageContent={pageContent}
        pagePositionStyle={pagePositionStyle}
        breadcrumbs={[
          { label: t('programs.breadcrumbHome'), href: '/' },
          { label: t('programs.breadcrumbPrograms'), href: '/#programs-section' },
          { label: productName },
        ]}
        images={{
          urls: productImages,
          loading: imagesLoading,
          selectedIndex: selectedImage,
          onSelect: setSelectedImage,
        }}
        badgeClassName="bg-[var(--accent-chem)] text-white"
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <ReviewTrigger
              averageRating={reviewStats?.average_rating || 4.9}
              totalCount={reviewStats?.total_count || 0}
              onClick={() => setShowReviewModal(true)}
            />
            <span className="rounded-[3px] bg-[var(--accent-chem)] px-2 py-0.5 text-[10px] lg:text-[12px] font-black text-white">
              {t('programs.graduation.deadline')}
            </span>
          </div>
        }
        price={
          <>
            <div className="mb-3 rounded-[4px] bg-[var(--accent-chem)] p-3 text-center text-sm lg:text-base font-black text-white">
              {t('programs.graduation.limitedBanner')}
            </div>
            <div className="flex items-end gap-2">
              <span className="text-xl font-black text-[var(--ink)]">{t('currency.symbol')}{formatPrice(gradOpt?.price ?? 34000)}</span>
              {gradOpt?.original_price && gradOpt.original_price > gradOpt.price && (
                <>
                  <span className="text-xs lg:text-sm text-[var(--muted-ink)] line-through">{t('currency.symbol')}{formatPrice(gradOpt.original_price)}</span>
                  {gradDiscount !== null && (
                    <span className="rounded-[3px] bg-[var(--accent-chem)] px-1.5 py-0.5 text-[10px] lg:text-[12px] font-bold text-white">{gradDiscount}% OFF</span>
                  )}
                </>
              )}
            </div>
          </>
        }
        infoIcon={<GraduationCap size={14} className="text-[var(--ink)]" />}
        infoItems={[
          t('programs.graduation.compPerfume'),
          t('programs.graduation.compKeyring'),
          t('programs.graduation.compReport'),
        ]}
        cta={{
          onClick: handleStartClick,
          disabled: loading,
          label: pageContent.ctaLabel,
          hint: t('programs.graduation.urgentText'),
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
              Feature Bar - 검은 배경
          ============================================ */}
          <section className="border-y border-[var(--line)] bg-[var(--soft)] py-6 px-4">
            <div className="w-full">
              <div className="flex flex-wrap items-center justify-center gap-4 text-[var(--ink)]">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-[var(--accent-chem)] text-white text-[10px] lg:text-[12px] font-black rounded-[3px]">
                    ~2/28
                  </span>
                  <span className="font-bold text-xs lg:text-sm">{t('programs.graduation.featureLimited')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-[var(--muted-ink)]" />
                  <span className="font-bold text-xs lg:text-sm">{t('programs.graduation.featureGraduation')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[var(--muted-ink)]" />
                  <span className="font-bold text-xs lg:text-sm">{t('programs.graduation.featureCustom')}</span>
                </div>
              </div>
            </div>
          </section>

      {/* ============================================
          진행 과정
      ============================================ */}
      <section className="py-12 px-4 bg-[var(--paper)]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-white text-[var(--ink)] text-xs lg:text-sm font-black rounded-[4px] border border-[var(--line)] mb-3">
              {t('programs.process.badge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-[var(--ink)] break-keep">
              {t('programs.process.title')}
            </motion.h2>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4 relative z-10">
              {[
                { step: "01", title: t('programs.graduation.processStep1'), desc: t('programs.graduation.processStep1Desc'), icon: FileText, color: "bg-[var(--soft)]" },
                { step: "02", title: t('programs.graduation.processStep2'), desc: t('programs.graduation.processStep2Desc'), icon: Clock, color: "bg-[var(--soft)]" },
                { step: "03", title: t('programs.graduation.processStep3'), desc: t('programs.graduation.processStep3Desc'), icon: Camera, color: "bg-[var(--soft)]" },
                { step: "04", title: t('programs.graduation.processStep4'), desc: t('programs.graduation.processStep4Desc'), icon: Gift, color: "bg-[var(--soft)]" },
              ].map((item, idx) => (
                <motion.div key={idx} variants={fadeInUp} className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 ${item.color} border border-[var(--line)] rounded-[6px] flex items-center justify-center mb-2`}>
                    <item.icon size={24} className="text-[var(--ink)]" />
                  </div>
                  <span className="text-xl font-black text-[var(--line)] mb-1">{item.step}</span>
                  <h3 className="text-sm lg:text-base font-black text-[var(--ink)] mb-0.5">{item.title}</h3>
                  <p className="text-[11px] lg:text-[13px] text-[var(--muted-ink)]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================================
          분석 결과 미리보기
      ============================================ */}
      <section className="py-12 px-4 bg-[var(--soft)] border-y border-[var(--line)]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-white text-[var(--ink)] text-xs lg:text-sm font-black rounded-[4px] border border-[var(--line)] mb-3">
              {t('programs.resultPreview.badge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-xl font-black text-[var(--ink)] mb-3 break-keep">
              {t('programs.resultPreview.title')}
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-sm lg:text-base text-[var(--muted-ink)]">
              <span className="whitespace-pre-line">{t('programs.graduation.resultPreviewDesc')}</span>
            </motion.p>
          </div>

          {/* 결과 미리보기 카드들 */}
          <motion.div variants={fadeInUp} className="space-y-4">
            {/* 향수 노트 구성 카드 */}
            <div className="bg-white rounded-[6px] p-5 border border-[var(--line)]">
              <h3 className="font-black text-[var(--ink)] mb-4 flex items-center gap-2">
                <span className="text-xl">🌸</span> {t('programs.graduation.noteStructure')}
              </h3>
              <div className="flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                    <span>🍋</span>
                  </div>
                  <div className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">{t('programs.graduation.topNote')}</div>
                  <div className="text-[10px] lg:text-[12px] text-[var(--muted-ink)]">{t('programs.graduation.topNoteDesc')}</div>
                </div>
                <ChevronRight size={16} className="text-[var(--muted-ink)]" />
                <div className="flex-1">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                    <span>🌹</span>
                  </div>
                  <div className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">{t('programs.graduation.middleNote')}</div>
                  <div className="text-[10px] lg:text-[12px] text-[var(--muted-ink)]">{t('programs.graduation.middleNoteDesc')}</div>
                </div>
                <ChevronRight size={16} className="text-[var(--muted-ink)]" />
                <div className="flex-1">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--soft)] border border-[var(--line)] flex items-center justify-center">
                    <span>🪵</span>
                  </div>
                  <div className="text-xs lg:text-sm font-bold text-[var(--muted-ink)]">{t('programs.graduation.baseNote')}</div>
                  <div className="text-[10px] lg:text-[12px] text-[var(--muted-ink)]">{t('programs.graduation.baseNoteDesc')}</div>
                </div>
              </div>
            </div>

            {/* 축하 메시지 카드 */}
            <div className="bg-white rounded-[6px] p-5 border border-[var(--line)]">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🎉</div>
                <div>
                  <h3 className="font-black text-[var(--ink)] mb-2">{t('programs.graduation.congratsTitle')}</h3>
                  <p className="text-[var(--muted-ink)] text-sm lg:text-base"><span className="whitespace-pre-line">{t('programs.graduation.congratsDesc')}</span></p>
                </div>
              </div>
            </div>

            {/* 맞춤 향수 카드 */}
            <div className="bg-white rounded-[6px] p-5 border border-[var(--line)]">
              <div className="flex items-start gap-3">
                <div className="text-3xl">💎</div>
                <div>
                  <h3 className="font-black text-[var(--ink)] mb-2">{t('programs.graduation.customRecommendation')}</h3>
                  <p className="text-[var(--muted-ink)] text-sm lg:text-base"><span className="whitespace-pre-line">{t('programs.graduation.customRecommendationDesc')}</span></p>
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
      <section id="reviews" className="border-t border-[var(--line)] bg-[var(--paper)] py-12 px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-white text-[var(--ink)] text-xs lg:text-sm font-black rounded-[4px] border border-[var(--line)] mb-3">
              {t('programs.reviews.badge')}
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-[var(--ink)] mb-2 break-keep">
              {t('programs.graduation.reviewsTitle')}
            </motion.h2>
            <motion.button
              variants={fadeInUp}
              onClick={() => setShowReviewModal(true)}
              className="text-xs lg:text-sm text-[var(--muted-ink)] hover:text-[var(--ink)] transition-colors underline underline-offset-4"
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
    </>
  )

  const mobileTree = (
    <main className="relative min-h-screen bg-[var(--canvas)] font-wanted">
      <Header />
      <ProgramAdminBridge productSlug="graduation" />

      {heroSection}

      {detailBody}

      {reviewSection}
    </main>
  )

  return (
    <InactiveProductGuard productSlug="graduation">
      <ViewportSwitch
        mobile={mobileTree}
        desktop={
          <GraduationDesktop
            title={productName}
            imageAlt={productName}
            pageContent={pageContent}
            pagePositionStyle={pagePositionStyle}
            breadcrumbs={[
              { label: t('programs.breadcrumbHome'), href: '/' },
              { label: t('programs.breadcrumbPrograms'), href: '/#programs-section' },
              { label: productName },
            ]}
            images={{
              urls: productImages,
              loading: imagesLoading,
              selectedIndex: selectedImage,
              onSelect: setSelectedImage,
            }}
            badgeClassName="bg-[var(--accent-chem)] text-white"
            meta={
              <div className="flex flex-wrap items-center gap-2">
                <ReviewTrigger
                  averageRating={reviewStats?.average_rating || 4.9}
                  totalCount={reviewStats?.total_count || 0}
                  onClick={() => setShowReviewModal(true)}
                />
                <span className="rounded-[3px] bg-[var(--accent-chem)] px-2 py-0.5 text-[10px] lg:text-[12px] font-black text-white">
                  {t('programs.graduation.deadline')}
                </span>
              </div>
            }
            price={
              <>
                <div className="mb-3 rounded-[4px] bg-[var(--accent-chem)] p-3 text-center text-sm lg:text-base font-black text-white">
                  {t('programs.graduation.limitedBanner')}
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-xl font-black text-[var(--ink)]">{t('currency.symbol')}{formatPrice(gradOpt?.price ?? 34000)}</span>
                  {gradOpt?.original_price && gradOpt.original_price > gradOpt.price && (
                    <>
                      <span className="text-xs lg:text-sm text-[var(--muted-ink)] line-through">{t('currency.symbol')}{formatPrice(gradOpt.original_price)}</span>
                      {gradDiscount !== null && (
                        <span className="rounded-[3px] bg-[var(--accent-chem)] px-1.5 py-0.5 text-[10px] lg:text-[12px] font-bold text-white">{gradDiscount}% OFF</span>
                      )}
                    </>
                  )}
                </div>
              </>
            }
            infoIcon={<GraduationCap size={14} className="text-[var(--ink)]" />}
            infoItems={[
              t('programs.graduation.compPerfume'),
              t('programs.graduation.compKeyring'),
              t('programs.graduation.compReport'),
            ]}
            cta={{
              onClick: handleStartClick,
              disabled: loading,
              label: pageContent.ctaLabel,
              hint: t('programs.graduation.urgentText'),
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
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-[6px] shadow-sm overflow-hidden border border-[var(--line)]"
            >
              <div className="relative p-6 pb-4 text-center">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--soft)] transition-colors"
                >
                  <X size={20} className="text-[var(--muted-ink)]" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--soft)] rounded-[6px] flex items-center justify-center border border-[var(--line)]">
                  <AlertTriangle size={28} className="text-[var(--ink)]" />
                </div>

                <h2 className="text-xl font-black text-[var(--ink)] mb-2">{t('auth.guestWarningTitle')}</h2>
                <p className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed">
                  {t('auth.guestWarningText')}
                </p>
              </div>

              <div className="px-6 py-4 bg-[var(--soft)] border-y border-[var(--line-soft)]">
                <div className="space-y-2 text-sm lg:text-base">
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--muted-ink)] font-bold">✓</span>
                    <span className="text-[var(--muted-ink)]">{t('auth.guestBenefit1')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--muted-ink)] font-bold">✓</span>
                    <span className="text-[var(--muted-ink)]">{t('auth.guestBenefit2')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--muted-ink)] font-bold">!</span>
                    <span className="text-[var(--muted-ink)]">{t('auth.guestWarning')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-[var(--ink)] text-white rounded-[5px] font-bold text-lg transition-all hover:bg-black"
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
        redirectPath="/input?type=graduation&mode=online"
      />

      {/* 리뷰 모달 */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        programType="graduation"
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
        programType="graduation"
        programName={productName}
        userId={currentUserId || ''}
        onSuccess={() => {
          // 리뷰 통계 새로고침
          getReviewStats('graduation').then(setReviewStats)
        }}
      />
    </InactiveProductGuard>
  )
}
