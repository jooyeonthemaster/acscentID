"use client"

import { type CSSProperties, useMemo, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Star, ChevronRight, Camera, FileText, Zap, Gift,
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
import { ProgramImageGallery } from "@/components/programs/ProgramImageGallery"
import { ProgramLoginPrompt } from "@/components/programs/ProgramLoginPrompt"
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
  const { user, unifiedUser, loading } = useAuth()
  const { getOption } = useProductPricing()
  const paperOpt = getOption("image_analysis_paper", "set")
  const paperPrice = paperOpt?.price ?? 4000
  const paperDiscount = (paperOpt?.price && paperOpt.original_price && paperOpt.original_price > paperOpt.price)
    ? Math.round(((paperOpt.original_price - paperOpt.price) / paperOpt.original_price) * 100)
    : null

  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const productName = useProductDisplayName("sample", "AI 이미지 분석 시향지")
  const { isCustomMode, detail } = useProductDetail("sample")
  const { startTransition } = useTransition()
  const pageContent = useMemo(
    () => extractProductPageContentWithFallback(detail?.custom_html, {
      badge: "SAMPLE",
      subtitle: "내 이미지를 AI로 분석해 추천 향을 시향지로 먼저 받아보세요. 마음에 들면 정식 향수로 바로 구매할 수 있어요.",
      infoTitle: "구성품",
      infoBody: "AI 이미지 분석 + 추천 향 시향지 / 분석 결과 리포트 제공 / 주문 후 2~3일 내 배송",
      ctaLabel: "이미지 분석 시작하기",
    }),
    [detail?.custom_html],
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
        <section className="pt-28 pb-10 px-4">
          <div className="w-full">
            <ProgramImageGallery
              productSlug="sample"
              fallbackImages={[
                "/images/perfume/KakaoTalk_20260125_225218071.jpg",
                "/images/perfume/KakaoTalk_20260125_225218071_01.jpg",
              ]}
              badge={pageContent.badge}
              pagePositionStyle={pagePositionStyle}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* 브레드크럼 */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                <Link href="/" className="hover:text-black">홈</Link>
                <ChevronRight size={12} />
                <Link href="/" className="hover:text-black">프로그램</Link>
                <ChevronRight size={12} />
                <span className="text-black font-bold">{productName}</span>
              </div>

              {/* 타이틀 */}
              <div className="mb-4">
                <h1 className="text-xl font-black text-black leading-tight mb-1.5 break-keep">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500">
                    <span
                      className="inline-block"
                      data-admin-editable="product_name"
                      data-admin-page-position-field="productName"
                      style={pagePositionStyle("productName")}
                    >
                      {productName}
                    </span>
                  </span>
                </h1>
                <p className="text-sm text-slate-600 font-medium break-keep">
                  <span
                    className="inline-block"
                    data-admin-page-field="subtitle"
                    data-admin-page-position-field="subtitle"
                    style={pagePositionStyle("subtitle")}
                  >
                    {pageContent.subtitle}
                  </span>
                </p>
              </div>

              {/* 가격 + 구성품 */}
              <div
                className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0_0_black] mb-4"
                data-admin-page-position-field="infoCard"
                style={pagePositionStyle("infoCard")}
              >
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-xl font-black text-black">{formatPrice(paperPrice)}원</span>
                  {paperOpt?.original_price && paperOpt.original_price > paperPrice && (
                    <>
                      <span className="text-xs text-slate-400 line-through">{formatPrice(paperOpt.original_price)}원</span>
                      {paperDiscount !== null && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">{paperDiscount}% OFF</span>
                      )}
                    </>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-xs text-black" data-admin-page-field="infoTitle">
                      {pageContent.infoTitle}
                    </span>
                  </div>
                  <p className="mb-1.5 text-[11px] text-slate-600" data-admin-page-field="infoBody">
                    {pageContent.infoBody}
                  </p>
                  <ul className="space-y-0.5 text-[11px] text-slate-600 pl-5">
                    <li className="list-disc">AI 이미지 분석 + 추천 향 시향지</li>
                    <li className="list-disc">분석 결과 리포트 제공</li>
                    <li className="list-disc">주문 후 2~3일 내 배송</li>
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleStartClick}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                data-admin-page-position-field="ctaButton"
                style={pagePositionStyle("ctaButton")}
              >
                <span data-admin-page-field="ctaLabel">{pageContent.ctaLabel}</span>
              </button>
              <p className="text-center text-xs text-slate-500 mt-2">
                ✨ 시향지로 향을 먼저 확인하고, 마음에 들면 향수로!
              </p>
            </motion.div>
          </div>
        </section>

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
                    <span className="font-bold text-xs">AI 이미지 분석</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Palette size={14} className="text-cyan-400" />
                    <span className="font-bold text-xs">추천 향 시향</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileCheck size={14} className="text-cyan-400" />
                    <span className="font-bold text-xs">분석 리포트</span>
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
                    이렇게 진행돼요
                  </motion.h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { step: "01", title: "이미지 업로드", desc: "분석할 사진을 올려요", icon: Camera, color: "bg-yellow-400" },
                    { step: "02", title: "AI 분석", desc: "이미지로 향을 추천", icon: FileText, color: "bg-orange-400" },
                    { step: "03", title: "시향지 수령", desc: "추천 향을 시향지로", icon: Zap, color: "bg-pink-400" },
                    { step: "04", title: "향수로 구매", desc: "마음에 들면 정식 향수로", icon: Gift, color: "bg-purple-400" },
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
