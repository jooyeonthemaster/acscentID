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
 *
 * 팔레트: 모바일과 동일하게 아이보리(#FBF7EF/#F5EFE2) 바탕 + 금(#B8880F)
 * 테두리 + 먹(#1A1610) 글자. 히어로(배너)와 협업 밴드만 먹 톤을 유지해
 * 모바일의 리듬(크림 · 크림 · 먹)을 그대로 따른다.
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
    <div className="min-h-screen bg-[#0C0E16] pt-[84px] font-wanted selection:bg-[#EFE4C8] selection:text-[#1A1610]">
      {/* ===== 히어로: 배너 풀블리드 배경 + 오버레이 브랜드 블록 ===== */}
      <section className="relative overflow-hidden border-b-2 border-[#B8880F] bg-[#0C0E16]">
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0C0E16] via-[#0C0E16]/80 to-[#0C0E16]/20" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0C0E16]/70 via-transparent to-transparent" />

        {/* 콘텐츠 (배경 클릭은 통과, 버튼만 활성) */}
        <div className="pointer-events-none relative z-10 mx-auto flex min-h-[340px] w-full max-w-[1200px] items-center px-6 py-8">
          <div className="max-w-[560px]">
            <p className="text-[13px] font-bold uppercase tracking-[0.3em] text-[#EFE4C8]">
              AC&apos;SCENT IDENTITY
            </p>
            <h1 className="mt-4 max-w-[13ch] break-keep text-balance font-heading text-4xl font-black leading-snug text-[#F5EFE2] xl:text-5xl">
              {t('footer.tagline')}
            </h1>
            <p className="mt-5 max-w-[420px] text-base leading-relaxed text-[#F5EFE2]/70 whitespace-pre-line">
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
                className="pointer-events-auto flex items-center gap-2 rounded-[12px] border-2 border-[#B8880F] bg-[#F5EFE2] px-6 py-3.5 text-base font-bold text-[#1A1610] transition-colors hover:bg-[#FFFDF5]"
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
                      ? 'w-6 bg-[#EEB62B]'
                      : 'w-2.5 bg-[#F5EFE2]/50 hover:bg-[#F5EFE2]/70'
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
                <ChevronLeft size={22} className="text-[#F5EFE2] drop-shadow" />
              </button>
              <button
                onClick={onNextSlide}
                aria-label={t('home.nextBanner')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-all hover:bg-black/50 active:scale-95"
              >
                <ChevronRight size={22} className="text-[#F5EFE2] drop-shadow" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===== 프로그램 둘러보기 (아이보리 밴드 + 금 테두리 카드) ===== */}
      <section id="programs-section-desktop" className="scroll-mt-[100px] border-b-2 border-[#D8CFBB] bg-[#FBF7EF]">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <div className="mb-8 flex items-center gap-2.5">
            <Search size={22} className="text-[#1A1610]" />
            <h2 className="font-heading text-3xl font-bold tracking-[-0.02em] text-[#1A1610]">
              {t('home.browsePrograms')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => onCardClick(product.href)}
                className="group cursor-pointer"
              >
                <div className="flex h-full flex-row overflow-hidden rounded-[12px] border border-[#B8880F]/55 bg-[#F5EFE2] transition-colors group-hover:border-[#B8880F]">
                  <div className="relative aspect-square w-[240px] shrink-0 overflow-hidden">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="240px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        data-pin-nopin="true"
                      />
                    ) : (
                      <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#EDE5D2] to-[#EDE5D2]" />
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
                  <div className="flex min-w-0 flex-1 flex-col border-l border-[#B8880F]/30 px-5 py-5">
                    <h3 className="truncate text-[17px] font-medium tracking-[-0.01em] text-[#1A1610]">
                      {product.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-[13px] leading-tight text-[#6E6659]">
                      {product.subtitle}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[17px] font-semibold text-[#1A1610]">
                        {t('currency.symbol')}{product.price.toLocaleString()}{product.priceRange && '~'}
                      </span>
                      {product.originalPrice && (
                        <span className="text-[12px] text-[#6E6659] line-through">
                          {t('currency.symbol')}{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="mt-auto pt-2 text-[13px] font-light text-[#5C564A]">
                      {product.delivery}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 오늘의 향 뽑기 — 455px 인터랙션 카드를 중앙 배치 ===== */}
      {showTodayScent && (
        <section className="border-b-2 border-[#D8CFBB] bg-[#FBF7EF]">
          <div className="mx-auto w-full max-w-[455px]">
            <TodayScentDraw />
          </div>
        </section>
      )}

      {/* ===== 상품 둘러보기 (아이보리 밴드 + 금 테두리 카드) ===== */}
      <section className="border-b-2 border-[#D8CFBB] bg-[#FBF7EF]">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <div className="mb-8 flex items-center gap-2.5">
            <Gift size={22} className="text-[#1A1610]" />
            <h2 className="font-heading text-3xl font-bold tracking-[-0.02em] text-[#1A1610]">
              {t('home.browseProducts')}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {storeProducts.map((product) => (
              <div
                key={product.slug}
                onClick={() => onCardClick(`/products/${product.slug}`)}
                className="group cursor-pointer"
              >
                <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-[#B8880F]/55 bg-[#F5EFE2] transition-colors group-hover:border-[#B8880F]">
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#D8CFBB]">
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
                  <div className="flex flex-1 flex-col border-t border-[#B8880F]/30 px-4 py-4">
                    <h3 className="truncate text-[17px] font-medium tracking-[-0.01em] text-[#1A1610]">
                      {product.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-tight text-[#6E6659]">
                      {product.description}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[17px] font-semibold text-[#1A1610]">
                        {t('currency.symbol')}{product.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-auto pt-2 text-[13px] font-light text-[#5C564A]">
                      {t('store.selectAndBuy')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-base font-medium text-[#1A1610] underline decoration-stone-400 decoration-wavy underline-offset-4"
            >
              {t('store.viewAll')} <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 방문 예약 + 협업 문의 (모바일 협업 밴드와 동일한 먹 톤) ===== */}
      <section className="bg-[#12141D]">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-6 px-6 py-16">
          {/* 방문 예약 카드 */}
          <button
            type="button"
            onClick={onReserveClick}
            aria-label={t('nav.visitReservation')}
            className="group flex items-center gap-5 rounded-[16px] border-2 border-[#B8880F] bg-[#F5EFE2] p-8 text-left transition-all hover:bg-[#FFFDF5] active:scale-[0.99]"
          >
            <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full border-2 border-[#B8880F] bg-[#12141D]">
              <MapPin size={26} className="text-[#EEB62B]" strokeWidth={2.4} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[13px] font-medium uppercase leading-none tracking-[0.18em] text-[#8A7A4E]">
                {/* 아이보리 배경이라 ink 워드마크. 옆의 ID 라벨과 톤을 맞추려 opacity 로 눌렀다 */}
                <Image
                  src="/images/logo/acscent-wordmark-ink.png"
                  alt="AC'SCENT"
                  width={2053}
                  height={285}
                  className="h-[11px] w-auto select-none opacity-55"
                />
                ID
              </span>
              <span className="mt-1.5 block text-2xl font-medium leading-tight tracking-[-0.01em] text-[#1A1610]">
                {t('nav.visitReservation')}
              </span>
            </span>
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[#12141D]/80 transition-transform group-hover:translate-x-0.5">
              <ChevronRight size={20} className="text-[#EEB62B]" strokeWidth={2.8} />
            </span>
          </button>

          {/* 협업 문의 카드 */}
          <div className="rounded-[16px] border border-[#343A4C] bg-[#161925] p-8">
            <div className="mb-4 flex items-center gap-2">
              <Handshake size={20} className="text-[#EEB62B]" />
              <h2 className="font-heading text-xl font-bold tracking-[-0.02em] text-[#E9E2D0]">
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
              className="block w-full rounded-[12px] border-2 border-[#B8880F] bg-[#EEB62B] py-3 text-center text-base font-bold text-[#1A1610] transition-colors hover:bg-[#F2C24A]"
            >
              {t('home.viewCollaboration')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
