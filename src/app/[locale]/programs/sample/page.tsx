"use client"

import { type CSSProperties, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  Star, Camera, FileText, Zap, Gift,
  Sparkles, Palette, FileCheck,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useTransition } from "@/contexts/TransitionContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { useProductDetail } from "@/hooks/useProductDetail"
import { InactiveProductGuard } from "@/components/programs/InactiveProductGuard"
import { CustomDetailRenderer } from "@/components/programs/CustomDetailRenderer"
import { ProgramAdminBridge } from "@/components/programs/ProgramAdminBridge"
import { ProgramLoginPrompt } from "@/components/programs/ProgramLoginPrompt"
import { UnifiedDetailHero } from "@/components/products/UnifiedDetailHero"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"
import { useProductDisplayName } from "@/hooks/useAdminContent"
import { extractProductPageContentWithFallback, type ProductPagePositionField } from "@/lib/products/page-content"

// idol_image 분석 흐름을 그대로 재사용하되, product=sample 로 최종 상품만 시향지로 전환
const SAMPLE_INPUT_PATH = "/input?type=idol_image&mode=online&product=sample"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

export default function SamplePaperPage() {
  const t = useTranslations()
  const { user, unifiedUser, loading } = useAuth()
  const { getOption } = useProductPricing()
  const paperOpt = getOption("image_analysis_paper", "set")
  const paperPrice = paperOpt?.price ?? 4000
  const paperDiscount = (paperOpt?.price && paperOpt.original_price && paperOpt.original_price > paperOpt.price)
    ? Math.round(((paperOpt.original_price - paperOpt.price) / paperOpt.original_price) * 100)
    : null

  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const productName = useProductDisplayName("sample", t("programs.detail.sample.productName"))
  const { isCustomMode, detail } = useProductDetail("sample")
  const { startTransition } = useTransition()
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(detail?.custom_html, {
      badge: "SAMPLE",
      subtitle: t("programs.detail.sample.heroSubtitle"),
      infoTitle: t("programs.detail.sample.infoTitle"),
      infoBody: t("programs.detail.sample.infoBody"),
      ctaLabel: t("programs.detail.sample.ctaLabel"),
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

  const isLoggedIn = !!(user || unifiedUser)

  const handleStartClick = () => {
    if (loading) return
    if (isLoggedIn) {
      startTransition(SAMPLE_INPUT_PATH)
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  return (
    <InactiveProductGuard productSlug="sample">
      <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
        <Header />
        <ProgramAdminBridge productSlug="sample" />

        {/* HERO */}
        <UnifiedDetailHero
          productSlug="sample"
          title={productName}
          imageAlt={productName}
          pageContent={pageContent}
          pagePositionStyle={pagePositionStyle}
          breadcrumbs={[
            { label: t("programs.breadcrumbHome"), href: "/" },
            { label: t("programs.breadcrumbPrograms"), href: "/" },
            { label: productName },
          ]}
          price={
            <div className="flex items-end gap-2">
              <span className="text-xl font-black text-black">{t("currency.symbol")}{formatPrice(paperPrice)}</span>
              {paperOpt?.original_price && paperOpt.original_price > paperPrice && (
                <>
                  <span className="text-xs text-slate-400 line-through">{t("currency.symbol")}{formatPrice(paperOpt.original_price)}</span>
                  {paperDiscount !== null && (
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{paperDiscount}% OFF</span>
                  )}
                </>
              )}
            </div>
          }
          infoIcon={<Star size={14} className="fill-slate-900 text-slate-900" />}
          infoItems={[
            t("programs.detail.sample.infoItem1"),
            t("programs.detail.sample.infoItem2"),
            t("shipping.estimated"),
          ]}
          cta={{
            onClick: handleStartClick,
            disabled: loading,
            label: pageContent.ctaLabel,
            hint: t("programs.detail.sample.ctaHint"),
          }}
        />

        {isCustomMode ? (
          <CustomDetailRenderer html={detail?.custom_html ?? ""} />
        ) : (
          <div data-admin-editable="detail_html">
            {/* Feature Bar */}
            <section className="py-6 px-4 bg-black">
              <div className="w-full">
                <div className="flex flex-wrap items-center justify-center gap-4 text-white">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span className="font-bold text-xs">{t("programs.detail.sample.featureAnalysis")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Palette size={14} className="text-cyan-400" />
                    <span className="font-bold text-xs">{t("programs.detail.sample.featureScent")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileCheck size={14} className="text-cyan-400" />
                    <span className="font-bold text-xs">{t("programs.detail.sample.featureReport")}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 진행 과정 */}
            <section className="py-12 px-4 bg-[#FFFDF5]">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="w-full"
              >
                <div className="text-center mb-8">
                  <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-blue-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
                    HOW IT WORKS
                  </motion.div>
                  <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black break-keep">
                    {t("programs.detail.sample.howItWorksTitle")}
                  </motion.h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { step: "01", title: t("programs.detail.sample.step1Title"), desc: t("programs.detail.sample.step1Desc"), icon: Camera, color: "bg-yellow-400" },
                    { step: "02", title: t("programs.detail.sample.step2Title"), desc: t("programs.detail.sample.step2Desc"), icon: FileText, color: "bg-orange-400" },
                    { step: "03", title: t("programs.detail.sample.step3Title"), desc: t("programs.detail.sample.step3Desc"), icon: Zap, color: "bg-pink-400" },
                    { step: "04", title: t("programs.detail.sample.step4Title"), desc: t("programs.detail.sample.step4Desc"), icon: Gift, color: "bg-purple-400" },
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
              </motion.div>
            </section>
          </div>
        )}

        {/* 로그인 안내 모달 */}
        <ProgramLoginPrompt
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          onLogin={handleLoginClick}
        />

        {/* 로그인 모달 */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          redirectPath={SAMPLE_INPUT_PATH}
        />
      </main>
    </InactiveProductGuard>
  )
}
