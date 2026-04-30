"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ChevronLeft, Search, Gift, Handshake } from "lucide-react"
import { Header } from "@/components/layout/Header"
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { PopupModal } from "@/components/home/PopupModal"
import { useBanners, useActiveProducts, useProductImages } from "@/hooks/useAdminContent"
import { useProductPricing } from "@/hooks/useProductPricing"
import type { ProductType } from "@/types/cart"

export default function Home() {
  const router = useRouter()
  const t = useTranslations()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)
  const { banners, loading: bannersLoading } = useBanners()
  const { isProductActive } = useActiveProducts()
  const { getOptions } = useProductPricing()

  // 각 상품의 DB 이미지 로드 (관리자 업로드 이미지 우선)
  const { imageUrls: idolImages, loading: idolLoading } = useProductImages('idol-image')
  const { imageUrls: figureImages, loading: figureLoading } = useProductImages('figure')
  const { imageUrls: chemistryImages, loading: chemistryLoading } = useProductImages('chemistry')
  const productImagesLoading = idolLoading || figureLoading || chemistryLoading

  // 가격은 DB 의 가장 저렴한 활성 옵션 (priceRange 표시용)
  const minPrice = (productType: ProductType) => {
    const opts = getOptions(productType)
    if (opts.length === 0) return null
    return opts.reduce<{ price: number; original_price: number | null }>(
      (acc, o) => (o.price < acc.price ? { price: o.price, original_price: o.original_price } : acc),
      { price: opts[0].price, original_price: opts[0].original_price }
    )
  }
  const idolPrice = minPrice('image_analysis')
  const figurePrice = minPrice('figure_diffuser')
  const chemistryPrice = minPrice('chemistry_set')

  const computeBadge = (p: { price: number; original_price: number | null } | null, fallback: string) => {
    if (!p || !p.original_price || p.original_price <= p.price) return fallback
    const pct = Math.round(((p.original_price - p.price) / p.original_price) * 100)
    return `${pct}% OFF`
  }

  // 상품 데이터 (번역 키 사용)
  const ALL_PRODUCTS = [
    {
      id: "idol-image",
      title: t('products.idolImage'),
      subtitle: t('programs.subtitle.idolImage'),
      image: productImagesLoading ? null : (idolImages[0] || "/images/perfume/KakaoTalk_20260125_225218071.jpg"),
      price: idolPrice?.price ?? 24000,
      originalPrice: idolPrice?.original_price ?? null,
      priceRange: true,
      delivery: t('shipping.estimated'),
      badge: computeBadge(idolPrice, "SALE"),
      badgeColor: "bg-[#FF6B9D]",
      href: "/programs/idol-image"
    },
    {
      id: "figure",
      title: t('products.figureDiffuser'),
      subtitle: t('programs.subtitle.figure'),
      image: productImagesLoading ? null : (figureImages[0] || "/images/diffuser/KakaoTalk_20260125_225229624.jpg"),
      price: figurePrice?.price ?? 48000,
      originalPrice: figurePrice?.original_price ?? null,
      delivery: t('shipping.afterProduction'),
      badge: computeBadge(figurePrice, "NEW"),
      badgeColor: "bg-[#A78BFA]",
      href: "/programs/figure"
    },
    {
      id: "chemistry",
      title: t('products.chemistry'),
      subtitle: t('programs.subtitle.chemistry'),
      image: productImagesLoading ? null : (chemistryImages[0] || "/images/chemistry/chemistry-thumbnail.jpg"),
      price: chemistryPrice?.price ?? 38000,
      originalPrice: chemistryPrice?.original_price ?? null,
      priceRange: true,
      delivery: t('shipping.estimated'),
      badge: "SEASON 3",
      badgeColor: "bg-[#F472B6]",
      href: "/programs/chemistry"
    },
  ]

  // 활성화된 상품만 필터링
  const PRODUCTS = ALL_PRODUCTS.filter((p) => isProductActive(p.id))

  const handleCardClick = (href: string) => {
    router.push(href)
  }

  // 히어로 슬라이드 (동적 배너)
  const heroSlideCount = banners.length || 1

  // 슬라이드 네비게이션
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlideCount)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlideCount) % heroSlideCount)
  }

  // 드래그 핸들러
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number } }) => {
    setIsDragging(false)
    const threshold = 50
    if (info.offset.x < -threshold) {
      nextSlide()
    } else if (info.offset.x > threshold) {
      prevSlide()
    }
  }

  return (
    <div className="min-h-screen bg-[#FCD34D] font-sans selection:bg-yellow-200 selection:text-yellow-900">
      <PopupModal />
      <Header />

      {/* 메인 컨텐츠 */}
      <main className="pt-[84px]">
        <div className="w-full max-w-[455px] mx-auto">

          {/* ===== 히어로 슬라이드 섹션 ===== */}
          <section className={`sticky top-[84px] z-0 w-full overflow-hidden md:overflow-visible transition-opacity duration-300 ${bannersLoading ? 'opacity-0' : 'opacity-100'}`}>
            {/* 슬라이드 컨테이너 */}
            <div className="relative h-[420px] flex items-center justify-center">
              {/* 슬라이드 */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentSlide}
                  ref={slideRef}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                  onClick={() => {
                    if (!isDragging && banners[currentSlide]?.link_url) {
                      router.push(banners[currentSlide].link_url!)
                    }
                  }}
                >
                  {/* 슬라이드 배경 이미지 (동적 배너) */}
                  <div className="absolute inset-0">
                    <Image
                      src={banners[currentSlide]?.image_url || '/images/hero/1.jpg'}
                      alt={banners[currentSlide]?.title || 'hero background'}
                      fill
                      className="object-cover"
                      style={{ objectPosition: 'center center' }}
                      priority
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* 좌우 네비게이션 버튼 */}
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#000] hover:bg-white transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                <ChevronLeft size={20} className="text-slate-900" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_#000] hover:bg-white transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                <ChevronRight size={20} className="text-slate-900" />
              </button>

              <div className="absolute bottom-32 md:bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentSlide
                      ? 'bg-white w-6 shadow-md'
                      : 'bg-white/50 hover:bg-white/70'
                      }`}
                  />
                ))}
              </div>

            </div>
          </section>


          {/* Wrapper for Sticky Control */}
          <div className="relative">
            {/* ===== 프로그램 둘러보기 섹션 ===== */}
            <section id="programs-section" className="bg-white px-4 pt-8 pb-[180px] rounded-t-[32px] -mt-[100px] md:-mt-[60px] sticky top-[84px] z-10 min-h-[50vh] border-2 border-slate-900 border-b-0">
              {/* 섹션 타이틀 */}
              <div className="flex items-center gap-2 mb-6">
                <Search size={20} className="text-slate-900" />
                <h2 className="text-lg font-black text-slate-900">{t('home.browsePrograms')}</h2>
              </div>

              {/* 2열 그리드 카드 */}
              <div className="grid grid-cols-2 gap-3">
                {PRODUCTS.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleCardClick(product.href)}
                    className="group cursor-pointer"
                  >
                    <div className="relative bg-[#FEF3C7] rounded-2xl border-2 border-slate-900 overflow-hidden shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                      {/* 카드 이미지 */}
                      <div className="relative aspect-square overflow-hidden">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full animate-pulse bg-gradient-to-br from-yellow-100 to-amber-100" />
                        )}
                        {/* 뱃지 */}
                        {product.badge && (
                          <div className={`absolute top-2 left-2 px-2 py-0.5 ${product.badgeColor} text-white text-[8px] font-black rounded-full`}>
                            {product.badge}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 카드 타이틀 (카드 밖) */}
                    <div className="mt-5 px-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {product.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2 whitespace-pre-line">
                        {product.subtitle}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm font-bold text-slate-900">
                          {t('currency.symbol')}{product.price.toLocaleString()}{product.priceRange && '~'}
                        </span>
                        {product.originalPrice && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {t('currency.symbol')}{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <p className="text-[9px] font-medium mt-1 text-emerald-600">
                        {product.delivery}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

            </section>
            {/* Sticky Track Spacer */}
            <div className="h-[150px] w-full" />
          </div>

          {/* ===== 상품 둘러보기 섹션 (New) ===== */}
          {/* TEMP: 잠깐 숨김 처리 (2026-04-30) — 다시 켤 때 이 false → true */}
          {false && (
          <section className="bg-white px-4 pt-12 pb-32 rounded-t-[32px] -mt-[150px] relative z-20 min-h-[60vh] border-2 border-slate-900 border-b-0">
            <div className="flex items-center gap-2 mb-6">
              <Gift size={20} className="text-slate-900" />
              <h2 className="text-lg font-black text-slate-900">{t('home.browseProducts')}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Product Card 1 - LE QUACK Signature (Coming Soon) */}
              <div className="relative group cursor-default">
                <div className="relative bg-[#FEF3C7] rounded-2xl border-2 border-slate-900 overflow-hidden shadow-[4px_4px_0px_#000]">
                  <div className="relative aspect-square overflow-hidden bg-slate-200 flex items-center justify-center">
                    <div className="relative w-full h-full grayscale-[0.3]">
                      <Image
                        src="/images/perfume/LE QUACK.avif"
                        alt={t('products.leQuack')}
                        fill
                        className="object-cover blur-sm"
                      />
                      {/* Coming Soon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
                        <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg transform -rotate-12 border-2 border-white">
                          {t('home.comingSoon')}
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500/50 text-white text-[8px] font-black rounded-full z-10">
                      SIGNATURE
                    </div>
                  </div>
                </div>
                <div className="mt-2 px-1 opacity-50">
                  <h3 className="font-bold text-slate-900 text-sm truncate">
                    {t('products.leQuack')}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {t('home.signaturePerfumDesc')}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-sm font-bold text-slate-900">{t('currency.symbol')}34,000</span>
                    <span className="text-[10px] text-slate-400 line-through">{t('currency.symbol')}45,000</span>
                  </div>
                </div>
              </div>

              {/* Product Card 2 - Custom Duck Case (Disabled) */}
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-slate-400 font-light underline underline-offset-4 decoration-wavy decoration-yellow-400">
                {t('home.moreProducts')}
              </p>
            </div>
          </section>
          )}

          {/* ===== 콜라보 & 협업 문의 섹션 ===== */}
          <section className="bg-white px-4 pt-12 pb-32 rounded-t-[32px] -mt-[100px] relative z-30 min-h-[40vh] border-2 border-slate-900 border-b-0">
            <div className="flex items-center gap-2 mb-6">
              <Handshake size={20} className="text-slate-900" />
              <h2 className="text-lg font-black text-slate-900">{t('home.collaboration')}</h2>
            </div>

            {/* 협업 소개 */}
            <div className="bg-slate-900 rounded-2xl p-5 shadow-[4px_4px_0px_#FCD34D]">
              <p className="text-white text-sm font-medium mb-4 whitespace-pre-line">
                {t('home.collaborationDesc')}
              </p>

              {/* 협업 아이템 */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2.5">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                  <span className="text-xs text-white/90">{t('home.collaborationItem1')}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2.5">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                  <span className="text-xs text-white/90">{t('home.collaborationItem2')}</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2.5">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                  <span className="text-xs text-white/90">{t('home.collaborationItem3')}</span>
                </div>
              </div>

              {/* CTA 버튼 */}
              <Link
                href="/collaboration"
                className="block w-full bg-[#FCD34D] text-slate-900 text-center font-bold text-sm py-3 rounded-xl border-2 border-slate-900 hover:bg-yellow-300 transition-colors"
              >
                {t('home.viewCollaboration')}
              </Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
