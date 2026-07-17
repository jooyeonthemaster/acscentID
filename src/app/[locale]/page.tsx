"use client"

import { useState, useRef, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ChevronLeft, Search, Gift, Handshake, MapPin } from "lucide-react"
import { Header } from "@/components/layout/Header"
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { PopupModal } from "@/components/home/PopupModal"
import { ReserveChoiceModal } from "@/components/home/ReserveChoiceModal"
import { TodayScentDraw } from "@/components/home/TodayScentDraw"
import { ViewportSwitch } from "@/components/desktop/ViewportSwitch"
import { HomeDesktop } from "./_desktop/HomeDesktop"
import { useBanners, useActiveProducts, useProductThumbnailMap } from "@/hooks/useAdminContent"
import { useProductPricing } from "@/hooks/useProductPricing"
import { useStoreProducts } from "@/hooks/useStoreProducts"
import { useStoreProductText } from "@/hooks/useStoreProductText"
import { isScentPaperSize, type ProductType } from "@/types/cart"
import { STORE_PRODUCT_TYPE } from "@/lib/products/store-products"

const VISIT_RESERVATION_URL = "https://map.naver.com/p/entry/place/1274492663?c=15.00,0,0,0,dh&placePath=%2Fhome%3Ffrom%3Dmap%26fromPanelNum%3D1"
const subscribeToHydration = () => () => {}
const getHydratedSnapshot = () => true
const getServerHydrationSnapshot = () => false

