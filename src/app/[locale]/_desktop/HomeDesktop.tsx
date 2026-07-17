'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Search, Gift, Handshake, MapPin, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TodayScentDraw } from '@/components/home/TodayScentDraw'
import type { useBanners } from '@/hooks/useAdminContent'

type Banner = ReturnType<typeof useBanners>['banners'][number]

export interface HomeDesktopProduct {
  id: string
  title: string
  subtitle: string
  image: string | null
  price: number
  originalPrice: number | null
  priceRange?: boolean
  delivery: string
  badge: string
  badgeColor: string
  badgeStyle?: React.CSSProperties
  href: string
}

export interface HomeDesktopStoreProduct {
  slug: string
  title: string
  description: string
  image: string
  badge: string
  price: number
}

interface HomeDesktopProps {
  banners: Banner[]
  bannersLoading: boolean
  currentSlide: number
  currentBanner: Banner | undefined
  isHydrated: boolean
  onPrevSlide: () => void
  onNextSlide: () => void
  onSelectSlide: (index: number) => void
  onBannerClick: () => void
  products: HomeDesktopProduct[]
  storeProducts: HomeDesktopStoreProduct[]
  showTodayScent: boolean
  onCardClick: (href: string) => void
  onReserveClick: () => void
}

/**
 * 홈 데스크탑 변형 (lg+). 모바일과 동일한 데이터/상태를 props로 받아
 * max-w-[1200px] 멀티컬럼으로 재배치한다. 모바일의 sticky 스택 스크롤
 * 연출은 데스크탑에서 평평한 밴드 흐름으로 대체.
 */
