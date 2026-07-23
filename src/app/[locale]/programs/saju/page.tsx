"use client"

// ============================================================
// 사주 분석 퍼퓸 — 프로그램 랜딩 (/programs/saju)
// SSOT: docs/saju/UI-SPEC.md §6 (히어로 파라미터 §6.1, 하드코딩 섹션 §6.3)
// 상단 히어로 = 기존 공용 문법(키치 사이트와의 다리), 아래 섹션부터
// 먹/금박/한지의 사주 월드로 톤이 전환된다. §1.0 금지 목록 준수:
// 보라 금지 · 이모지/반짝이 금지 · bounce 금지 · break-keep 전면.
// ============================================================

import { type CSSProperties, useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { ScrollText } from "lucide-react"
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
import { DesktopDetailHero } from "@/components/desktop/DesktopDetailHero"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { getReviewStats } from "@/lib/supabase/reviews"
import type { ReviewStats as ReviewStatsType } from "@/lib/supabase/reviews"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"
import { useProductDisplayName, useProductImages } from '@/hooks/useAdminContent'
import { extractProductPageContentWithFallback, type ProductPagePositionField } from "@/lib/products/page-content"
import { BrushDivider, HanjiCard, SealStamp, SAJU_EASE_INK, SAJU_ELEMENTS, SAJU_VIEWPORT } from "@/components/saju"
import { SAJU_ELEMENT_INFO, type SajuElement } from "@/types/analysis"

// §1.4 무게감 규칙: opacity 0→1 + y 20→0, 0.8s, easeInk, 스태거 0.14s
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: SAJU_EASE_INK }
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.1 }
  }
}

// SAJU_ELEMENT_INFO(한국어 키) → saju.common.elements.* i18n 키 매핑
const ELEMENT_I18N_KEY: Record<SajuElement, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

// 오행 감각 번역 폴백 (CONTENT.md §3) — i18n 키 추가 전까지의 ko 폴백
const ELEMENT_SENSE_FALLBACK: Record<SajuElement, string> = {
  목: '새순과 숲의 공기 — 자라나는 기운을 틔웁니다.',
  화: '온기와 퍼지는 빛 — 식은 자리를 데웁니다.',
  토: '흙의 안정과 달콤한 무게 — 흔들리는 마음을 다집니다.',
  금: '서늘한 광택과 베어내는 맑음 — 번잡함을 걷어냅니다.',
  수: '깊은 물과 스며드는 고요 — 마른 자리를 채웁니다.',
}