export default function Home() {
  const router = useRouter()
  const t = useTranslations()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showReserveChoice, setShowReserveChoice] = useState(false)
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  )
  const slideRef = useRef<HTMLDivElement>(null)
  const { banners, loading: bannersLoading } = useBanners()
  const { isProductVisible, getProductBadge } = useActiveProducts()
  // 오늘의 향 섹션: admin_products 행이 없으면 기본 노출, 있으면 is_active 따름
  const showTodayScent = isProductVisible('today-scent')
  const { getOptions } = useProductPricing()
  const { products: storeProducts } = useStoreProducts()
  const storeText = useStoreProductText()

  // 상품관리 이미지의 첫 번째 사진이 메인 썸네일입니다.
  const { thumbnails, loading: thumbnailsLoading } = useProductThumbnailMap()

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
  const sajuPrice = minPrice('saju_perfume')
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
      badgeColor: "bg-[#EEB62B] text-[#1A1610]",
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
      badgeColor: "bg-[#EEB62B] text-[#1A1610]",
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
      badgeColor: "bg-[#EF4444] text-white",
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
      badgeColor: "bg-[#EEB62B] text-[#1A1610]",
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
      badgeColor: "bg-[#EEB62B] text-[#1A1610]",
      href: "/programs/chemistry"
    },
    {
      id: "saju",
      title: t('products.saju'),
      subtitle: t('programs.subtitle.saju'),
      image: thumbnailsLoading ? null : (thumbnails["saju"] || null),
      price: sajuPrice?.price ?? 48000,
      originalPrice: sajuPrice?.original_price ?? null,
      priceRange: true,
      delivery: t('shipping.estimated'),
      badge: computeBadge(sajuPrice, "NEW"),
      badgeColor: "bg-[#0C0E16] text-[#E9E2D0]",
      href: "/programs/saju"
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
      badgeColor: "bg-[#EEB62B] text-[#1A1610]",
      href: "/programs/le-quack"
    },
  ]

  // 활성화된 상품만 필터링 + 관리자 뱃지 오버라이드 적용
  // badge_text 가 있으면 자동 계산("X% OFF")/기본 뱃지를 덮어쓰고, badge_color 가 있으면 인라인 색상으로 표시한다.
  const PRODUCTS = ALL_PRODUCTS.filter((p) => isProductVisible(p.id)).map((p) => {
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

  // 데스크탑 변형에 내려보낼 파생 데이터 (상태는 페이지 레벨 공유 — 리사이즈에도 유지)
  const desktopStoreProducts = visibleStoreProducts.map((product) => {
    const localized = storeText(product)
    return {
      slug: product.slug,
      title: localized.title,
      description: localized.description,
      image: product.image,
      badge: product.badge,
      price: storeProductPrice(product.size, product.fallbackPrice),
    }
  })

  const mobileHome = (
    <div className="min-h-screen bg-[#0C0E16] font-wanted selection:bg-[#232838] selection:text-[#E9E2D0]">
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
                      <div className="w-full h-full animate-pulse bg-gradient-to-br from-[#151823] to-[#232838]" aria-hidden />
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* 좌우 네비게이션 버튼 */}
              <button
                onClick={prevSlide}
                aria-label={t('home.prevBanner')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center backdrop-blur-sm transition-all active:scale-95"
              >
                <ChevronLeft size={24} className="text-[#E9E2D0] drop-shadow" />
              </button>
              <button
                onClick={nextSlide}
                aria-label={t('home.nextBanner')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center backdrop-blur-sm transition-all active:scale-95"
              >
                <ChevronRight size={24} className="text-[#E9E2D0] drop-shadow" />
              </button>

              <div className="absolute bottom-32 md:bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentSlide
                      ? 'bg-[#12141D] w-6 shadow-md'
                      : 'bg-[#12141D]/50 hover:bg-[#12141D]/70'
                      }`}
                  />
                ))}
              </div>

            </div>
          </section>


          {/* Wrapper for Sticky Control */}
          <div className="relative">
            {/* 현장방문 예약 — sticky 배너 밖(이 wrapper는 스크롤됨)이라 스크롤 시 함께 올라간다.
                배너 하단에 겹쳐 보이도록 위로 당김. */}
            <button
              type="button"
              onClick={() => setShowReserveChoice(true)}
              aria-label={t('nav.visitReservation')}
              className="absolute left-4 right-4 -top-[76px] z-30 flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] border border-[#B8880F] bg-[#F5EFE2] px-5 py-3.5 text-base font-bold text-[#1A1610] shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition-colors hover:bg-[#FFFDF5] active:scale-[0.98]"
            >
              <MapPin size={18} />
              {t('nav.visitReservation')}
            </button>
            {/* ===== 프로그램 둘러보기 섹션 ===== */}
            <section id="programs-section" className="bg-[#FBF7EF] px-4 pt-8 pb-[clamp(132px,19svh,180px)] rounded-t-[12px] -mt-[clamp(64px,12svh,104px)] sticky top-[84px] z-10 min-h-[50vh] border-2 border-[#D8CFBB] border-b-0">
              {/* 섹션 타이틀 */}
              <div className="flex items-center gap-2 mb-6">
                <Search size={20} className="text-[#1A1610]" />
                <h2 className="font-heading text-[22px] font-bold tracking-[-0.01em] text-[#1A1610]">{t('home.browsePrograms')}</h2>
              </div>

              {/* 2열 그리드 카드 */}
              <div className="grid grid-cols-2 items-stretch gap-3">
                {PRODUCTS.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleCardClick(product.href)}
                    className="group h-full cursor-pointer"
                  >
                    <div className="relative flex h-full flex-col overflow-hidden rounded-[12px] border border-[#B8880F]/55 bg-[#F5EFE2] transition-colors group-hover:border-[#B8880F]">
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
                          <div className="w-full h-full animate-pulse bg-gradient-to-br from-[#EDE5D2] to-[#EDE5D2]" />
                        )}
                        {/* 뱃지 */}
                        {product.badge && (
                          <div
                            className={`absolute top-2 left-2 px-2 py-[3px] ${product.badgeColor || "text-white"} text-[10px] lg:text-[12px] font-medium uppercase tracking-[0.1em] rounded-[2px]`}
                            style={product.badgeStyle}
                          >
                            {product.badge}
                          </div>
                        )}
                      </div>
                      {/* 카드 타이틀 (테두리 안 — 사진과 한 덩어리) */}
                      <div className="flex flex-1 flex-col border-t border-[#B8880F]/30 px-3 py-3">
                      <h3 className="font-medium text-[#1A1610] text-[clamp(13px,3.6vw,15px)] tracking-[-0.01em] truncate">
                        {product.title}
                      </h3>
                      <p className="text-[clamp(10px,2.8vw,11.5px)] text-[#6E6659] leading-snug mt-1 line-clamp-2 whitespace-pre-line">
                        {product.subtitle}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[clamp(16px,4.4vw,19px)] font-semibold tracking-[-0.02em] text-[#1A1610]">
                          {t('currency.symbol')}{product.price.toLocaleString()}{product.priceRange && '~'}
                        </span>
                        {product.originalPrice && (
                          <span className="text-[clamp(10px,2.7vw,12px)] text-[#6E6659] line-through">
                            {t('currency.symbol')}{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <p className="text-[clamp(10.5px,2.8vw,12px)] font-light mt-auto pt-2 text-[#5C564A]">
                        {product.delivery}
                      </p>
                      </div>
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
          <section className="bg-[#FBF7EF] px-4 pt-12 pb-[clamp(132px,18svh,180px)] rounded-t-[12px] -mt-[clamp(92px,14svh,128px)] relative z-20 min-h-[60vh] border-2 border-[#D8CFBB] border-b-0">
            <div className="flex items-center gap-2 mb-6">
              <Gift size={20} className="text-[#1A1610]" />
              <h2 className="font-heading text-[22px] font-bold tracking-[-0.01em] text-[#1A1610]">{t('home.browseProducts')}</h2>
            </div>

            <div className="grid grid-cols-2 items-stretch gap-3">
              {visibleStoreProducts.map((product, index) => {
                const localized = storeText(product)
                return (
                  <motion.div
                    key={product.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    onClick={() => handleCardClick(`/products/${product.slug}`)}
                    className="group h-full cursor-pointer"
                  >
                    <div className="relative flex h-full flex-col overflow-hidden rounded-[12px] border border-[#B8880F]/55 bg-[#F5EFE2] transition-colors group-hover:border-[#B8880F]">
                      <div className="relative aspect-square overflow-hidden bg-[#D8CFBB] flex items-center justify-center">
                        <Image
                          src={product.image}
                          alt={localized.title}
                          fill
                          sizes="(max-width: 455px) 50vw, 220px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          data-pin-nopin="true"
                        />
                        <div className="absolute top-2 left-2 px-2 py-[3px] bg-[#EEB62B] text-[#1A1610] text-[10px] lg:text-[12px] font-medium uppercase tracking-[0.1em] rounded-[2px] z-10">
                          {product.badge}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col border-t border-[#B8880F]/30 px-3 py-3">
                      <h3 className="font-medium text-[#1A1610] text-[clamp(13px,3.6vw,15px)] tracking-[-0.01em] truncate">
                        {localized.title}
                      </h3>
                      <p className="text-[clamp(10px,2.8vw,11.5px)] text-[#6E6659] leading-snug mt-1 line-clamp-2">
                        {localized.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[clamp(16px,4.4vw,19px)] font-semibold tracking-[-0.02em] text-[#1A1610]">
                          {t('currency.symbol')}{storeProductPrice(product.size, product.fallbackPrice).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[clamp(10.5px,2.8vw,12px)] font-light mt-auto pt-2 text-[#5C564A]">
                        {t('store.selectAndBuy')}
                      </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="mt-12 text-center">
              <Link href="/products" className="inline-flex items-center gap-2 text-sm lg:text-base font-medium text-[#1A1610] underline underline-offset-4 decoration-wavy decoration-stone-400">
                {t('store.viewAll')} <ChevronRight size={14} />
              </Link>
            </div>
          </section>

          {/* ===== 콜라보 & 협업 문의 섹션 ===== */}
          <section className="bg-[#12141D] px-4 pt-12 pb-32 rounded-t-[12px] -mt-[clamp(84px,12svh,112px)] relative z-30 min-h-[40vh] border-2 border-[#262A38] border-b-0">
            <div className="flex items-center gap-2 mb-6">
              <Handshake size={20} className="text-[#E9E2D0]" />
              <h2 className="font-heading text-[22px] font-bold tracking-[-0.01em] text-[#E9E2D0]">{t('home.collaboration')}</h2>
            </div>

            {/* 협업 소개 */}
            <div className="bg-[#161925] rounded-[12px] p-5 border border-[#343A4C]">
              <p className="text-[#E9E2D0] text-sm lg:text-base font-medium mb-4 whitespace-pre-line">
                {t('home.collaborationDesc')}
              </p>

              {/* 협업 아이템 */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-3 bg-[#1B1F2C] rounded-[12px] px-3 py-2.5 border border-[#262A38]">
                  <span className="w-1.5 h-1.5 bg-[#EEB62B] rounded-full flex-shrink-0"></span>
                  <span className="text-xs lg:text-sm text-[#A69F8D]">{t('home.collaborationItem1')}</span>
                </div>
                <div className="flex items-center gap-3 bg-[#1B1F2C] rounded-[12px] px-3 py-2.5 border border-[#262A38]">
                  <span className="w-1.5 h-1.5 bg-[#EEB62B] rounded-full flex-shrink-0"></span>
                  <span className="text-xs lg:text-sm text-[#A69F8D]">{t('home.collaborationItem2')}</span>
                </div>
                <div className="flex items-center gap-3 bg-[#1B1F2C] rounded-[12px] px-3 py-2.5 border border-[#262A38]">
                  <span className="w-1.5 h-1.5 bg-[#EEB62B] rounded-full flex-shrink-0"></span>
                  <span className="text-xs lg:text-sm text-[#A69F8D]">{t('home.collaborationItem3')}</span>
                </div>
              </div>

              {/* CTA 버튼 */}
              <Link
                href="/collaboration"
                className="block w-full bg-[#F5EFE2] text-[#12141D] text-center font-bold text-sm lg:text-base py-3 rounded-[12px] border-2 border-[#262A38] hover:bg-[#FFFDF5] transition-colors"
              >
                {t('home.viewCollaboration')}
              </Link>
            </div>
          </section>

        </div>
      </main>
    </div>
  )

  return (
    <>
      {/* 공유 오버레이 — 뷰포트 모드와 무관하게 단일 인스턴스 */}
      <PopupModal />
      <ReserveChoiceModal
        open={showReserveChoice}
        onClose={() => setShowReserveChoice(false)}
        naverUrl={VISIT_RESERVATION_URL}
      />

      <ViewportSwitch
        mobile={mobileHome}
        desktop={
          <HomeDesktop
            banners={banners}
            bannersLoading={bannersLoading}
            currentSlide={currentSlide}
            currentBanner={currentBanner}
            isHydrated={isHydrated}
            onPrevSlide={prevSlide}
            onNextSlide={nextSlide}
            onSelectSlide={setCurrentSlide}
            onBannerClick={() => {
              if (currentBanner?.link_url) router.push(currentBanner.link_url)
            }}
            products={PRODUCTS}
            storeProducts={desktopStoreProducts}
            showTodayScent={showTodayScent}
            onCardClick={handleCardClick}
            onReserveClick={() => setShowReserveChoice(true)}
          />
        }
      />
    </>
  )
}
