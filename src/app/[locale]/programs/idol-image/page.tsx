"use client"

import { type CSSProperties, useState, useEffect, useMemo } from "react"
import { Star } from "lucide-react"
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
import { UnifiedDetailHero, type DetailHeroImageMeta } from "@/components/products/UnifiedDetailHero"
import { DesktopDetailHero } from "@/components/desktop/DesktopDetailHero"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"
import { useProductDisplayName } from '@/hooks/useAdminContent'
import { useCuratedGallery } from '@/hooks/useCuratedGallery'
import { extractProductPageContentWithFallback, type ProductPagePositionField } from "@/lib/products/page-content"
import { FeatureStrip } from "@/components/public/FeatureStrip"
import { SectionHeading } from "@/components/public/SectionHeading"
import { ProcessSteps } from "@/components/public/ProcessSteps"
import { EvidenceMediaGrid } from "@/components/public/EvidenceMediaGrid"
import { MediaCopySection } from "@/components/public/MediaCopySection"
import { SizeComparison } from "@/components/public/SizeComparison"
import { DeliveryPackageSection } from "@/components/public/DeliveryPackageSection"
import { FAQSection } from "@/components/public/FAQSection"
import { ClosingCta } from "@/components/public/ClosingCta"

export default function IdolImagePage() {
  const { user, unifiedUser, loading } = useAuth()
  const { getOption } = useProductPricing()
  const idolOpt10 = getOption('image_analysis', '10ml')
  const idolOpt50 = getOption('image_analysis', '50ml')
  const idolDiscount = (idolOpt10?.price && idolOpt10.original_price && idolOpt10.original_price > idolOpt10.price)
    ? Math.round(((idolOpt10.original_price - idolOpt10.price) / idolOpt10.original_price) * 100)
    : null
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const t = useTranslations()
  const te = useTranslations('editorialDetail')
  const tg = useTranslations('detailGallery')
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

  // 큐레이션 갤러리 — 승인 이미지 우선, 관리자 이미지는 중복 제거 후 뒤에
  const gallery = useCuratedGallery('idol-image')
  const galleryMeta: DetailHeroImageMeta[] = gallery.images.map((image) =>
    image.curated
      ? {
          caption: tg(`${image.curated.id}.caption`),
        }
      : {},
  )

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

  const price10 = idolOpt10?.price ?? 24000
  const price50 = idolOpt50?.price ?? 48000

  const heroProps = {
    productSlug: "idol-image",
    title: productName,
    imageAlt: t('programs.productImage'),
    pageContent,
    pagePositionStyle,
    breadcrumbs: [
      { label: t('programs.breadcrumbHome'), href: '/' },
      { label: t('programs.breadcrumbPrograms'), href: '/#programs-section' },
      { label: productName },
    ],
    images: gallery.controlled,
    imageMeta: galleryMeta,
    badgeClassName: "bg-[var(--accent-ai)] text-[#171717]",
    secondaryBadges: (
      <span className="text-xs font-bold text-[var(--muted-ink)]">{te('idol.eyebrowNote')}</span>
    ),
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
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-black leading-none text-[var(--ink)] lg:text-[29px]">
          {t('currency.symbol')}{formatPrice(price10)}
        </span>
        <span className="text-[13px] text-[var(--muted-ink)]">{te('common.priceFrom')}</span>
        {idolOpt10?.original_price && idolOpt10.original_price > idolOpt10.price && (
          <>
            <span className="text-xs text-[var(--muted-ink)] line-through">
              {t('currency.symbol')}{formatPrice(idolOpt10.original_price)}
            </span>
            {idolDiscount !== null && (
              <span className="rounded-[3px] bg-[var(--accent-chem)] px-1.5 py-0.5 text-[10px] font-black text-white">
                {idolDiscount}% OFF
              </span>
            )}
          </>
        )}
      </div>
    ),
    infoIcon: <Star size={14} className="fill-[var(--ink)] text-[var(--ink)]" />,
    // 프로그램은 분석 후 구매 흐름 — 용량은 결과 확인 뒤 선택하므로 정보성 표로만 안내
    panelExtra: (
      <SizeComparison
        headers={[te('common.sizeHeaderOption'), te('idol.sizeHeaderNote'), te('common.sizeHeaderPrice')]}
        rows={[
          { option: '10ml', note: te('idol.sizeTenNote'), price: `${t('currency.symbol')}${formatPrice(price10)}` },
          { option: '50ml', note: te('idol.sizeFiftyNote'), price: `${t('currency.symbol')}${formatPrice(price50)}` },
        ]}
        className="mt-5 border-t border-[var(--line)] [&>div:first-child]:min-h-0"
      />
    ),
    cta: {
      onClick: handleStartClick,
      disabled: loading,
      label: pageContent.ctaLabel,
      hint: te('idol.ctaHint'),
    },
  }

  const evidence = {
    tenPouch: {
      src: '/images/product-detail/ai-10ml-pouch-bright.png',
      alt: tg('aiTenPouch.alt'),
      caption: te('idol.reportEvidence1'),
    },
    fiftyFullSet: {
      src: '/images/product-detail/ai-50ml-full-set-8056-square.png',
      alt: tg('aiFiftyFullSet.alt'),
      caption: te('idol.reportEvidence2'),
    },
    outerBox: {
      src: '/images/product-detail/shipping-outer-box-square.png',
      alt: tg('shippingOuterBox.alt'),
      caption: te('common.outerBoxCaption'),
    },
    whiteOpen: {
      src: '/images/product-detail/shipping-white-open-square.png',
      alt: tg('shippingWhiteOpen.alt'),
      caption: te('common.innerBoxCaption'),
    },
  }

  const detailBody = (
    <>
      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <div data-admin-editable="detail_html">
          {/* 핵심 특징 스트립 — 다크 대비 밴드 */}
          <FeatureStrip
            items={[te('idol.feature1'), te('idol.feature2'), te('idol.feature3')]}
          />

          {/* 소개 + 진행 과정 */}
          <section className="bg-[var(--paper)] px-5 py-16 lg:px-6 lg:py-28">
            <SectionHeading
              kicker={te('idol.introKicker')}
              title={<span className="whitespace-pre-line">{te('idol.introTitle')}</span>}
              lead={<span className="whitespace-pre-line">{te('idol.introLead')}</span>}
            />
            <ProcessSteps
              steps={[
                { title: te('idol.step1Title'), description: te('idol.step1Desc') },
                { title: te('idol.step2Title'), description: te('idol.step2Desc') },
                { title: te('idol.step3Title'), description: te('idol.step3Desc') },
                { title: te('idol.step4Title'), description: te('idol.step4Desc') },
              ]}
            />
          </section>

          {/* 인쇄 리포트 — 연회색 밴드 */}
          <section className="border-y border-[var(--line)] bg-[#F1F1EC] px-5 py-16 lg:px-6 lg:py-28">
            <MediaCopySection
              media={<EvidenceMediaGrid items={[evidence.tenPouch, evidence.fiftyFullSet]} />}
              kicker={te('idol.reportKicker')}
              title={<span className="whitespace-pre-line">{te('idol.reportTitle')}</span>}
              lead={te('idol.reportLead')}
              detailList={[
                { term: te('idol.reportItem1Term'), description: te('idol.reportItem1Desc') },
                { term: te('idol.reportItem2Term'), description: te('idol.reportItem2Desc') },
                { term: te('idol.reportItem3Term'), description: te('idol.reportItem3Desc') },
              ]}
            />
          </section>

          {/* 분석 결과 미리보기 — 기존 기능 유지 */}
          <section className="bg-[var(--paper)] px-5 py-16 lg:px-6 lg:py-24">
            <SectionHeading
              kicker={t('programs.resultPreview.badge')}
              title={t('programs.resultPreview.title')}
              lead={<span className="whitespace-pre-line">{t('programs.resultPreview.description')}</span>}
            />
            <div className="mx-auto w-full max-w-[860px]">
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
              <p className="mt-3 text-center text-xs text-[var(--muted-ink)]">
                {t('programs.previewCaption')}
              </p>
            </div>
          </section>

          {/* 용량 비교 */}
          <section className="border-t border-[var(--line)] bg-[var(--paper)] px-5 py-16 lg:px-6 lg:py-28">
            <SectionHeading
              kicker={te('idol.sizeKicker')}
              title={<span className="whitespace-pre-line">{te('idol.sizeTitle')}</span>}
              lead={te('idol.sizeLead')}
            />
            <div className="mx-auto w-full max-w-[720px]">
              <SizeComparison
                headers={[te('common.sizeHeaderOption'), te('idol.sizeHeaderNote'), te('common.sizeHeaderPrice')]}
                rows={[
                  { option: '10ml', note: te('idol.sizeTenNote'), price: `${t('currency.symbol')}${formatPrice(price10)}` },
                  { option: '50ml', note: te('idol.sizeFiftyNote'), price: `${t('currency.symbol')}${formatPrice(price50)}` },
                ]}
              />
            </div>
          </section>

          {/* 배송 안내 — 다크 밴드 */}
          <DeliveryPackageSection
            media={[evidence.outerBox, evidence.whiteOpen]}
            kicker={te('common.deliveryKicker')}
            title={<span className="whitespace-pre-line">{te('idol.deliveryTitle')}</span>}
            lead={te('idol.deliveryLead')}
            packageList={[
              { title: te('idol.package1Title'), description: te('idol.package1Desc') },
              { title: te('idol.package2Title'), description: te('idol.package2Desc') },
              { title: te('idol.package3Title'), description: te('idol.package3Desc') },
            ]}
            deliveryFlow={[
              { title: te('idol.flow1Title'), description: te('idol.flow1Desc') },
              { title: te('idol.flow2Title'), description: te('idol.flow2Desc') },
              { title: te('idol.flow3Title'), description: te('idol.flow3Desc') },
              { title: te('idol.flow4Title'), description: te('idol.flow4Desc') },
            ]}
          />

          {/* FAQ */}
          <FAQSection
            kicker={te('common.faqKicker')}
            title={te('common.faqTitle')}
            items={[
              { question: te('idol.faq1Q'), answer: te('idol.faq1A') },
              { question: te('idol.faq2Q'), answer: te('idol.faq2A') },
              { question: te('idol.faq3Q'), answer: te('idol.faq3A') },
              { question: te('common.faqShippingQ'), answer: te('common.faqShippingA') },
            ]}
          />
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

  const closingCta = (
    <ClosingCta
      kicker={te('idol.closingKicker')}
      title={<span className="whitespace-pre-line">{te('idol.closingTitle')}</span>}
      buttonLabel={te('idol.closingButton')}
      onClick={handleStartClick}
      disabled={loading}
    />
  )

  return (
    <InactiveProductGuard productSlug="idol-image">
    <ViewportSwitch
      mobile={
        <main className="accent-ai relative min-h-screen bg-[var(--canvas)]">
          <Header />
          <ProgramAdminBridge productSlug="idol-image" />
          <UnifiedDetailHero {...heroProps} />
          {detailBody}
          {reviewSection}
          {!isCustomMode && closingCta}
        </main>
      }
      desktop={
        <main className="accent-ai relative min-h-screen bg-[var(--canvas)]">
          <DesktopDetailHero {...heroProps} />
          {detailBody}
          <div className="mx-auto w-full max-w-[1240px]">{reviewSection}</div>
          {!isCustomMode && closingCta}
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
