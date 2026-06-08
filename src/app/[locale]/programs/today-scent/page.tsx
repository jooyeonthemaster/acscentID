"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Star, X, ChevronRight, ShoppingCart, Sparkles,
  Package, Truck, Droplets, Share2,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { AuthModal } from "@/components/auth/AuthModal"
import { useProductPricing } from "@/hooks/useProductPricing"
import { formatPrice } from "@/types/cart"
import { TODAY_SCENTS, getScentById, type TodayScent } from "@/lib/today-scent/scents"
import { getDrawnToday } from "@/lib/today-scent/draw"
import { setMobileOverlayOpen } from "@/lib/mobile-overlay"
import { emitCartChanged } from "@/lib/cart-events"
import { STORE_PRODUCT_IMAGE } from "@/lib/products/store-products"

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

function TodayScentProductContent() {
  const t = useTranslations()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const { getOption } = useProductPricing()

  const scentParam = searchParams.get("scent")

  // 향 결정: URL 파라미터 우선 → 오늘 뽑은 향 → 기본값
  const scent = useMemo<TodayScent>(() => {
    if (scentParam) {
      const s = getScentById(scentParam)
      if (s) return s
    }
    const drawn = getDrawnToday()
    return drawn || TODAY_SCENTS[0]
  }, [scentParam])

  // 오늘의 향 전용 가격(today_scent). 기본값은 image_analysis와 동일(10ml 24,000 / 50ml 48,000).
  const [selectedSize, setSelectedSize] = useState<"10ml" | "50ml">("10ml")
  const opt10 = getOption("today_scent", "10ml")
  const opt50 = getOption("today_scent", "50ml")
  const currentOpt = selectedSize === "10ml" ? opt10 : opt50
  const currentImage = currentOpt?.image_url || STORE_PRODUCT_IMAGE
  const price = currentOpt?.price ?? (selectedSize === "10ml" ? 24000 : 48000)
  const originalPrice = currentOpt?.original_price ?? null
  const discount = (price && originalPrice && originalPrice > price)
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null

  const isLoggedIn = !!(user || unifiedUser)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    setMobileOverlayOpen('today-scent-purchase-prompt', showLoginPrompt)
    return () => setMobileOverlayOpen('today-scent-purchase-prompt', false)
  }, [showLoginPrompt])

  const checkoutUrl = useMemo(
    () => `/checkout?product=today-scent&type=signature&scent=${scent.id}&size=${selectedSize}`,
    [scent.id, selectedSize]
  )

  const handlePurchaseClick = () => {
    if (loading) return
    if (isLoggedIn) {
      router.push(checkoutUrl)
    } else {
      setShowLoginPrompt(true)
    }
  }

  const handleGuestPurchase = () => {
    router.push(`${checkoutUrl}&guest=true`)
  }

  const [addingToCart, setAddingToCart] = useState(false)

  const handleAddToCart = async () => {
    if (loading || addingToCart) return
    if (!isLoggedIn) {
      setShowLoginPrompt(true)
      return
    }
    setAddingToCart(true)
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: "today_scent",
          perfume_name: `${scent.name} · ${t('programs.detail.todayScent.todayScentLabel')}`,
          perfume_brand: "AC'SCENT",
          size: selectedSize,
          price,
          image_url: currentImage,
          analysis_data: {
            matchingPerfumes: [{
              perfumeId: scent.id,
              persona: { name: `${scent.name} · ${t('programs.detail.todayScent.todayScentLabel')}`, recommendation: scent.vibe },
            }],
            matchingKeywords: scent.keywords,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('programs.detail.todayScent.cartAddFailed'))
      emitCartChanged()
      alert(t('programs.detail.todayScent.cartAddSuccess'))
    } catch (e) {
      alert(e instanceof Error ? e.message : t('programs.detail.todayScent.cartAddFailed'))
    } finally {
      setAddingToCart(false)
    }
  }

  const handleLoginClick = () => {
    setShowLoginPrompt(false)
    setShowAuthModal(true)
  }

  return (
    <main className="relative min-h-screen bg-[#FFFDF5] font-sans">
      <Header />

      {/* ============================================
          HERO - 오늘의 향 비주얼 + 구매
      ============================================ */}
      <section className="pt-28 pb-10 px-4">
        <div className="w-full max-w-[455px] mx-auto">
          {/* 향 비주얼 카드 (테마 컬러) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black] mb-5"
            style={{ backgroundColor: scent.theme.bg, color: scent.theme.ink }}
          >
            <div className="absolute top-3 left-3 z-10 flex gap-2">
              <span className="px-2 py-0.5 bg-black text-white text-[10px] font-black rounded-full border-2 border-black">
                {t('programs.detail.todayScent.todayScentLabel')}
              </span>
              <span className="px-2 py-0.5 bg-white text-black text-[10px] font-black rounded-full border-2 border-black">
                SIGNATURE
              </span>
            </div>
            <div className="aspect-square flex flex-col items-center justify-center px-6 text-center">
              <div className="text-[88px] leading-none">{scent.emoji}</div>
              <h2 className="mt-5 text-2xl font-black leading-tight">{scent.name}</h2>
              <p className="mt-2 text-sm font-semibold opacity-75">{scent.vibe}</p>
              {/* 노트 */}
              <div
                className="mt-5 w-full max-w-[300px] rounded-xl border-2 border-black px-4 py-3 flex justify-around"
                style={{ backgroundColor: "rgba(255,255,255,0.55)" }}
              >
                {[
                  { k: t('programs.detail.todayScent.noteTop'), v: scent.notes.top },
                  { k: t('programs.detail.todayScent.noteMid'), v: scent.notes.mid },
                  { k: t('programs.detail.todayScent.noteBase'), v: scent.notes.base },
                ].map((n) => (
                  <div key={n.k} className="flex-1">
                    <div className="text-[10px] font-bold opacity-60">{n.k}</div>
                    <div className="text-xs font-black mt-1">{n.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 제품 정보 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* 브레드크럼 */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
              <Link href="/" className="hover:text-black">{t('programs.breadcrumbHome')}</Link>
              <ChevronRight size={12} />
              <span className="hover:text-black">{t('programs.detail.todayScent.todayScentLabel')}</span>
              <ChevronRight size={12} />
              <span className="text-black font-bold">{scent.name}</span>
            </div>

            {/* 타이틀 */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-1">4.9 (1,204)</span>
                </div>
              </div>
              <h1 className="text-xl font-black text-black leading-tight mb-1.5 break-keep">
                {scent.name}
                <span className="text-slate-500"> · {t('programs.detail.todayScent.titleSuffix')}</span>
              </h1>
              <p className="text-sm text-slate-600 font-medium">
                {t('programs.detail.todayScent.subtitle')}
              </p>
            </div>

            {/* 키워드 태그 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {scent.keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-bold rounded-full border border-slate-300"
                >
                  #{kw}
                </span>
              ))}
            </div>

            {/* 용량 선택 */}
            <div className="mb-4">
              <p className="text-sm font-bold text-slate-700 mb-2">📦 {t('programs.detail.todayScent.selectSize')}</p>
              <div className="flex gap-3">
                {([
                  { size: "10ml" as const, opt: opt10, fallback: 24000 },
                  { size: "50ml" as const, opt: opt50, fallback: 48000 },
                ]).map(({ size, opt, fallback }) => {
                  const active = selectedSize === size
                  const p = opt?.price ?? fallback
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                        active
                          ? "border-black bg-white shadow-[3px_3px_0_0_black]"
                          : "border-slate-200 bg-white/50 hover:border-black"
                      }`}
                    >
                      <p className={`text-lg ${active ? "font-black text-black" : "font-bold text-slate-600"}`}>{size}</p>
                      <p className={`text-sm ${active ? "text-slate-600" : "text-slate-400"}`}>{t('programs.detail.todayScent.priceWon', { price: formatPrice(p) })}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 가격 + 구성품 */}
            <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[3px_3px_0_0_black] mb-4">
              <div className="flex items-end gap-2 mb-3">
                <span className="text-2xl font-black text-black">{t('programs.detail.todayScent.priceWon', { price: formatPrice(price) })}</span>
                {originalPrice && originalPrice > price && (
                  <>
                    <span className="text-sm text-slate-400 line-through">{t('programs.detail.todayScent.priceWon', { price: formatPrice(originalPrice) })}</span>
                    {discount !== null && (
                      <span className="px-1.5 py-0.5 bg-black text-white text-[10px] font-bold rounded">{discount}% OFF</span>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Droplets size={16} className="text-black" />
                  <span>{t('programs.detail.todayScent.perfumeItem', { name: scent.name, size: selectedSize })}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Truck size={16} className="text-black" />
                  <span>{t('programs.detail.todayScent.shippingItem')}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handlePurchaseClick}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-black py-3.5 text-base font-black text-white shadow-[3px_3px_0_0_#cbd5e1] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#cbd5e1] disabled:opacity-50"
            >
              <ShoppingCart size={20} />
              {t('programs.detail.todayScent.buyNowWithScent')}
            </button>
            <button
              onClick={handleAddToCart}
              disabled={loading || addingToCart}
              className="w-full mt-2 py-3 bg-white text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart size={20} />
              {addingToCart ? t('programs.detail.todayScent.addingToCart') : t('programs.detail.todayScent.addToCart')}
            </button>
            <p className="text-center text-xs text-slate-500 mt-2">
              ✨ {t('programs.detail.todayScent.ctaCaption')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Feature Bar */}
      <section className="py-6 px-4 bg-black">
        <div className="w-full max-w-[455px] mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 text-white">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span className="font-bold text-xs">{t('programs.detail.todayScent.featureSignature')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package size={14} className="text-amber-400" />
              <span className="font-bold text-xs">{t('programs.detail.todayScent.featureFastShipping')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 향 설명 */}
      <section className="py-12 px-4 bg-[#FFFDF5]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full max-w-[455px] mx-auto"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-amber-400 text-white text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0_0_black] mb-3">
              ✨ ABOUT
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-black break-keep">
              {t('programs.detail.todayScent.aboutHeadingLine1', { name: scent.name })}<br />{t('programs.detail.todayScent.aboutHeadingLine2')}
            </motion.h2>
          </div>

          <div className="space-y-4">
            <motion.div variants={fadeInUp} className="bg-white rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{scent.emoji}</div>
                <div>
                  <h3 className="font-black text-slate-900 mb-2">{scent.vibe}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{scent.description}</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border-2 border-black shadow-[4px_4px_0_0_black]">
              <h3 className="font-black text-slate-900 mb-3">🌿 {t('programs.detail.todayScent.scentNotesTitle')}</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: t('programs.detail.todayScent.topNote'), v: scent.notes.top },
                  { k: t('programs.detail.todayScent.midNote'), v: scent.notes.mid },
                  { k: t('programs.detail.todayScent.baseNote'), v: scent.notes.base },
                ].map((n) => (
                  <div key={n.k} className="bg-white border-2 border-black rounded-xl p-3 text-center shadow-[2px_2px_0_0_black]">
                    <div className="text-[10px] font-bold text-slate-400">{n.k}</div>
                    <div className="text-sm font-black text-slate-900 mt-1">{n.v}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 다른 향 다시 뽑기 유도 */}
            <motion.div variants={fadeInUp}>
              <Link
                href="/#programs-section"
                className="flex items-center justify-center gap-2 w-full py-3 bg-white text-slate-700 rounded-xl border-2 border-slate-300 hover:border-black font-bold text-sm transition-all"
              >
                <Share2 size={16} />
                {t('programs.detail.todayScent.drawAgainTomorrow')}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* 하단 고정 구매 바 */}
      {!showLoginPrompt && !showAuthModal && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[455px] bg-white border-t-2 border-black px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="grid grid-cols-[minmax(0,1fr)_52px_minmax(112px,1.1fr)] items-center gap-2">
            <div className="min-w-0">
              <div className="text-[15px] font-black text-black leading-tight truncate">{t('programs.detail.todayScent.priceWon', { price: formatPrice(price) })}</div>
              <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">{scent.name} · {selectedSize}</div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={loading || addingToCart}
              aria-label={t('programs.detail.todayScent.addToCart')}
              className="flex-shrink-0 w-12 h-12 bg-white text-black rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center disabled:opacity-50"
            >
              <ShoppingCart size={20} />
            </button>
            <button
              onClick={handlePurchaseClick}
              disabled={loading}
              className="flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 border-black bg-black px-3 text-sm font-black text-white shadow-[3px_3px_0_0_#cbd5e1] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#cbd5e1] disabled:opacity-50"
            >
              {t('programs.detail.todayScent.buyNow')}
            </button>
          </div>
        </div>
      )}
      <div className="h-28" />

      {/* 로그인 안내 모달 */}
      <AnimatePresence>
        {showLoginPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginPrompt(false)}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-w-sm mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-black"
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
                <h2 className="text-xl font-black text-slate-900 mb-2">{t('programs.detail.todayScent.loginModalTitle')}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t('programs.detail.todayScent.loginModalDescLine1')}<br />
                  <span className="font-bold text-amber-600">{t('programs.detail.todayScent.loginModalDescHighlight')}</span>{t('programs.detail.todayScent.loginModalDescLine2')}
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-y-2 border-black">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('programs.detail.todayScent.loginBenefit1')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span className="text-slate-600">{t('programs.detail.todayScent.loginBenefit2')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">!</span>
                    <span className="text-slate-600">{t('programs.detail.todayScent.loginBenefit3')}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-black text-white rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_#cbd5e1] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#cbd5e1] transition-all border-2 border-black"
                >
                  {t('programs.detail.todayScent.loginSignup')}
                </button>
                <button
                  onClick={handleGuestPurchase}
                  className="w-full h-12 bg-white text-slate-600 rounded-2xl font-semibold border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
                >
                  <span>{t('programs.detail.todayScent.guestPurchase')}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath={checkoutUrl}
      />
    </main>
  )
}

export default function TodayScentProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-amber-400 rounded-full animate-spin" />
        </div>
      }
    >
      <TodayScentProductContent />
    </Suspense>
  )
}
