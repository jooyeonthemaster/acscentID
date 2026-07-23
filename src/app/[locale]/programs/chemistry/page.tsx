"use client"

import { type CSSProperties, useState, useEffect, useMemo } from "react"
import { FlaskConical } from "lucide-react"
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
import { UnifiedDetailHero, type DetailHeroImageMeta } from "@/components/products/UnifiedDetailHero"
import { DesktopDetailHero } from "@/components/desktop/DesktopDetailHero"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice, isScentPaperSize } from "@/types/cart"
import { useProductDisplayName } from '@/hooks/useAdminContent'
import { useCuratedGallery } from '@/hooks/useCuratedGallery'
import { extractProductPageContentWithFallback, type ProductPagePositionField } from "@/lib/products/page-content"
import { cn } from "@/lib/utils"
import { FeatureStrip } from "@/components/public/FeatureStrip"
import { SectionHeading } from "@/components/public/SectionHeading"
import { ProcessSteps } from "@/components/public/ProcessSteps"
import { EvidenceMediaGrid } from "@/components/public/EvidenceMediaGrid"
import { MediaCopySection } from "@/components/public/MediaCopySection"
import { SizeComparison } from "@/components/public/SizeComparison"
import { DeliveryPackageSection } from "@/components/public/DeliveryPackageSection"
import { FAQSection } from "@/components/public/FAQSection"
import { ClosingCta } from "@/components/public/ClosingCta"

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
  const te = useTranslations('editorialDetail')
  const tg = useTranslations('detailGallery')
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

  // 큐레이션 갤러리 — 승인 이미지 우선, 관리자 이미지는 중복 제거 후 뒤에
  const gallery = useCuratedGallery('chemistry')
  const galleryMeta: DetailHeroImageMeta[] = gallery.images.map((image) =>
    image.curated
      ? {
          caption: tg(`${image.curated.id}.caption`),
        }
      : {},
  )

  const startAnalysis = (target?: 'idol' | 'self') => {
    if (loading) return
    if (isLoggedIn) {
      startTransition(`/input?type=chemistry&mode=online${target ? `&target=${target}` : ''}`)
    } else {
      setShowLoginPrompt(true)
    }
  }
  const handleStartClick = () => startAnalysis()

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const priceSet10 = chemSet10?.price ?? 44000
  const priceSet50 = chemSet50?.price ?? 88000

  const heroProps = {
    productSlug: "chemistry",
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
    badgeClassName: "bg-[var(--accent-chem)] text-white",
    secondaryBadges: (
      <span className="text-xs font-bold text-[var(--muted-ink)]">{te('chemistry.eyebrowNote')}</span>
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
          {t('currency.symbol')}{formatPrice(chemMin ?? 44000)}
        </span>
        <span className="text-[13px] text-[var(--muted-ink)]">{te('common.priceFromSet')}</span>
      </div>
    ),
    infoIcon: <FlaskConical size={14} className="text-[var(--ink)]" />,
    // 프로그램은 분석 후 구매 흐름 — 세트 용량은 결과 확인 뒤 선택하므로 정보성 표로만 안내
    panelExtra: (
      <SizeComparison
        headers={[te('common.sizeHeaderOption'), te('chemistry.sizeHeaderNote'), te('common.sizeHeaderPrice')]}
        rows={[
          { option: '10ml × 2', note: te('chemistry.sizeTenNote'), price: `${t('currency.symbol')}${formatPrice(priceSet10)}` },
          { option: '50ml × 2', note: te('chemistry.sizeFiftyNote'), price: `${t('currency.symbol')}${formatPrice(priceSet50)}` },
        ]}
        className="mt-5 border-t border-[var(--line)] [&>div:first-child]:min-h-0"
      />
    ),
    cta: {
      onClick: handleStartClick,
      disabled: loading,
      label: pageContent.ctaLabel,
      hint: te('chemistry.ctaHint'),
    },
  }

  const evidence = {
    reportPackage: {
      src: '/images/product-detail/chemistry-report-package-square.png',
      alt: tg('chemReportPackage.alt'),
      caption: te('chemistry.reportEvidence1'),
    },
    tenSet: {
      src: '/images/product-detail/chemistry-10ml-set-square.png',
      alt: tg('chemTenSet.alt'),
      caption: te('chemistry.sizeEvidence1'),
    },
    fiftySet: {
      src: '/images/product-detail/chemistry-50ml-set-square.png',
      alt: tg('chemFiftySet.alt'),
      caption: te('chemistry.sizeEvidence2'),
    },
    outerBox: {
      src: '/images/product-detail/shipping-outer-box-square.png',
      alt: tg('shippingOuterBox.alt'),
      caption: te('common.outerBoxCaption'),
    },
    whiteOpen: {
      src: '/images/product-detail/shipping-white-open-square.png',
      alt: tg('shippingWhiteOpen.alt'),
      caption: te('chemistry.innerBoxCaption'),
    },
  }

  const usageCards = [
    { tag: 'A', title: te('chemistry.usageATitle'), description: te('chemistry.usageADesc'), cardClass: 'bg-[#EDF3F9]', tagClass: 'text-[#426B98]' },
    { tag: 'B', title: te('chemistry.usageBTitle'), description: te('chemistry.usageBDesc'), cardClass: 'bg-[var(--accent-chem-soft)]', tagClass: 'text-[var(--accent-chem-deep)]' },
    { tag: 'A+B', title: te('chemistry.usageMixTitle'), description: te('chemistry.usageMixDesc'), cardClass: 'bg-[#EEF4E9]', tagClass: 'text-[#557744]' },
  ]

  const chemistryTypes = [
    { title: te('chemistry.chemType1Title'), description: te('chemistry.chemType1Desc') },
    { title: te('chemistry.chemType2Title'), description: te('chemistry.chemType2Desc') },
    { title: te('chemistry.chemType3Title'), description: te('chemistry.chemType3Desc') },
    { title: te('chemistry.chemType4Title'), description: te('chemistry.chemType4Desc') },
  ]

  const relationships = [
    { tag: te('chemistry.relation1Tag'), title: te('chemistry.relation1Title'), description: te('chemistry.relation1Desc'), cardClass: 'bg-[#F4F5F1]', target: 'self' as const },
    { tag: te('chemistry.relation2Tag'), title: te('chemistry.relation2Title'), description: te('chemistry.relation2Desc'), cardClass: 'bg-[#EDF3F7]', target: 'idol' as const },
    { tag: te('chemistry.relation3Tag'), title: te('chemistry.relation3Title'), description: te('chemistry.relation3Desc'), cardClass: 'bg-[var(--accent-chem-soft)]', target: 'idol' as const },
  ]

  const detailBody = (
    <>
      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <div data-admin-editable="detail_html">
          {/* 핵심 특징 스트립 — 다크 대비 밴드 */}
          <FeatureStrip
            items={[te('chemistry.feature1'), te('chemistry.feature2'), te('chemistry.feature3')]}
          />

          {/* 소개 + A/B/레이어링 사용법 + 진행 과정 */}
          <section className="bg-[var(--paper)] px-5 py-16 lg:px-6 lg:py-28">
            <SectionHeading
              kicker={te('chemistry.introKicker')}
              title={<span className="whitespace-pre-line">{te('chemistry.introTitle')}</span>}
              lead={te('chemistry.introLead')}
            />
            <div className="mx-auto mb-12 grid w-full max-w-[1080px] grid-cols-1 gap-3 lg:mb-16 lg:grid-cols-3">
              {usageCards.map((card, index) => (
                <div
                  key={index}
                  className={cn('rounded-[6px] border border-[#191918]/15 p-5 lg:min-h-[150px] lg:p-6', card.cardClass)}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('inline-grid h-[34px] min-w-[40px] shrink-0 place-items-center rounded-[3px] border border-current px-2 text-[13px] font-black', card.tagClass)}>
                      {card.tag}
                    </span>
                    <h3 className="break-keep text-[17px] font-black text-[var(--ink)] lg:text-[19px]">{card.title}</h3>
                  </div>
                  <p className="mt-3 break-keep text-[13px] leading-[1.65] text-[var(--muted-ink)]">{card.description}</p>
                </div>
              ))}
            </div>
            <ProcessSteps
              steps={[
                { title: te('chemistry.step1Title'), description: te('chemistry.step1Desc') },
                { title: te('chemistry.step2Title'), description: te('chemistry.step2Desc') },
                { title: te('chemistry.step3Title'), description: te('chemistry.step3Desc') },
                { title: te('chemistry.step4Title'), description: te('chemistry.step4Desc') },
              ]}
            />
          </section>

          {/* 케미 리포트 — 연회색 밴드 */}
          <section className="border-y border-[var(--line)] bg-[#F1F1EC] px-5 py-16 lg:px-6 lg:py-28">
            <MediaCopySection
              media={<EvidenceMediaGrid items={[evidence.reportPackage]} />}
              kicker={te('chemistry.reportKicker')}
              title={<span className="whitespace-pre-line">{te('chemistry.reportTitle')}</span>}
              lead={te('chemistry.reportLead')}
              detailList={[
                { term: te('chemistry.reportItem1Term'), description: te('chemistry.reportItem1Desc') },
                { term: te('chemistry.reportItem2Term'), description: te('chemistry.reportItem2Desc') },
                { term: te('chemistry.reportItem3Term'), description: te('chemistry.reportItem3Desc') },
              ]}
            />
            <div
              className="mx-auto mt-12 grid w-full max-w-[1080px] grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4"
              aria-label={te('chemistry.chemTypesLabel')}
            >
              {chemistryTypes.map((type, index) => (
                <div key={index} className="rounded-[5px] border border-[#CFD0CA] bg-white/60 p-4 lg:min-h-[112px] lg:p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="shrink-0 text-[11px] font-black text-[var(--accent-chem-deep)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <strong className="text-[15px] font-black text-[var(--ink)]">{type.title}</strong>
                  </div>
                  <p className="mt-1.5 break-keep text-[11px] leading-[1.55] text-[var(--muted-ink)]">{type.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 세트 용량 비교 */}
          <section className="bg-[var(--paper)] px-5 py-16 lg:px-6 lg:py-28">
            <MediaCopySection
              reverse
              media={<EvidenceMediaGrid items={[evidence.tenSet, evidence.fiftySet]} />}
              kicker={te('chemistry.sizeKicker')}
              title={<span className="whitespace-pre-line">{te('chemistry.sizeTitle')}</span>}
              lead={te('chemistry.sizeLead')}
            >
              <SizeComparison
                headers={[te('common.sizeHeaderOption'), te('chemistry.sizeHeaderNote'), te('common.sizeHeaderPrice')]}
                rows={[
                  { option: '10ml × 2', note: te('chemistry.sizeTenNote'), price: `${t('currency.symbol')}${formatPrice(priceSet10)}` },
                  { option: '50ml × 2', note: te('chemistry.sizeFiftyNote'), price: `${t('currency.symbol')}${formatPrice(priceSet50)}` },
                ]}
              />
            </MediaCopySection>
          </section>

          {/* 배송 안내 — 다크 밴드 */}
          <DeliveryPackageSection
            media={[evidence.outerBox, evidence.whiteOpen]}
            kicker={te('common.deliveryKicker')}
            title={<span className="whitespace-pre-line">{te('chemistry.deliveryTitle')}</span>}
            lead={te('chemistry.deliveryLead')}
            packageList={[
              { title: te('chemistry.package1Title'), description: te('chemistry.package1Desc') },
              { title: te('chemistry.package2Title'), description: te('chemistry.package2Desc') },
              { title: te('chemistry.package3Title'), description: te('chemistry.package3Desc') },
            ]}
            deliveryFlow={[
              { title: te('chemistry.flow1Title'), description: te('chemistry.flow1Desc') },
              { title: te('chemistry.flow2Title'), description: te('chemistry.flow2Desc') },
              { title: te('chemistry.flow3Title'), description: te('chemistry.flow3Desc') },
              { title: te('chemistry.flow4Title'), description: te('chemistry.flow4Desc') },
            ]}
          />

          {/* 관계 유형 */}
          <section className="bg-[var(--paper)] px-5 py-16 lg:px-6 lg:py-28">
            <SectionHeading
              kicker={te('chemistry.relationKicker')}
              title={<span className="whitespace-pre-line">{te('chemistry.relationTitle')}</span>}
              lead={te('chemistry.relationLead')}
            />
            <div className="mx-auto grid w-full max-w-[1080px] grid-cols-1 gap-3 lg:grid-cols-3">
              {relationships.map((relation, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => startAnalysis(relation.target)}
                  disabled={loading}
                  className={cn(
                    'group min-h-[150px] rounded-[6px] border border-[var(--line)] p-6 text-left transition-colors hover:border-[var(--ink)] lg:min-h-[180px]',
                    relation.cardClass,
                  )}
                >
                  <span className="text-[10px] font-black text-[var(--accent-chem-deep)]">{relation.tag}</span>
                  <strong className="mt-5 block break-keep text-[17px] font-black text-[var(--ink)] lg:mt-7 lg:text-lg">{relation.title}</strong>
                  <p className="mt-2 break-keep text-[13px] leading-[1.65] text-[var(--muted-ink)]">{relation.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-black text-[var(--ink)] underline underline-offset-4 group-hover:no-underline">
                    {te('chemistry.relationStartCta')}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <FAQSection
            kicker={te('common.faqKicker')}
            title={te('common.faqTitle')}
            items={[
              { question: te('chemistry.faq1Q'), answer: te('chemistry.faq1A') },
              { question: te('chemistry.faq2Q'), answer: te('chemistry.faq2A') },
              { question: te('chemistry.faq3Q'), answer: te('chemistry.faq3A') },
              { question: te('common.faqShippingQ'), answer: te('common.faqShippingA') },
            ]}
          />
        </div>
      )}
    </>
  )

  const reviewSection = (
    <ProgramReviewSection
      programType="chemistry_set"
      programName={productName}
      currentUserId={currentUserId}
      isLoggedIn={isLoggedIn}
      onLoginRequired={() => setShowLoginPrompt(true)}
    />
  )

  const closingCta = (
    <ClosingCta
      kicker={te('chemistry.closingKicker')}
      title={<span className="whitespace-pre-line">{te('chemistry.closingTitle')}</span>}
      buttonLabel={te('chemistry.closingButton')}
      onClick={handleStartClick}
      disabled={loading}
    />
  )

  return (
    <InactiveProductGuard productSlug="chemistry">
    <ViewportSwitch
      mobile={
        <main className="accent-chem relative min-h-screen bg-[var(--canvas)]">
          <Header />
          <ProgramAdminBridge productSlug="chemistry" />
          <UnifiedDetailHero {...heroProps} />
          {detailBody}
          {reviewSection}
          {!isCustomMode && closingCta}
        </main>
      }
      desktop={
        <main className="accent-chem relative min-h-screen bg-[var(--canvas)]">
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
      redirectPath="/input?type=chemistry&mode=online"
    />
    </InactiveProductGuard>
  )
}
