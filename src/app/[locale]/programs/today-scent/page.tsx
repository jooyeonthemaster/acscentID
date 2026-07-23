"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Star, X, ChevronRight, ShoppingCart, Sparkles,
  Package, Truck, Droplets, Share2, FileText,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
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

  const pageBody = (
    <>
      {/* ============================================
          HERO - 오늘의 향 비주얼 + 구매
      ============================================ */}
      <section className="pt-28 pb-10 px-4">
        <div className="w-full max-w-[455px] mx-auto">
          {/* 향 비주얼 카드 (테마 컬러) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative border border-[var(--line)] rounded-[6px] overflow-hidden mb-5"
            style={{ backgroundColor: scent.theme.bg, color: scent.theme.ink }}
          >
            <div className="absolute top-3 left-3 z-10 flex gap-2">
              <span className="px-2 py-0.5 bg-white text-[var(--ink)] text-[10px] lg:text-[12px] font-black rounded-[3px] border border-[var(--line)]">
                {t('programs.detail.todayScent.todayScentLabel')}
              </span>
              <span className="px-2 py-0.5 bg-white text-[var(--ink)] text-[10px] lg:text-[12px] font-black rounded-[3px] border border-[var(--line)]">
                SIGNATURE
              </span>
            </div>
            <div className="aspect-square flex flex-col items-center justify-center px-6 text-center">
              <div className="text-[88px] leading-none">{scent.emoji}</div>
              <h2 className="mt-5 text-2xl font-black leading-tight">{scent.name}</h2>
              <p className="mt-2 text-sm lg:text-base font-semibold opacity-75">{scent.vibe}</p>
              {/* 노트 */}
              <div
                className="mt-5 w-full max-w-[300px] rounded-[4px] border border-[var(--line)] px-4 py-3 flex justify-around"
                style={{ backgroundColor: "rgba(255,255,255,0.55)" }}
              >
                {[
                  { k: t('programs.detail.todayScent.noteTop'), v: scent.notes.top },
                  { k: t('programs.detail.todayScent.noteMid'), v: scent.notes.mid },
                  { k: t('programs.detail.todayScent.noteBase'), v: scent.notes.base },
                ].map((n) => (
                  <div key={n.k} className="flex-1">
                    <div className="text-[10px] lg:text-[12px] font-bold opacity-60">{n.k}</div>
                    <div className="text-xs lg:text-sm font-black mt-1">{n.v}</div>
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
            <div className="flex items-center gap-1.5 text-xs lg:text-sm text-[var(--muted-ink)] mb-3">
              <Link href="/" className="hover:text-[var(--ink)]">{t('programs.breadcrumbHome')}</Link>
              <ChevronRight size={12} />
              <span>{t('programs.detail.todayScent.todayScentLabel')}</span>
              <ChevronRight size={12} />
              <span className="text-[var(--ink)] font-bold">{scent.name}</span>
            </div>

            {/* 타이틀 */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={14} className="fill-[var(--ink)] text-[var(--ink)]" />
                  ))}
                  <span className="text-xs lg:text-sm font-bold text-[var(--muted-ink)] ml-1">4.9 (1,204)</span>
                </div>
              </div>
              <h1 className="text-xl font-black text-[var(--ink)] leading-tight mb-1.5 break-keep">
                {scent.name}
                <span className="text-[var(--muted-ink)]"> · {t('programs.detail.todayScent.titleSuffix')}</span>
              </h1>
              <p className="text-sm lg:text-base text-[var(--muted-ink)] font-medium">
                {t('programs.detail.todayScent.subtitle')}
              </p>
            </div>

            {/* 키워드 태그 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {scent.keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 bg-[var(--soft)] text-[var(--muted-ink)] text-sm lg:text-base font-bold rounded-[3px] border border-[var(--line)]"
                >
                  #{kw}
                </span>
              ))}
            </div>

            {/* 용량 선택 */}
            <div className="mb-4">
              <p className="text-sm lg:text-base font-bold text-[var(--muted-ink)] mb-2">📦 {t('programs.detail.todayScent.selectSize')}</p>
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
                      className={`flex-1 p-3 rounded-[6px] border-2 text-center transition-all ${
                        active
                          ? "border-[var(--ink)] bg-white"
                          : "border-[var(--line)] bg-white hover:border-[var(--muted-ink)]"
                      }`}
                    >
                      <p className={`text-lg ${active ? "font-black text-[var(--ink)]" : "font-bold text-[var(--muted-ink)]"}`}>{size}</p>
                      <p className={`text-sm lg:text-base ${active ? "text-[var(--ink)]" : "text-[var(--muted-ink)]"}`}>{t('programs.detail.todayScent.priceWon', { price: formatPrice(p) })}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 가격 + 구성품 */}
            <div className="bg-white border border-[var(--line)] rounded-[6px] p-4 mb-4">
              <div className="flex items-end gap-2 mb-3">
                <span className="text-2xl font-black text-[var(--ink)]">{t('programs.detail.todayScent.priceWon', { price: formatPrice(price) })}</span>
                {originalPrice && originalPrice > price && (
                  <>
                    <span className="text-sm lg:text-base text-[var(--muted-ink)] line-through">{t('programs.detail.todayScent.priceWon', { price: formatPrice(originalPrice) })}</span>
                    {discount !== null && (
                      <span className="px-1.5 py-0.5 bg-[var(--accent-chem)] text-white text-[10px] lg:text-[12px] font-bold rounded-[3px]">{discount}% OFF</span>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm lg:text-base">
                <div className="flex items-center gap-2 text-[var(--muted-ink)]">
                  <Droplets size={16} className="text-[var(--ink)]" />
                  <span>{t('programs.detail.todayScent.perfumeItem', { name: scent.name, size: selectedSize })}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--muted-ink)]">
                  <FileText size={16} className="text-[var(--ink)]" />
                  <span>{t('programs.detail.todayScent.paperItem')}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--muted-ink)]">
                  <Truck size={16} className="text-[var(--ink)]" />
                  <span>{t('programs.detail.todayScent.shippingItem')}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handlePurchaseClick}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[5px] bg-[var(--ink)] py-3.5 text-base font-black text-white transition-all hover:bg-black disabled:opacity-50"
            >
              <ShoppingCart size={20} />
              {t('programs.detail.todayScent.buyNowWithScent')}
            </button>
            <button
              onClick={handleAddToCart}
              disabled={loading || addingToCart}
              className="w-full mt-2 py-3 bg-white text-[var(--ink)] font-black text-base rounded-[5px] border border-[var(--ink)] hover:bg-[var(--soft)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart size={20} />
              {addingToCart ? t('programs.detail.todayScent.addingToCart') : t('programs.detail.todayScent.addToCart')}
            </button>
            <p className="text-center text-xs lg:text-sm text-[var(--muted-ink)] mt-2">
              ✨ {t('programs.detail.todayScent.ctaCaption')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Feature Bar */}
      <section className="py-6 px-4 bg-white border-y border-[var(--line)]">
        <div className="w-full max-w-[455px] mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 text-[var(--ink)]">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-[var(--muted-ink)]" />
              <span className="font-bold text-xs lg:text-sm">{t('programs.detail.todayScent.featureSignature')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Package size={14} className="text-[var(--muted-ink)]" />
              <span className="font-bold text-xs lg:text-sm">{t('programs.detail.todayScent.featureFastShipping')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 향 설명 */}
      <section className="py-12 px-4 bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="w-full max-w-[455px] mx-auto"
        >
          <div className="text-center mb-8">
            <motion.div variants={fadeInUp} className="inline-block px-3 py-1.5 bg-[var(--soft)] text-[var(--ink)] text-xs lg:text-sm font-black rounded-[4px] border border-[var(--line)] mb-3">
              ✨ ABOUT
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-2xl font-black text-[var(--ink)] break-keep">
              {t('programs.detail.todayScent.aboutHeadingLine1', { name: scent.name })}<br />{t('programs.detail.todayScent.aboutHeadingLine2')}
            </motion.h2>
          </div>

          <div className="space-y-4">
            <motion.div variants={fadeInUp} className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{scent.emoji}</div>
                <div>
                  <h3 className="font-black text-[var(--ink)] mb-2">{scent.vibe}</h3>
                  <p className="text-[var(--muted-ink)] text-sm lg:text-base leading-relaxed">{scent.description}</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="bg-[var(--soft)] rounded-[6px] p-5 border border-[var(--line)]">
              <h3 className="font-black text-[var(--ink)] mb-3">🌿 {t('programs.detail.todayScent.scentNotesTitle')}</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { k: t('programs.detail.todayScent.topNote'), v: scent.notes.top },
                  { k: t('programs.detail.todayScent.midNote'), v: scent.notes.mid },
                  { k: t('programs.detail.todayScent.baseNote'), v: scent.notes.base },
                ].map((n) => (
                  <div key={n.k} className="bg-white border border-[var(--line)] rounded-[4px] p-3 text-center">
                    <div className="text-[10px] lg:text-[12px] font-bold text-[var(--muted-ink)]">{n.k}</div>
                    <div className="text-sm lg:text-base font-black text-[var(--ink)] mt-1">{n.v}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 다른 향 다시 뽑기 유도 */}
            <motion.div variants={fadeInUp}>
              <Link
                href="/#programs-section"
                className="flex items-center justify-center gap-2 w-full py-3 bg-white text-[var(--muted-ink)] rounded-[5px] border border-[var(--line)] hover:text-[var(--ink)] hover:border-[var(--muted-ink)] font-bold text-sm lg:text-base transition-all"
              >
                <Share2 size={16} />
                {t('programs.detail.todayScent.drawAgainTomorrow')}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </>
  )

  const mobileFixedBar = (
    <>
      {/* 하단 고정 구매 바 */}
      {!showLoginPrompt && !showAuthModal && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[455px] bg-white border-t border-[var(--line)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-[minmax(0,1fr)_52px_minmax(112px,1.1fr)] items-center gap-2">
            <div className="min-w-0">
              <div className="text-[15px] font-black text-[var(--ink)] leading-tight truncate">{t('programs.detail.todayScent.priceWon', { price: formatPrice(price) })}</div>
              <div className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-bold mt-0.5 truncate">{scent.name} · {selectedSize}</div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={loading || addingToCart}
              aria-label={t('programs.detail.todayScent.addToCart')}
              className="flex-shrink-0 w-12 h-12 bg-white text-[var(--ink)] rounded-[5px] border border-[var(--ink)] transition-all flex items-center justify-center disabled:opacity-50"
            >
              <ShoppingCart size={20} />
            </button>
            <button
              onClick={handlePurchaseClick}
              disabled={loading}
              className="flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-[5px] bg-[var(--ink)] px-3 text-sm lg:text-base font-black text-white transition-all hover:bg-black disabled:opacity-50"
            >
              {t('programs.detail.todayScent.buyNow')}
            </button>
          </div>
        </div>
      )}
      <div className="h-28" />
    </>
  )

  return (
    <>
      <ViewportSwitch
        mobile={
          <main className="relative min-h-screen bg-[var(--canvas)] font-wanted">
            <Header />
            {pageBody}
            {mobileFixedBar}
          </main>
        }
        desktop={
          <main className="relative min-h-screen bg-[var(--canvas)] pb-16 font-wanted">
            {pageBody}
            {/* 데스크탑: 고정 바 대신 인라인 구매 패널 */}
            <div className="mx-auto mt-4 w-full max-w-[455px] px-4">
              <div className="rounded-[6px] border border-[var(--line)] bg-white p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_52px_minmax(112px,1.1fr)] items-center gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-black text-[var(--ink)] leading-tight truncate">{t('programs.detail.todayScent.priceWon', { price: formatPrice(price) })}</div>
                    <div className="text-[10px] lg:text-[12px] text-[var(--muted-ink)] font-bold mt-0.5 truncate">{scent.name} · {selectedSize}</div>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    disabled={loading || addingToCart}
                    aria-label={t('programs.detail.todayScent.addToCart')}
                    className="flex-shrink-0 w-12 h-12 bg-white text-[var(--ink)] rounded-[5px] border border-[var(--ink)] transition-all flex items-center justify-center hover:bg-[var(--soft)] disabled:opacity-50"
                  >
                    <ShoppingCart size={20} />
                  </button>
                  <button
                    onClick={handlePurchaseClick}
                    disabled={loading}
                    className="flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-[5px] bg-[var(--ink)] px-3 text-sm lg:text-base font-black text-white transition-all hover:bg-black disabled:opacity-50"
                  >
                    {t('programs.detail.todayScent.buyNow')}
                  </button>
                </div>
              </div>
            </div>
          </main>
        }
      />

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
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-w-sm mx-auto bg-white rounded-[6px] shadow-lg overflow-hidden border border-[var(--line)]"
            >
              <div className="relative p-6 pb-4 text-center bg-white">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--soft)] transition-colors"
                >
                  <X size={20} className="text-[var(--muted-ink)]" />
                </button>
                <div className="w-16 h-16 mx-auto mb-4 bg-[var(--soft)] rounded-[6px] flex items-center justify-center border border-[var(--line)]">
                  <span className="text-3xl">🦆</span>
                </div>
                <h2 className="text-xl font-black text-[var(--ink)] mb-2">{t('programs.detail.todayScent.loginModalTitle')}</h2>
                <p className="text-sm lg:text-base text-[var(--muted-ink)] leading-relaxed">
                  {t('programs.detail.todayScent.loginModalDescLine1')}<br />
                  <span className="font-bold text-[var(--ink)]">{t('programs.detail.todayScent.loginModalDescHighlight')}</span>{t('programs.detail.todayScent.loginModalDescLine2')}
                </p>
              </div>
              <div className="px-6 py-4 bg-[var(--soft)] border-y border-[var(--line)]">
                <div className="space-y-2 text-sm lg:text-base">
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--ink)] font-bold">✓</span>
                    <span className="text-[var(--muted-ink)]">{t('programs.detail.todayScent.loginBenefit1')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--ink)] font-bold">✓</span>
                    <span className="text-[var(--muted-ink)]">{t('programs.detail.todayScent.loginBenefit2')}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[var(--ink)] font-bold">!</span>
                    <span className="text-[var(--muted-ink)]">{t('programs.detail.todayScent.loginBenefit3')}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full h-14 bg-[var(--ink)] text-white rounded-[5px] font-bold text-lg transition-all hover:bg-black"
                >
                  {t('programs.detail.todayScent.loginSignup')}
                </button>
                <button
                  onClick={handleGuestPurchase}
                  className="w-full h-12 bg-white text-[var(--muted-ink)] rounded-[5px] font-semibold border border-[var(--line)] hover:bg-[var(--soft)] hover:text-[var(--ink)] transition-all flex items-center justify-center gap-2"
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
    </>
  )
}

export default function TodayScentProductPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[var(--line)] border-t-[var(--ink)] rounded-full animate-spin" />
        </div>
      }
    >
      <TodayScentProductContent />
    </Suspense>
  )
}
