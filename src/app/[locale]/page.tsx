"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ChevronLeft, Search, Gift, Handshake } from "lucide-react"
import { Header } from "@/components/layout/Header"
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { PopupModal } from "@/components/home/PopupModal"
import { TodayScentDraw } from "@/components/home/TodayScentDraw"
import { useBanners, useActiveProducts, useProductThumbnailMap } from "@/hooks/useAdminContent"
import { useProductPricing } from "@/hooks/useProductPricing"
import { useStoreProducts } from "@/hooks/useStoreProducts"
import { useStoreProductText } from "@/hooks/useStoreProductText"
import { isScentPaperSize, type ProductType } from "@/types/cart"
import { STORE_PRODUCT_TYPE } from "@/lib/products/store-products"

export default function Home() {
  const router = useRouter()
  const t = useTranslations()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const slideRef = useRef<HTMLDivElement>(null)
  const { banners, loading: bannersLoading } = useBanners()
  const { isProductActive, isProductVisible, getProductBadge } = useActiveProducts()
  // 오늘의 향 섹션: admin_products 행이 없으면 기본 노출, 있으면 is_active 따름
  const showTodayScent = isProductVisible('today-scent')
  const { getOptions } = useProductPricing()
  const { products: storeProducts } = useStoreProducts()
  const storeText = useStoreProductText()

  // 상품관리 이미지의 첫 번째 사진이 메인 썸네일입니다.
  const { thumbnails, loading: thumbnailsLoading } = useProductThumbnailMap()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 가격은 DB 의 가장 저렴한 활성 옵션 (priceRange 표시용)
  // 시향지(저가 애드온)는 본 상품 최소가가 아니므로 제외한다.
  const minPrice = (productType: ProductType) => {
    const opts = getOptions(productType).filter((o) => !isScentPaperSize(o.size))
    if (opts.length === 0) return null
    return opts.reduce<{ price: number; original_price: number | null }>(
      (acc, o) => (o.price < acc.price ? { price: o.price, original_price: o.original_price } : acc),
      { price: opts[0].price, original_price: opts[0].original_price }
    )
  }
  const idolPrice = minPrice('image_analysis')
  const figurePrice = minPrice('figure_diffuser')
  const graduationPrice = minPrice('graduation')
  const personalPrice = minPrice('personal_scent')
  const chemistryPrice = minPrice('chemistry_set')
  const leQuackPrice = minPrice('signature')
  const storeProductPrice = (size: string, fallback: number) => getOptions(STORE_PRODUCT_TYPE).find((o) => o.size === size)?.price ?? fallback

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
      image: thumbnailsLoading ? null : (thumbnails["idol-image"] || null),
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
      image: thumbnailsLoading ? null : (thumbnails["figure"] || null),
      price: figurePrice?.price ?? 48000,
      originalPrice: figurePrice?.original_price ?? null,
      delivery: t('shipping.afterProduction'),
      badge: computeBadge(figurePrice, "NEW"),
      badgeColor: "bg-[#A78BFA]",
      href: "/programs/figure"
    },
    {
      id: "graduation",
      title: t('products.graduation'),
      subtitle: t('programs.subtitle.graduation'),
      image: thumbnailsLoading ? null : (thumbnails["graduation"] || null),
      price: graduationPrice?.price ?? 34000,
      originalPrice: graduationPrice?.original_price ?? null,
      delivery: t('shipping.estimated'),
      badge: computeBadge(graduationPrice, "LIMITED"),
      badgeColor: "bg-[#EF4444]",
      href: "/programs/graduation"
    },
    {
      id: "personal",
      title: t('products.personal'),
      subtitle: t('programs.subtitle.personal'),
      image: thumbnailsLoading ? null : (thumbnails["personal"] || null),
      price: personalPrice?.price ?? 24000,
      originalPrice: personalPrice?.original_price ?? null,
      priceRange: true,
      delivery: t('shipping.estimated'),
      badge: computeBadge(personalPrice, "SIGNATURE"),
      badgeColor: "bg-[#111827]",
      href: "/programs/personal"
    },
    {
      id: "chemistry",
      title: t('products.chemistry'),
      subtitle: t('programs.subtitle.chemistry'),
      image: thumbnailsLoading ? null : (thumbnails["chemistry"] || null),
      price: chemistryPrice?.price ?? 38000,
      originalPrice: chemistryPrice?.original_price ?? null,
      priceRange: true,
      delivery: t('shipping.estimated'),
      badge: "SEASON 3",
      badgeColor: "bg-[#F472B6]",
      href: "/programs/chemistry"
    },
    {
      id: "le-quack",
      title: t('products.leQuack'),
      subtitle: t('home.signaturePerfumDesc'),
      image: thumbnailsLoading ? null : (thumbnails["le-quack"] || null),
      price: leQuackPrice?.price ?? 34000,
      originalPrice: leQuackPrice?.original_price ?? null,
      delivery: t('shipping.estimated'),
      badge: computeBadge(leQuackPrice, "SIGNATURE"),
      badgeColor: "bg-[#F59E0B]",
      href: "/programs/le-quack"
    },
  ]

  // 활성화된 상품만 필터링 + 관리자 뱃지 오버라이드 적용
  // badge_text 가 있으면 자동 계산("X% OFF")/기본 뱃지를 덮어쓰고, badge_color 가 있으면 인라인 색상으로 표시한다.
  const PRODUCTS = ALL_PRODUCTS.filter((p) => isProductActive(p.id)).map((p) => {
    const override = getProductBadge(p.id)
    return {
      ...p,
      badge: override.text || p.badge,
      badgeColor: override.color ? '' : p.badgeColor,
      badgeStyle: override.color ? { backgroundColor: override.color } : undefined,
    }
  })
  const visibleStoreProducts = storeProducts
    .filter((product) => product.isActive !== false)
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  const handleCardClick = (href: string) => {
    router.push(href)
  }

  // 히어로 슬라이드 (동적 배너)
  const heroSlideCount = banners.length || 1
  const currentBanner = banners[currentSlide]

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
                    if (!isDragging && currentBanner?.link_url) {
                      router.push(currentBanner.link_url)
                    }
                  }}
                >
                  {/* 슬라이드 배경 이미지 (동적 배너) */}
                  <div className="absolute inset-0">
                    {isHydrated && currentBanner?.image_url ? (
                      <Image
                        src={currentBanner.image_url}
                        alt={currentBanner.title || 'hero background'}
                        fill
                        sizes="(max-width: 455px) 100vw, 455px"
                        className="object-cover"
                        style={{ objectPosition: 'center center' }}
                        priority
                        data-pin-nopin="true"
                      />
                    ) : (
                      <div className="w-full h-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" aria-hidden />
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* 좌우 네비게이션 버튼 */}
              <button
                onClick={prevSlide}
                aria-label="이전 배너"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center backdrop-blur-sm transition-all active:scale-95"
              >
                <ChevronLeft size={24} className="text-white drop-shadow" />
              </button>
              <button
                onClick={nextSlide}
                aria-label="다음 배너"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center backdrop-blur-sm transition-all active:scale-95"
              >
                <ChevronRight size={24} className="text-white drop-shadow" />
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
            <section id="programs-section" className="bg-white px-4 pt-8 pb-[clamp(132px,19svh,180px)] rounded-t-[32px] -mt-[clamp(64px,12svh,104px)] sticky top-[84px] z-10 min-h-[50vh] border-2 border-slate-900 border-b-0">
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
                            sizes="(max-width: 455px) 50vw, 220px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            data-pin-nopin="true"
                          />
                        ) : (
                          <div className="w-full h-full animate-pulse bg-gradient-to-br from-yellow-100 to-amber-100" />
                        )}
                        {/* 뱃지 */}
                        {product.badge && (
                          <div
                            className={`absolute top-2 left-2 px-2 py-0.5 ${product.badgeColor} text-white text-[8px] font-black rounded-full`}
                            style={product.badgeStyle}
                          >
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
            {/* Sticky Track Spacer (상품 섹션 숨김 동안 축소) */}
            <div className="h-0 w-full" />
          </div>

          {/* ===== 오늘의 향 뽑기 섹션 ===== */}
          {showTodayScent && <TodayScentDraw />}

          {/* ===== 상품 둘러보기 섹션 ===== */}
          <section className="bg-white px-4 pt-12 pb-[clamp(132px,18svh,180px)] rounded-t-[32px] -mt-[clamp(92px,14svh,128px)] relative z-20 min-h-[60vh] border-2 border-slate-900 border-b-0">
            <div className="flex items-center gap-2 mb-6">
              <Gift size={20} className="text-slate-900" />
              <h2 className="text-lg font-black text-slate-900">{t('home.browseProducts')}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {visibleStoreProducts.map((product, index) => (
                <motion.div
                  key={product.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => handleCardClick(`/products/${product.slug}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative bg-[#FEF3C7] rounded-2xl border-2 border-slate-900 overflow-hidden shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                    <div className="relative aspect-square overflow-hidden bg-slate-200 flex items-center justify-center">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="(max-width: 455px) 50vw, 220px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        data-pin-nopin="true"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-lime-600 text-white text-[8px] font-black rounded-full z-10">
                        {product.badge}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 px-1">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {storeText(product).title}
                    </h3>
                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                      {storeText(product).description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm font-bold text-slate-900">
                        {t('currency.symbol')}{storeProductPrice(product.size, product.fallbackPrice).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[9px] font-medium mt-1 text-emerald-600">
                      {t('store.selectAndBuy')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link href="/products" className="inline-flex items-center gap-2 text-sm font-black text-slate-900 underline underline-offset-4 decoration-wavy decoration-yellow-400">
                {t('store.viewAll')} <ChevronRight size={14} />
              </Link>
            </div>
          </section>

          {/* ===== 콜라보 & 협업 문의 섹션 ===== */}
          <section className="bg-white px-4 pt-12 pb-32 rounded-t-[32px] -mt-[clamp(84px,12svh,112px)] relative z-30 min-h-[40vh] border-2 border-slate-900 border-b-0">
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