export function HomeDesktop({
  banners,
  bannersLoading,
  currentSlide,
  currentBanner,
  isHydrated,
  onPrevSlide,
  onNextSlide,
  onSelectSlide,
  onBannerClick,
  products,
  storeProducts,
  showTodayScent,
  onCardClick,
  onReserveClick,
}: HomeDesktopProps) {
  const t = useTranslations()

  return (
    <div className="min-h-screen bg-[#0C0E16] pt-[84px] font-wanted selection:bg-[#232838] selection:text-[#E9E2D0]">
      {/* ===== 히어로: 배너 풀블리드 배경 + 오버레이 브랜드 블록 ===== */}
      <section className="relative overflow-hidden border-b-2 border-[#262A38] bg-[#0C0E16]">
        {/* 배경 배너 슬라이더 (좌우 풀블리드) */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${bannersLoading ? 'opacity-0' : 'opacity-100'}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="absolute inset-0 cursor-pointer"
              onClick={onBannerClick}
            >
              {isHydrated && currentBanner?.image_url ? (
                <Image
                  src={currentBanner.image_url}
                  alt={currentBanner.title || 'hero background'}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  style={{ objectPosition: 'center center' }}
                  priority
                  data-pin-nopin="true"
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#151823] to-[#232838]" aria-hidden />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 가독성 스크림 — 좌측 진하게, 하단 살짝 */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0C0E16] via-[#0C0E16]/85 to-[#0C0E16]/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0C0E16]/80 via-transparent to-transparent" />

        {/* 콘텐츠 (배경 클릭은 통과, 버튼만 활성) */}
        <div className="pointer-events-none relative z-10 mx-auto flex min-h-[340px] w-full max-w-[1200px] items-center px-6 py-8">
          <div className="max-w-[560px]">
            <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-[#A69F8D]">
              AC&apos;SCENT IDENTITY
            </p>
            <h1 className="mt-4 max-w-[13ch] break-keep text-balance font-heading text-4xl font-black leading-snug text-[#E9E2D0] xl:text-5xl">
              {t('footer.tagline')}
            </h1>
            <p className="mt-5 max-w-[420px] text-base leading-relaxed text-[#E9E2D0]/70 whitespace-pre-line">
              {t('home.collaborationDesc')}
            </p>
            <div className="mt-9 flex items-center gap-3">
              <a
                href="#programs-section-desktop"
                className="pointer-events-auto flex items-center gap-2 rounded-[12px] border-2 border-[#B8880F] bg-[#EEB62B] px-6 py-3.5 text-base font-black text-[#1A1610] transition-colors hover:bg-[#F2C24A]"
              >
                <Sparkles size={16} />
                {t('home.browsePrograms')}
              </a>
              <button
                type="button"
                onClick={onReserveClick}
                className="pointer-events-auto flex items-center gap-2 rounded-[12px] border-2 border-[#262A38] bg-[#F5EFE2] px-6 py-3.5 text-base font-bold text-[#1A1610] transition-colors hover:bg-[#FFFDF5]"
              >
                <MapPin size={16} />
                {t('nav.visitReservation')}
              </button>
            </div>
          </div>
        </div>

        {/* 슬라이더 컨트롤 — 우하단 클러스터 (좌측 텍스트와 겹치지 않음) */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-4">
            <div className="flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onSelectSlide(index)}
                  aria-label={`banner ${index + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'w-6 bg-[#E9E2D0]'
                      : 'w-2.5 bg-[#E9E2D0]/40 hover:bg-[#E9E2D0]/60'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={onPrevSlide}
                aria-label={t('home.prevBanner')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-all hover:bg-black/50 active:scale-95"
              >
                <ChevronLeft size={22} className="text-[#E9E2D0] drop-shadow" />
              </button>
              <button
                onClick={onNextSlide}
                aria-label={t('home.nextBanner')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-all hover:bg-black/50 active:scale-95"
              >
                <ChevronRight size={22} className="text-[#E9E2D0] drop-shadow" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===== 프로그램 둘러보기 ===== */}
      <section id="programs-section-desktop" className="scroll-mt-[100px] bg-[#12141D]">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <div className="mb-8 flex items-center gap-2.5">
            <Search size={22} className="text-[#E9E2D0]" />
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[#E9E2D0]">
              {t('home.browsePrograms')}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-x-6 gap-y-10 xl:grid-cols-4">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => onCardClick(product.href)}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-[12px] border-2 border-[#262A38] bg-[#151823] transition-colors group-hover:border-[#343A4C]">
                  <div className="relative aspect-square overflow-hidden">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="(min-width: 1280px) 270px, 360px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        data-pin-nopin="true"
                      />
                    ) : (
                      <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#151823] to-[#151823]" />
                    )}
                    {product.badge && (
                      <div
                        className={`absolute left-2 top-2 px-2 py-[3px] ${product.badgeColor || 'text-white'} rounded-[2px] text-[12px] font-medium uppercase tracking-[0.1em]`}
                        style={product.badgeStyle}
                      >
                        {product.badge}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 px-1">
                  <h3 className="truncate text-[17px] font-medium tracking-[-0.01em] text-[#E9E2D0]">
                    {product.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-[13px] leading-tight text-[#8B8578]">
                    {product.subtitle}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[17px] font-semibold text-[#E9E2D0]">
                      {t('currency.symbol')}{product.price.toLocaleString()}{product.priceRange && '~'}
                    </span>
                    {product.originalPrice && (
                      <span className="text-[12px] text-[#8B8578] line-through">
                        {t('currency.symbol')}{product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] font-light text-[#A69F8D]">
                    {product.delivery}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 오늘의 향 뽑기 — 455px 인터랙션 카드를 중앙 배치 ===== */}
      {showTodayScent && (
        <section className="border-y-2 border-[#262A38] bg-[#0C0E16]">
          <div className="mx-auto w-full max-w-[455px]">
            <TodayScentDraw />
          </div>
        </section>
      )}

      {/* ===== 상품 둘러보기 ===== */}
      <section className="bg-[#12141D]">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <div className="mb-8 flex items-center gap-2.5">
            <Gift size={22} className="text-[#E9E2D0]" />
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[#E9E2D0]">
              {t('home.browseProducts')}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-x-6 gap-y-10">
            {storeProducts.map((product) => (
              <div
                key={product.slug}
                onClick={() => onCardClick(`/products/${product.slug}`)}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-[12px] border-2 border-[#262A38] bg-[#151823] transition-colors group-hover:border-[#343A4C]">
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#232838]">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      sizes="360px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-pin-nopin="true"
                    />
                    <div className="absolute left-2 top-2 z-10 rounded-[2px] bg-[#EEB62B] px-2 py-[3px] text-[12px] font-medium uppercase tracking-[0.1em] text-[#1A1610]">
                      {product.badge}
                    </div>
                  </div>
                </div>
                <div className="mt-4 px-1">
                  <h3 className="truncate text-[17px] font-medium tracking-[-0.01em] text-[#E9E2D0]">
                    {product.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-tight text-[#8B8578]">
                    {product.description}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[17px] font-semibold text-[#E9E2D0]">
                      {t('currency.symbol')}{product.price.toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] font-light text-[#A69F8D]">
                    {t('store.selectAndBuy')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-base font-medium text-[#E9E2D0] underline decoration-stone-400 decoration-wavy underline-offset-4"
            >
              {t('store.viewAll')} <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 방문 예약 + 협업 문의 ===== */}
      <section className="border-t-2 border-[#262A38] bg-[#0C0E16]">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-6 px-6 py-16">
          {/* 방문 예약 카드 */}
          <button
            type="button"
            onClick={onReserveClick}
            aria-label={t('nav.visitReservation')}
            className="group flex items-center gap-5 rounded-[16px] border-2 border-[#262A38] bg-[#F5EFE2] p-8 text-left transition-all hover:bg-[#FFFDF5] active:scale-[0.99]"
          >
            <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full border-2 border-[#262A38] bg-[#12141D]">
              <MapPin size={26} className="text-[#E9E2D0]" strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium uppercase leading-none tracking-[0.18em] text-[#5C564A]">
                AC&apos;SCENT ID
              </span>
              <span className="mt-1.5 block text-2xl font-medium leading-tight tracking-[-0.01em] text-[#1A1610]">
                {t('nav.visitReservation')}
              </span>
            </span>
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[#12141D]/80 transition-transform group-hover:translate-x-0.5">
              <ChevronRight size={20} className="text-[#E9E2D0]" strokeWidth={2.8} />
            </span>
          </button>

          {/* 협업 문의 카드 */}
          <div className="rounded-[16px] border border-[#343A4C] bg-[#161925] p-8">
            <div className="mb-4 flex items-center gap-2">
              <Handshake size={20} className="text-[#E9E2D0]" />
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#E9E2D0]">
                {t('home.collaboration')}
              </h2>
            </div>
            <div className="mb-5 space-y-2">
              <div className="flex items-center gap-3 rounded-[12px] border border-[#262A38] bg-[#1B1F2C] px-3 py-2.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#EEB62B]" />
                <span className="text-sm text-[#A69F8D]">{t('home.collaborationItem1')}</span>
              </div>
              <div className="flex items-center gap-3 rounded-[12px] border border-[#262A38] bg-[#1B1F2C] px-3 py-2.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#EEB62B]" />
                <span className="text-sm text-[#A69F8D]">{t('home.collaborationItem2')}</span>
              </div>
              <div className="flex items-center gap-3 rounded-[12px] border border-[#262A38] bg-[#1B1F2C] px-3 py-2.5">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#EEB62B]" />
                <span className="text-sm text-[#A69F8D]">{t('home.collaborationItem3')}</span>
              </div>
            </div>
            <Link
              href="/collaboration"
              className="block w-full rounded-[12px] border-2 border-[#262A38] bg-[#F5EFE2] py-3 text-center text-base font-bold text-[#12141D] transition-colors hover:bg-[#FFFDF5]"
            >
              {t('home.viewCollaboration')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