export default function SajuProgramPage() {
  const { user, unifiedUser, loading } = useAuth()
  const { getOptions } = useProductPricing()
  // 10ml/50ml 동일가(₩48,000) — 최소가 계산은 기존 문법 유지 (관리자 조정 대비)
  const sajuMin = getOptions('saju_perfume')
    .reduce<number | null>(
      (acc, o) => (acc === null || o.price < acc ? o.price : acc),
      null,
    )
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedProductImage, setSelectedProductImage] = useState(0)
  const t = useTranslations()
  const productName = useProductDisplayName('saju', t('products.saju'))
  const { imageUrls: sajuImageUrls, loading: sajuImagesLoading } = useProductImages('saju')
  const productImages = useMemo(
    () => (sajuImagesLoading ? [] : (sajuImageUrls.length > 0 ? sajuImageUrls : ['/images/perfume/saju-50ml.png'])),
    [sajuImageUrls, sajuImagesLoading],
  )

  // i18n 키가 아직 없으면 ko 폴백으로 우아하게 강등 (Footer.tsx 관례)
  const tf = (key: string, fallback: string) => (t.has(key) ? t(key) : fallback)

  // 리뷰 통계 (히어로 ReviewTrigger용)
  const [reviewStats, setReviewStats] = useState<ReviewStatsType | null>(null)
  useEffect(() => {
    getReviewStats('saju_perfume').then(setReviewStats).catch(() => {})
  }, [])

  const isLoggedIn = !!(user || unifiedUser)
  const currentUserId = user?.id || unifiedUser?.id

  const { isCustomMode, detail } = useProductDetail('saju')
  const { startTransition } = useTransition()
  const pageSubtitle = t('programs.subtitle.saju')
  const pageInfoTitle = t('programs.includes.saju')
  const pageInfoBody = `${t('saju.landing.info1')} / ${t('saju.landing.info2')}`
  const pageCtaLabel = t('saju.landing.cta')
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(detail?.custom_html, {
      badge: '命',
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
      startTransition("/input?type=saju&mode=online")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const processSteps = [
    { hanja: '問', step: '01', title: t('saju.landing.process.step1.title'), desc: t('saju.landing.process.step1.desc') },
    { hanja: '曆', step: '02', title: t('saju.landing.process.step2.title'), desc: t('saju.landing.process.step2.desc') },
    { hanja: '解', step: '03', title: t('saju.landing.process.step3.title'), desc: t('saju.landing.process.step3.desc') },
    { hanja: '香', step: '04', title: t('saju.landing.process.step4.title'), desc: t('saju.landing.process.step4.desc') },
  ]

  const specialCards = [
    { title: t('saju.landing.special.card1.title'), desc: t('saju.landing.special.card1.desc') },
    { title: t('saju.landing.special.card2.title'), desc: t('saju.landing.special.card2.desc') },
    { title: t('saju.landing.special.card3.title'), desc: t('saju.landing.special.card3.desc') },
  ]

  const trustFaqs = [
    {
      q: tf('saju.landing.trust.q1', '태어난 시간을 모르면 어떻게 하나요?'),
      a: tf('saju.landing.trust.a1', '시주(時柱)를 제외한 삼주(三柱) 분석으로 진행합니다. 여섯 글자만으로도 기운의 큰 흐름은 충분히 읽을 수 있습니다.'),
    },
    {
      q: tf('saju.landing.trust.q2', '계산은 정확한가요?'),
      a: tf('saju.landing.trust.a2', '절기 경계 시각까지 반영한 만세력 기반으로 코드가 정확히 계산하고, AI는 해석만 맡습니다. 밤 11시 이후의 자시(子時) 출생은 유파에 따라 일주가 달라질 수 있어, 결과에서 함께 안내해 드립니다.'),
    },
  ]

  const heroProps = {
    productSlug: "saju",
    title: productName,
    imageAlt: t('programs.productImage'),
    images: {
      urls: productImages,
      loading: sajuImagesLoading,
      selectedIndex: selectedProductImage,
      onSelect: setSelectedProductImage,
    },
    pageContent,
    pagePositionStyle,
    badgeClassName: "bg-[#0C0E16] text-[#E8C766]",
    breadcrumbs: [
      { label: t('programs.breadcrumbHome'), href: '/' },
      { label: t('programs.breadcrumbPrograms'), href: '/#programs-section' },
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
        <span className="text-xl font-black text-black">{t('currency.symbol')}{formatPrice(sajuMin ?? 48000)}~</span>
        <span className="text-xs text-slate-400">{t('saju.landing.price')}</span>
      </div>
    ),
    infoIcon: <ScrollText size={14} className="text-slate-900" />,
    infoItems: [t('saju.landing.info1'), t('saju.landing.info2')],
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
              Feature Bar — 먹색 자정 (§6.3.1: 아이콘 대신 한자)
          ============================================ */}
          <section className="saju-ink-grain bg-[#0C0E16] px-4 py-6">
            <div className="relative mx-auto w-full max-w-[455px]">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                {[
                  { hanja: '命', label: t('saju.landing.featureBar.item1') },
                  { hanja: '五行', label: t('saju.landing.featureBar.item2') },
                  { hanja: '香', label: t('saju.landing.featureBar.item3') },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-serif-kr text-[15px] font-black leading-none text-[#C9A227]">{item.hanja}</span>
                    <span className="break-keep font-serif-kr text-xs font-semibold text-[#E9E2D0]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================
              진행 과정 — 問·曆·解·香 낙관 스텝 (§6.3.2)
          ============================================ */}
          <section className="bg-[#FFFDF5] px-4 py-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={SAJU_VIEWPORT}
              variants={staggerContainer}
              className="mx-auto w-full max-w-[455px]"
            >
              <div className="mb-10 text-center">
                <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
                  <BrushDivider width={210} label="問曆解香" tone="ink-on-cream" />
                </motion.div>
                <motion.h2 variants={fadeInUp} className="break-keep font-serif-kr text-[24px] font-semibold leading-[1.45] text-[#1A1610]">
                  {tf('saju.landing.process.title', '여덟 글자가 향이 되기까지')}
                </motion.h2>
                <motion.p variants={fadeInUp} className="mt-2 break-keep font-serif-kr text-[13px] leading-[1.7] text-[#5C564A]">
                  {tf('saju.landing.process.sub', '사주 분석은 네 걸음으로 완성됩니다.')}
                </motion.p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-9">
                {processSteps.map((item, idx) => (
                  <motion.div key={idx} variants={fadeInUp} className="flex flex-col items-center text-center">
                    <div
                      className="mb-3 flex h-14 w-14 items-center justify-center bg-[#0C0E16]"
                      style={{ borderRadius: '18%', transform: 'rotate(-3deg)' }}
                      role="img"
                      aria-label={item.title}
                    >
                      <span className="font-serif-kr text-[24px] font-black leading-none text-[#C9A227]">{item.hanja}</span>
                    </div>
                    <span className="mb-1 text-xl font-black text-slate-200">{item.step}</span>
                    <h3 className="mb-1 break-keep font-serif-kr text-sm font-semibold text-[#1A1610]">{item.title}</h3>
                    <p className="break-keep font-serif-kr text-[12px] leading-[1.7] text-[#5C564A]">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* ============================================
              오행 → 향 논리 티저 — 먹색 자정의 사주 월드
          ============================================ */}
          <section className="saju-ink-grain bg-[#0C0E16] px-4 py-16">
            <div className="relative mx-auto w-full max-w-[455px]">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={SAJU_VIEWPORT}
                variants={staggerContainer}
              >
                <div className="mb-8 text-center">
                  <motion.p variants={fadeInUp} className="mb-3 font-serif-kr text-[11px] font-semibold tracking-[0.14em] text-[#A69F8D]">
                    {tf('saju.landing.elements.kicker', '오행과 향의 대응')}
                  </motion.p>
                  <motion.h2 variants={fadeInUp} className="break-keep font-serif-kr text-[24px] font-semibold leading-[1.45] text-[#E9E2D0]">
                    {tf('saju.landing.elements.title', '다섯 기운에는 저마다의 향이 있습니다')}
                  </motion.h2>
                  <motion.p variants={fadeInUp} className="mt-3 break-keep font-serif-kr text-[15px] leading-[1.85] text-[#A69F8D]">
                    {tf('saju.landing.elements.desc', '만세력이 찾아낸 부족한 기운, 용신(用神)을 향의 언어로 옮깁니다. 결과에는 왜 이 향인지의 근거가 함께 담깁니다.')}
                  </motion.p>
                </div>

                <div className="space-y-3">
                  {SAJU_ELEMENTS.map((el) => {
                    const info = SAJU_ELEMENT_INFO[el]
                    return (
                      <motion.div
                        key={el}
                        variants={fadeInUp}
                        className="flex items-center gap-4 rounded-lg border border-[#262A38] bg-[#12141D] px-4 py-3.5"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center"
                          style={{ borderRadius: '18%', backgroundColor: info.color, transform: 'rotate(-3deg)' }}
                          role="img"
                          aria-label={t(`saju.common.elements.${ELEMENT_I18N_KEY[el]}`)}
                        >
                          {/* 金 패만 밝은 면 — 글자 먹색 (§2.2 문법) */}
                          <span className="font-serif-kr text-[18px] font-black leading-none" style={{ color: el === '금' ? '#1A1610' : '#F5EFE2' }}>
                            {info.hanja}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-serif-kr text-[15px] font-semibold" style={{ color: info.onDark }}>
                              {t(`saju.common.elements.${ELEMENT_I18N_KEY[el]}`)}
                            </span>
                            {/* 향 계열명 — 로케일별 번역 (§8.1: 한자만 보존, 한글 계열명은 번역 대상) */}
                            <span className="font-serif-kr text-[12px] text-[#A69F8D]">
                              {tf(`saju.landing.elements.noteFamily.${ELEMENT_I18N_KEY[el]}`, info.noteFamily)}
                            </span>
                          </div>
                          <p className="mt-1 break-keep font-serif-kr text-[12px] leading-[1.6] text-[#A69F8D]">
                            {tf(`saju.landing.elements.sense.${ELEMENT_I18N_KEY[el]}`, ELEMENT_SENSE_FALLBACK[el])}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* ============================================
                  최애/나 모드 소개 + 궁합 티저
              ============================================ */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={SAJU_VIEWPORT}
                variants={staggerContainer}
                className="mt-14"
              >
                <motion.div variants={fadeInUp} className="mb-10 flex justify-center">
                  <BrushDivider width={180} tone="gold" />
                </motion.div>

                <div className="mb-8 text-center">
                  <motion.p variants={fadeInUp} className="mb-3 font-serif-kr text-[11px] font-semibold tracking-[0.14em] text-[#A69F8D]">
                    {tf('saju.landing.modes.kicker', '나의 팔자, 최애의 팔자')}
                  </motion.p>
                  <motion.h2 variants={fadeInUp} className="break-keep font-serif-kr text-[24px] font-semibold leading-[1.45] text-[#E9E2D0]">
                    {tf('saju.landing.modes.title', '누구의 여덟 글자를 읽어드릴까요')}
                  </motion.h2>
                </div>

                <div className="space-y-5">
                  <motion.div variants={fadeInUp}>
                    <HanjiCard verticalLabel="本命" padding="lg">
                      <div className="pr-9">
                        <h3 className="break-keep font-serif-kr text-[16px] font-semibold leading-[1.6] text-[#1A1610]">
                          {tf('saju.landing.modes.self.title', '나의 사주')}
                        </h3>
                        <p className="mt-2 break-keep font-serif-kr text-[14px] leading-[1.85] text-[#5C564A]">
                          {tf('saju.landing.modes.self.desc', '내가 타고난 기운의 흐름을 읽고, 명식에서 비어 있는 자리를 채우는 향을 처방받습니다.')}
                        </p>
                      </div>
                    </HanjiCard>
                  </motion.div>

                  <motion.div variants={fadeInUp}>
                    <HanjiCard verticalLabel="最愛" padding="lg">
                      <div className="pr-9">
                        <h3 className="break-keep font-serif-kr text-[16px] font-semibold leading-[1.6] text-[#1A1610]">
                          {tf('saju.landing.modes.idol.title', '최애의 사주')}
                        </h3>
                        <p className="mt-2 break-keep font-serif-kr text-[14px] leading-[1.85] text-[#5C564A]">
                          {tf('saju.landing.modes.idol.desc', '그 사람이 왜 그렇게 빛나는지, 명식은 먼저 알고 있었습니다. 최애가 타고난 기운을 한 병의 향으로 간직하세요.')}
                        </p>
                      </div>
                    </HanjiCard>
                  </motion.div>

                  {/* 궁합 티저 */}
                  <motion.div
                    variants={fadeInUp}
                    className="flex items-start gap-4 rounded-lg border border-[#C9A227]/40 bg-[#12141D] p-5"
                  >
                    <SealStamp chars="緣" size="md" tone="cinnabar" className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="break-keep font-serif-kr text-[15px] font-semibold leading-[1.6] text-[#E8C766]">
                        {tf('saju.landing.compat.title', '궁합 — 두 명식이 만나는 자리')}
                      </h3>
                      <p className="mt-1.5 break-keep font-serif-kr text-[13px] leading-[1.85] text-[#A69F8D]">
                        {tf('saju.landing.compat.desc', '상대의 생시를 나란히 놓으면 합(合)과 충(沖)이 읽힙니다. 두 사람 사이에 놓일 향 하나를 함께 처방해 드립니다.')}
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ============================================
              특별함 3카드 + 신뢰 문답 (§6.3.3 — 사주 월드 밖 절충 스킨)
          ============================================ */}
          <section className="bg-[#FFFDF5] px-4 py-14">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={SAJU_VIEWPORT}
              variants={staggerContainer}
              className="mx-auto w-full max-w-[455px]"
            >
              <div className="mb-8 text-center">
                <motion.div variants={fadeInUp} className="mb-4 flex justify-center">
                  <BrushDivider width={180} label="信" tone="ink-on-cream" />
                </motion.div>
                <motion.h2 variants={fadeInUp} className="break-keep font-serif-kr text-[24px] font-semibold leading-[1.45] text-[#1A1610]">
                  {tf('saju.landing.special.heading', '이 프로그램이 미더운 이유')}
                </motion.h2>
              </div>

              <div className="space-y-4">
                {specialCards.map((card, idx) => (
                  <motion.div key={idx} variants={fadeInUp} className="rounded-lg border border-[#1A1610]/15 bg-white p-5">
                    <h3 className="break-keep font-serif-kr text-[15px] font-semibold leading-[1.6] text-[#1A1610]">{card.title}</h3>
                    <p className="mt-1.5 break-keep font-serif-kr text-[13px] leading-[1.85] text-[#5C564A]">{card.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* 문답(問答) — 만세력 계산 신뢰 안내: 시간 모름 / 자시 경계 */}
              <motion.div variants={fadeInUp} className="mt-8 space-y-6 rounded-lg border border-[#1A1610]/15 bg-white p-5">
                {trustFaqs.map((faq, idx) => (
                  <div key={idx}>
                    <div className="flex gap-2.5">
                      <span className="shrink-0 font-serif-kr text-[13px] font-black leading-[1.7] text-[#A93226]">問</span>
                      <h4 className="break-keep font-serif-kr text-[14px] font-semibold leading-[1.7] text-[#1A1610]">{faq.q}</h4>
                    </div>
                    <div className="mt-1.5 flex gap-2.5">
                      <span className="shrink-0 font-serif-kr text-[13px] font-black leading-[1.85] text-[#2C3E50]">答</span>
                      <p className="break-keep font-serif-kr text-[13px] leading-[1.85] text-[#5C564A]">{faq.a}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </section>
        </div>
      )}
    </>
  )

  const reviewSection = (
    <ProgramReviewSection
      programType="saju_perfume"
      programName={productName}
      currentUserId={currentUserId}
      isLoggedIn={isLoggedIn}
      onLoginRequired={() => setShowLoginPrompt(true)}
    />
  )

  return (
    <InactiveProductGuard productSlug="saju">
    <ViewportSwitch
      mobile={
        <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
          <Header />
          <ProgramAdminBridge productSlug="saju" />
          {/* 헤더(티커 h-7 + 바 h-14 ≈ 84px)만큼만 상단 여백 → 이미지 위 흰 띠 제거 */}
          <UnifiedDetailHero {...heroProps} sectionClassName="pt-[84px]" />
          {detailBody}
          {reviewSection}
        </main>
      }
      desktop={
        <main className="relative min-h-screen bg-[#FFFDF5] pb-16 font-sans">
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
      redirectPath="/input?type=saju&mode=online"
    />
    </InactiveProductGuard>
  )
}
