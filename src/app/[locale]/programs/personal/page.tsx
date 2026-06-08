"use client"

import { type CSSProperties, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Sparkles, User, Star, CheckCircle2, X, AlertTriangle,
  ChevronDown, Package, Truck,
  FileText, Droplets
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"
import { useProductDisplayName, useProductImages } from '@/hooks/useAdminContent'
import { useProductDetail } from '@/hooks/useProductDetail'
import { InactiveProductGuard } from '@/components/programs/InactiveProductGuard'
import { CustomDetailRenderer } from '@/components/programs/CustomDetailRenderer'
import { ProgramAdminBridge } from '@/components/programs/ProgramAdminBridge'
import { UnifiedDetailHero } from "@/components/products/UnifiedDetailHero"
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

export default function PersonalPage() {
  const t = useTranslations()
  const { getOption } = useProductPricing()
  const personal10 = getOption('personal_scent', '10ml')
  const personal50 = getOption('personal_scent', '50ml')
  const personalDiscount = (personal10?.price && personal10.original_price && personal10.original_price > personal10.price)
    ? Math.round(((personal10.original_price - personal10.price) / personal10.original_price) * 100)
    : null

  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const productName = useProductDisplayName('personal', t('programs.detail.personal.productName'))

  const isLoggedIn = !!(user || unifiedUser)
  const { isCustomMode, detail } = useProductDetail('personal')

  const { imageUrls: dynamicImages, loading: imagesLoading } = useProductImages('personal')
  const productImages = imagesLoading ? [] : dynamicImages
  const currentImage = productImages[selectedImage] || productImages[0] || ''
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(detail?.custom_html, {
      badge: 'SIGNATURE',
      subtitle: t('programs.detail.personal.heroSubtitle'),
      infoTitle: t('programs.detail.personal.heroInfoTitle'),
      infoBody: t('programs.detail.personal.heroInfoBody'),
      ctaLabel: t('programs.detail.personal.heroCtaLabel'),
    }),
    [detail?.custom_html, t],
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
      router.push("/input?type=personal")
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  const reviews = [
    { name: t('programs.detail.personal.review1Name'), rating: 5, text: t('programs.detail.personal.review1Text') },
    { name: t('programs.detail.personal.review2Name'), rating: 5, text: t('programs.detail.personal.review2Text') },
    { name: t('programs.detail.personal.review3Name'), rating: 5, text: t('programs.detail.personal.review3Text') },
  ]

  const faqs = [
    { q: t('programs.detail.personal.faq1Q'), a: t('programs.detail.personal.faq1A') },
    { q: t('programs.detail.personal.faq2Q'), a: t('programs.detail.personal.faq2A') },
    { q: t('programs.detail.personal.faq3Q'), a: t('programs.detail.personal.faq3A') },
    { q: t('programs.detail.personal.faq4Q'), a: t('programs.detail.personal.faq4A') },
  ]

  const productIncludes = [
    { icon: FileText, name: t('programs.detail.personal.include1Name'), desc: t('programs.detail.personal.include1Desc') },
    { icon: Star, name: t('programs.detail.personal.include2Name'), desc: t('programs.detail.personal.include2Desc') },
    { icon: Droplets, name: t('programs.detail.personal.include3Name'), desc: t('programs.detail.personal.include3Desc') },
    { icon: Package, name: t('programs.detail.personal.include4Name'), desc: t('programs.detail.personal.include4Desc') },
  ]

  return (
    <InactiveProductGuard productSlug="personal">
    <main className="relative min-h-screen bg-[#FAFAFA] font-sans">
      <Header />
      <ProgramAdminBridge productSlug="personal" />

      {/* ============================================
          HERO SECTION - 제품 갤러리 + 정보
      ============================================ */}
      <UnifiedDetailHero
        productSlug="personal"
        title={productName}
        imageAlt={productName}
        pageContent={pageContent}
        pagePositionStyle={pagePositionStyle}
        breadcrumbs={[
          { label: t('programs.breadcrumbHome'), href: "/" },
          { label: t('programs.breadcrumbPrograms'), href: "/" },
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
            PREMIUM
          </span>
        }
        meta={
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-4 w-4 fill-black text-black" />
            ))}
            <span className="ml-1 text-xs font-bold text-slate-600">4.9 (2,847)</span>
          </div>
        }
        price={
          <>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-black text-black">{t('currency.symbol')}{formatPrice(personal10?.price ?? 24000)}</span>
              {personal10?.original_price && personal10.original_price > personal10.price && (
                <>
                  <span className="text-sm text-slate-400 line-through">{t('currency.symbol')}{formatPrice(personal10.original_price)}</span>
                  {personalDiscount !== null && (
                    <span className="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white">{personalDiscount}% OFF</span>
                  )}
                </>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              10ml {t('currency.symbol')}{formatPrice(personal10?.price ?? 24000)} / 50ml {t('currency.symbol')}{formatPrice(personal50?.price ?? 48000)}
            </div>
          </>
        }
        infoIcon={<Droplets size={14} className="text-slate-900" />}
        infoItems={[
          pageContent.infoTitle,
          t('programs.detail.personal.infoShipping', { fee: `${t('currency.symbol')}${formatPrice(3000)}` }),
          t('programs.detail.personal.infoReportFree'),
        ]}
        cta={{
          onClick: handleStartClick,
          disabled: loading,
          label: pageContent.ctaLabel,
          hint: t('programs.detail.personal.ctaHint'),
        }}
      />

      {isCustomMode ? (
        <CustomDetailRenderer html={detail?.custom_html ?? ''} />
      ) : (
        <div data-admin-editable="detail_html">
          {/* ============================================
              구성품 배너
          ============================================ */}
          <section className="py-8 px-4 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-white">
            {productIncludes.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <item.icon size={18} className="text-slate-400" />
                <span className="font-bold text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          구성품 상세
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-gradient-to-b from-[#FAFAFA] to-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-black text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_#666] mb-4">
              📦 PACKAGE
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              {t('programs.detail.personal.packageTitle')}
            </motion.h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {productIncludes.map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0_0_black] text-center"
              >
                <div className="w-12 h-12 bg-slate-100 border-2 border-black rounded-lg shadow-[2px_2px_0_0_black] flex items-center justify-center mx-auto mb-3">
                  <item.icon size={24} className="text-black" />
                </div>
                <h3 className="font-black text-sm text-black mb-1">{item.name}</h3>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          이런 분께 추천
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-200 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              🎯 TARGET
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              {t('programs.detail.personal.targetTitle')}
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { emoji: "🌱", title: t('programs.detail.personal.target1Title'), desc: t('programs.detail.personal.target1Desc') },
              { emoji: "🎁", title: t('programs.detail.personal.target2Title'), desc: t('programs.detail.personal.target2Desc') },
              { emoji: "💼", title: t('programs.detail.personal.target3Title'), desc: t('programs.detail.personal.target3Desc') },
              { emoji: "🔍", title: t('programs.detail.personal.target4Title'), desc: t('programs.detail.personal.target4Desc') },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-black rounded-xl p-6 shadow-[4px_4px_0_0_black] hover:shadow-[6px_6px_0_0_black] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              >
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="text-xl font-black text-black mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          진행 과정
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-[#FAFAFA]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_#444] mb-4">
              📋 PROCESS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              {t('programs.detail.personal.processTitle')}
            </motion.h2>
          </div>

          <div className="relative">
            {/* 연결선 */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-black -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
              {[
                { step: "01", title: t('programs.detail.personal.process1Title'), desc: t('programs.detail.personal.process1Desc'), icon: User },
                { step: "02", title: t('programs.detail.personal.process2Title'), desc: t('programs.detail.personal.process2Desc'), icon: Sparkles },
                { step: "03", title: t('programs.detail.personal.process3Title'), desc: t('programs.detail.personal.process3Desc'), icon: Star },
                { step: "04", title: t('programs.detail.personal.process4Title'), desc: t('programs.detail.personal.process4Desc'), icon: Truck },
              ].map((item, idx) => (
                <motion.div key={idx} variants={fadeInUp} className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0_0_black] flex items-center justify-center mb-4">
                    <item.icon size={32} className="text-black" />
                  </div>
                  <span className="text-3xl font-black text-slate-200 mb-2">{item.step}</span>
                  <h3 className="text-lg font-black text-black mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================================
          결과물 미리보기
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-100 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              📊 RESULT PREVIEW
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black mb-4">
              {t('programs.detail.personal.resultTitle')}
            </motion.h2>
          </div>

          <motion.div variants={fadeInUp} className="bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-black rounded-2xl p-6 md:p-10 shadow-[8px_8px_0_0_black]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* 왼쪽: 분석 결과 */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-black rounded-xl p-5 shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-lg mb-4 flex items-center gap-2">
                    <FileText size={20} className="text-black" />
                    {t('programs.detail.personal.resultProfileTitle')}
                  </h4>
                  <div className="space-y-3">
                    {[t('programs.detail.personal.resultProfile1'), t('programs.detail.personal.resultProfile2'), t('programs.detail.personal.resultProfile3'), t('programs.detail.personal.resultProfile4')].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                        <CheckCircle2 size={16} className="text-black" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border-2 border-black rounded-xl p-5 shadow-[4px_4px_0_0_black]">
                  <h4 className="font-black text-lg mb-3 flex items-center gap-2">
                    <Star size={20} className="text-black" />
                    {t('programs.detail.personal.resultTopTitle')}
                  </h4>
                  <div className="space-y-2">
                    {[t('programs.detail.personal.resultTop1'), t('programs.detail.personal.resultTop2'), t('programs.detail.personal.resultTop3')].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg text-sm">
                        <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 오른쪽: 완성품 이미지 */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-64 h-64 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_black] flex items-center justify-center overflow-hidden">
                    {currentImage ? (
                      <img src={currentImage} alt={t('programs.detail.personal.finishedProductAlt')} className="w-[80%] h-[80%] object-contain" />
                    ) : (
                      <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
                    )}
                  </div>
                  <div className="absolute -top-3 -right-3 px-4 py-2 bg-black text-white font-black rounded-full border-2 border-black text-sm">
                    YOUR SCENT ✨
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <h3 className="text-2xl font-black text-black mb-2">{t('programs.detail.personal.resultSignatureTitle')}</h3>
                  <p className="text-slate-600">{t('programs.detail.personal.resultSignatureDesc')}</p>
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
      <section className="py-16 px-4 md:px-8 bg-[#FAFAFA]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-300 text-black text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_black] mb-4">
              💬 REAL REVIEWS
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              {t('programs.detail.personal.reviewsTitle')}
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0_0_black]"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={16} className="fill-black text-black" />
                  ))}
                </div>
                <p className="text-slate-700 mb-4 leading-relaxed">&quot;{review.text}&quot;</p>
                <div className="flex items-center justify-between">
                  <p className="font-black text-black">{review.name}</p>
                  <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                    {t('programs.detail.personal.purchaseVerified')}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          FAQ
      ============================================ */}
      <section className="py-16 px-4 md:px-8 bg-white border-y-2 border-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} className="inline-block px-4 py-2 bg-slate-800 text-white text-sm font-black rounded-full border-2 border-black shadow-[3px_3px_0_0_#444] mb-4">
              ❓ FAQ
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-black text-black">
              {t('programs.detail.personal.faqTitle')}
            </motion.h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-slate-50 border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0_0_black]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left font-black text-black hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-black text-white border-2 border-black rounded-lg flex items-center justify-center text-sm">Q</span>
                    {faq.q}
                  </span>
                  <ChevronDown size={20} className={`transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-0">
                        <div className="pl-11 text-slate-600 leading-relaxed">{faq.a}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============================================
          최종 CTA
      ============================================ */}
      <section className="py-20 px-4 md:px-8 bg-black">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
            {t('programs.detail.personal.finalCtaTitleLine1')}<br />
            <span className="text-slate-400">{t('programs.detail.personal.finalCtaTitleLine2')}</span>
          </h2>
          <p className="text-slate-500 mb-8 text-lg">
            {t('programs.detail.personal.finalCtaDescLine1')}<br />
            {t('programs.detail.personal.finalCtaDescLine2')}
          </p>

          <button
            onClick={handleStartClick}
            disabled={loading}
            className="inline-flex items-center justify-center gap-3 px-12 py-6 bg-white text-black font-black text-xl rounded-xl border-2 border-black shadow-[8px_8px_0_0_#666] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0_0_#666] transition-all disabled:opacity-50"
          >
            <Sparkles size={28} />
            {t('programs.detail.personal.finalCtaButton')}
          </button>

          <p className="text-slate-600 mt-6 text-sm">
            {t('programs.detail.personal.finalCtaTime')} ⚡
          </p>
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
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-black"
            >
              <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-slate-100 to-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>

                <div className="w-16 h-16 mx-auto mb-4 bg-black rounded-xl flex items-center justify-center shadow-lg border-2 border-black shadow-[4px_4px_0_0_#666]">
                  <AlertTriangle size={28} className="text-white" />
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">{t('programs.detail.personal.loginPromptTitle')} 🤔</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t('programs.detail.personal.loginPromptBodyLine1')}<br />
                  <span className="font-bold text-red-500">{t('programs.detail.personal.loginPromptBodyLine2')}</span>
                </p>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('programs.detail.personal.loginBenefit1')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('programs.detail.personal.loginBenefit2')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-slate-600">{t('programs.detail.personal.loginBenefit3')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-xl font-bold text-lg shadow-[4px_4px_0px_0px_#666] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#666] transition-all border-2 border-black"
                >
                  {t('programs.detail.personal.loginButton')}
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
        redirectPath="/input?type=personal&mode=online"
      />
    </main>
    </InactiveProductGuard>
  )
}
