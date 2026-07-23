"use client"

import { useState, useRef, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronRight, ChevronLeft, Handshake, MapPin } from "lucide-react"
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
      badgeColor: "bg-[var(--ink)] text-white",
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
      badgeColor: "bg-[var(--ink)] text-white",
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
      badgeColor: "bg-[var(--accent-chem)] text-white",
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
      badgeColor: "bg-[var(--ink)] text-white",
      href: "/programs/personal"
    },
    {
      id: "chemistry",
      title: t('products.chemistry'),
      subtitle: t('programs.subtitle.chemistry'),
      image: thumbnailsLoading ? null : (thumbnails["chemistry"] || null),
      price: chemistryPrice?.price ?? 44000,
      originalPrice: chemistryPrice?.original_price ?? null,
      priceRange: true,
      delivery: t('shipping.estimated'),
      badge: "SEASON 3",
      badgeColor: "bg-[var(--ink)] text-white",
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
      badgeColor: "bg-[var(--ink)] text-white",
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
      badgeColor: "bg-[var(--ink)] text-white",
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
    <div className="min-h-screen bg-[var(--canvas)]">
      <Header />

      {/* 메인 컨텐츠 */}
      <main className="pt-[84px]">

        {/* ===== 히어로: 풀블리드 배너 슬라이드 ===== */}
        <section className={`relative w-full overflow-hidden transition-opacity duration-300 ${bannersLoading ? 'opacity-0' : 'opacity-100'}`}>
          <div className="relative mx-auto h-[420px] w-full max-w-[455px]">
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
                className="relative h-full w-full cursor-grab active:cursor-grabbing"
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
                    <div className="h-full w-full animate-pulse bg-[var(--soft)]" aria-hidden />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 좌우 네비게이션 버튼 (원형 아이콘 버튼 — 시스템 예외 허용) */}
            <button
              onClick={prevSlide}
              aria-label={t('home.prevBanner')}
              className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 transition-colors hover:bg-black/50 active:scale-95"
            >
              <ChevronLeft size={22} className="text-white" />
            </button>
            <button
              onClick={nextSlide}
              aria-label={t('home.nextBanner')}
              className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 transition-colors hover:bg-black/50 active:scale-95"
            >
              <ChevronRight size={22} className="text-white" />
            </button>

            {/* 점 인디케이터 */}
            {banners.length > 1 && (
              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`banner ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide
                      ? 'w-5 bg-white'
                      : 'w-2 bg-white/55 hover:bg-white/80'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto w-full max-w-[455px]">

          {/* ===== 현장방문 예약 스트립 ===== */}
          <div className="border-y border-[var(--line)] bg-[var(--paper)] px-4 py-4">
            <button
              type="button"
              onClick={() => setShowReserveChoice(true)}
              aria-label={t('nav.visitReservation')}
              className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[5px] border border-[var(--ink)] bg-white px-5 py-3.5 text-[15px] font-extrabold text-[var(--ink)] transition-colors hover:bg-[var(--soft)] active:scale-[0.99]"
            >
              <MapPin size={17} />
              {t('nav.visitReservation')}
            </button>
          </div>

          {/* ===== 프로그램 둘러보기 섹션 ===== */}
          <section id="programs-section" className="bg-[var(--canvas)] px-4 pb-16 pt-10">
            {/* 섹션 타이틀 */}
            <div className="mb-6">
              <p className="text-[11px] font-black text-[var(--muted-ink)]">PROGRAMS</p>
              <h2 className="mt-1.5 break-keep text-[22px] font-black leading-tight text-[var(--ink)]">{t('home.browsePrograms')}</h2>
            </div>

            {/* 2열 그리드 카드 */}
            <div className="grid grid-cols-2 items-stretch gap-3">
              {PRODUCTS.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.35 }}
                  onClick={() => handleCardClick(product.href)}
                  className="group h-full cursor-pointer"
                >
                  <div className="relative flex h-full flex-col overflow-hidden rounded-[5px] border border-[var(--line)] bg-white transition-colors group-hover:border-[var(--ink)]">
                    {/* 카드 이미지 */}
                    <div className="relative aspect-square overflow-hidden bg-[var(--soft)]">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          sizes="(max-width: 455px) 50vw, 220px"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          data-pin-nopin="true"
                        />
                      ) : (
                        <div className="h-full w-full animate-pulse bg-[var(--soft)]" />
                      )}
                      {/* 뱃지 */}
                      {product.badge && (
                        <div
                          className={`absolute left-2 top-2 rounded-[3px] px-2 py-[3px] ${product.badgeColor || "text-white"} text-[10px] font-bold uppercase`}
                          style={product.badgeStyle}
                        >
                          {product.badge}
                        </div>
                      )}
                    </div>
                    {/* 카드 타이틀 */}
                    <div className="flex flex-1 flex-col border-t border-[var(--line-soft)] px-3 py-3">
                      <h3 className="truncate break-keep text-[clamp(13px,3.6vw,15px)] font-bold text-[var(--ink)]">
                        {product.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 whitespace-pre-line break-keep text-[clamp(10px,2.8vw,11.5px)] leading-snug text-[var(--muted-ink)]">
                        {product.subtitle}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[clamp(16px,4.4vw,19px)] font-extrabold text-[var(--ink)]">
                          {t('currency.symbol')}{product.price.toLocaleString()}{product.priceRange && '~'}
                        </span>
                        {product.originalPrice && (
                          <span className="text-[clamp(10px,2.7vw,12px)] text-[var(--muted-ink)] line-through">
                            {t('currency.symbol')}{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <p className="mt-auto pt-2 text-[clamp(10.5px,2.8vw,12px)] text-[var(--muted-ink)]">
                        {product.delivery}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* ===== 오늘의 향 뽑기 섹션 (다크 밴드) ===== */}
        {showTodayScent && <TodayScentDraw />}

        <div className="mx-auto w-full max-w-[455px]">
          {/* ===== 상품 둘러보기 섹션 ===== */}
          <section className="bg-[var(--paper)] px-4 pb-16 pt-12">
            <div className="mb-6">
              <p className="text-[11px] font-black text-[var(--muted-ink)]">STORE</p>
              <h2 className="mt-1.5 break-keep text-[22px] font-black leading-tight text-[var(--ink)]">{t('home.browseProducts')}</h2>
            </div>

            <div className="grid grid-cols-2 items-stretch gap-3">
              {visibleStoreProducts.map((product, index) => {
                const localized = storeText(product)
                return (
                  <motion.div
                    key={product.slug}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.35 }}
                    onClick={() => handleCardClick(`/products/${product.slug}`)}
                    className="group h-full cursor-pointer"
                  >
                    <div className="relative flex h-full flex-col overflow-hidden rounded-[5px] border border-[var(--line)] bg-white transition-colors group-hover:border-[var(--ink)]">
                      <div className="relative aspect-square overflow-hidden bg-[var(--soft)]">
                        <Image
                          src={product.image}
                          alt={localized.title}
                          fill
                          sizes="(max-width: 455px) 50vw, 220px"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          data-pin-nopin="true"
                        />
                        <div className="absolute left-2 top-2 z-10 rounded-[3px] bg-[var(--ink)] px-2 py-[3px] text-[10px] font-bold uppercase text-white">
                          {product.badge}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col border-t border-[var(--line-soft)] px-3 py-3">
                        <h3 className="truncate break-keep text-[clamp(13px,3.6vw,15px)] font-bold text-[var(--ink)]">
                          {localized.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 break-keep text-[clamp(10px,2.8vw,11.5px)] leading-snug text-[var(--muted-ink)]">
                          {localized.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[clamp(16px,4.4vw,19px)] font-extrabold text-[var(--ink)]">
                            {t('currency.symbol')}{storeProductPrice(product.size, product.fallbackPrice).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-auto pt-2 text-[clamp(10.5px,2.8vw,12px)] text-[var(--muted-ink)]">
                          {t('store.selectAndBuy')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="mt-10 text-center">
              <Link href="/products" className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--ink)] underline underline-offset-4">
                {t('store.viewAll')} <ChevronRight size={14} />
              </Link>
            </div>
          </section>
        </div>

        {/* ===== 콜라보 & 협업 문의 섹션 (다크 밴드) ===== */}
        <section className="bg-[var(--dark-band)] px-4 pb-24 pt-14 text-white">
          <div className="mx-auto w-full max-w-[455px]">
            <div className="mb-5 flex items-center gap-2">
              <Handshake size={18} className="text-white" />
              <h2 className="break-keep text-[22px] font-black leading-tight text-white">{t('home.collaboration')}</h2>
            </div>

            <p className="whitespace-pre-line break-keep text-sm leading-relaxed text-[var(--dark-muted)]">
              {t('home.collaborationDesc')}
            </p>

            {/* 협업 아이템 */}
            <ul className="mt-6 border-t border-[var(--dark-line)]">
              <li className="border-b border-[var(--dark-line)] py-3 text-[13px] text-[var(--dark-muted)]">{t('home.collaborationItem1')}</li>
              <li className="border-b border-[var(--dark-line)] py-3 text-[13px] text-[var(--dark-muted)]">{t('home.collaborationItem2')}</li>
              <li className="border-b border-[var(--dark-line)] py-3 text-[13px] text-[var(--dark-muted)]">{t('home.collaborationItem3')}</li>
            </ul>

            {/* CTA 버튼 */}
            <Link
              href="/collaboration"
              className="mt-6 block w-full rounded-[5px] bg-white py-3.5 text-center text-sm font-extrabold text-[var(--ink)] transition-colors hover:bg-[var(--soft)]"
            >
              {t('home.viewCollaboration')}
            </Link>
          </div>
        </section>

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
