'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Handshake, MapPin } from 'lucide-react'
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
 * max-w-[1240px] 멀티컬럼으로 재배치한다.
 *
 * 에디토리얼 시스템: 페이지 배경 --canvas, 섹션은 전체 너비 밴드,
 * 반복 상품 아이템만 흰 카드(1px --line, 5px 라운드). 히어로는 실제 배너
 * 이미지를 풀블리드로 깔고 텍스트를 이미지 위에 직접 얹는다(다크 스크림).
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
    <div className="min-h-screen bg-[var(--canvas)] pt-[68px]">
      {/* ===== 히어로: 배너 풀블리드 + 오버레이 텍스트 ===== */}
      <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--dark-band)]">
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
                <div className="h-full w-full animate-pulse bg-[#2A2B29]" aria-hidden />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 가독성 스크림 — 좌측 진하게 (대비용, 장식 아님) */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />

        {/* 콘텐츠 (배경 클릭은 통과, 버튼만 활성) */}
        <div className="pointer-events-none relative z-10 mx-auto flex min-h-[440px] w-full max-w-[1240px] items-center px-6 py-12">
          <div className="max-w-[560px]">
            <p className="text-[12px] font-extrabold uppercase text-white/75">
              AC&apos;SCENT IDENTITY
            </p>
            <h1 className="mt-4 max-w-[14ch] break-keep text-balance text-4xl font-black leading-[1.25] text-white xl:text-5xl">
              {t('footer.tagline')}
            </h1>
            <p className="mt-5 max-w-[430px] whitespace-pre-line break-keep text-base leading-relaxed text-white/75">
              {t('home.collaborationDesc')}
            </p>
            <div className="mt-9 flex items-center gap-3">
              <a
                href="#programs-section-desktop"
                className="pointer-events-auto flex items-center gap-2 rounded-[5px] bg-white px-6 py-3.5 text-[15px] font-extrabold text-[var(--ink)] transition-colors hover:bg-[var(--soft)]"
              >
                {t('home.browsePrograms')}
              </a>
              <button
                type="button"
                onClick={onReserveClick}
                className="pointer-events-auto flex items-center gap-2 rounded-[5px] border border-white/80 px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
              >
                <MapPin size={16} />
                {t('nav.visitReservation')}
              </button>
            </div>
          </div>
        </div>

        {/* 슬라이더 컨트롤 — 우하단 클러스터 */}
        {banners.length > 1 && (
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-4">
            <div className="flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onSelectSlide(index)}
                  aria-label={`banner ${index + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'w-5 bg-white'
                      : 'w-2 bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={onPrevSlide}
                aria-label={t('home.prevBanner')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/60 active:scale-95"
              >
                <ChevronLeft size={22} className="text-white" />
              </button>
              <button
                onClick={onNextSlide}
                aria-label={t('home.nextBanner')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 transition-colors hover:bg-black/60 active:scale-95"
              >
                <ChevronRight size={22} className="text-white" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===== 프로그램 둘러보기 ===== */}
      <section id="programs-section-desktop" className="scroll-mt-[100px] bg-[var(--canvas)]">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-24">
          <div className="mb-10">
            <p className="text-[11px] font-black text-[var(--muted-ink)]">PROGRAMS</p>
            <h2 className="mt-2 break-keep text-[32px] font-black leading-tight text-[var(--ink)]">
              {t('home.browsePrograms')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => onCardClick(product.href)}
                className="group cursor-pointer"
              >
                <div className="flex h-full flex-row overflow-hidden rounded-[5px] border border-[var(--line)] bg-white transition-colors group-hover:border-[var(--ink)]">
                  <div className="relative aspect-square w-[220px] shrink-0 overflow-hidden bg-[var(--soft)]">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="220px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        data-pin-nopin="true"
                      />
                    ) : (
                      <div className="h-full w-full animate-pulse bg-[var(--soft)]" />
                    )}
                    {product.badge && (
                      <div
                        className={`absolute left-2.5 top-2.5 rounded-[3px] px-2 py-[3px] ${product.badgeColor || 'text-white'} text-[11px] font-bold uppercase`}
                        style={product.badgeStyle}
                      >
                        {product.badge}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col border-l border-[var(--line-soft)] px-5 py-5">
                    <h3 className="truncate break-keep text-[17px] font-bold text-[var(--ink)]">
                      {product.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line break-keep text-[13px] leading-snug text-[var(--muted-ink)]">
                      {product.subtitle}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[18px] font-extrabold text-[var(--ink)]">
                        {t('currency.symbol')}{product.price.toLocaleString()}{product.priceRange && '~'}
                      </span>
                      {product.originalPrice && (
                        <span className="text-[12px] text-[var(--muted-ink)] line-through">
                          {t('currency.symbol')}{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="mt-auto pt-2 text-[13px] text-[var(--muted-ink)]">
                      {product.delivery}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 오늘의 향 뽑기 (다크 밴드 컴포넌트) ===== */}
      {showTodayScent && <TodayScentDraw />}

      {/* ===== 상품 둘러보기 ===== */}
      <section className="border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-24">
          <div className="mb-10">
            <p className="text-[11px] font-black text-[var(--muted-ink)]">STORE</p>
            <h2 className="mt-2 break-keep text-[32px] font-black leading-tight text-[var(--ink)]">
              {t('home.browseProducts')}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {storeProducts.map((product) => (
              <div
                key={product.slug}
                onClick={() => onCardClick(`/products/${product.slug}`)}
                className="group cursor-pointer"
              >
                <div className="flex h-full flex-col overflow-hidden rounded-[5px] border border-[var(--line)] bg-white transition-colors group-hover:border-[var(--ink)]">
                  <div className="relative aspect-square overflow-hidden bg-[var(--soft)]">
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      sizes="360px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      data-pin-nopin="true"
                    />
                    <div className="absolute left-2.5 top-2.5 z-10 rounded-[3px] bg-[var(--ink)] px-2 py-[3px] text-[11px] font-bold uppercase text-white">
                      {product.badge}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col border-t border-[var(--line-soft)] px-4 py-4">
                    <h3 className="truncate break-keep text-[17px] font-bold text-[var(--ink)]">
                      {product.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 break-keep text-[13px] leading-snug text-[var(--muted-ink)]">
                      {product.description}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[18px] font-extrabold text-[var(--ink)]">
                        {t('currency.symbol')}{product.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-auto pt-2 text-[13px] text-[var(--muted-ink)]">
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
              className="inline-flex items-center gap-1.5 text-base font-bold text-[var(--ink)] underline underline-offset-4"
            >
              {t('store.viewAll')} <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 방문 예약 + 협업 문의 (다크 밴드) ===== */}
      <section className="bg-[var(--dark-band)] text-white">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-2 px-6 py-20">
          {/* 방문 예약 */}
          <div className="border-r border-[var(--dark-line)] pr-12">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-white" />
              <h2 className="break-keep text-xl font-black text-white">
                {t('nav.visitReservation')}
              </h2>
            </div>
            <p className="mt-3 break-keep text-sm leading-relaxed text-[var(--dark-muted)]">
              AC&apos;SCENT IDENTITY
            </p>
            <button
              type="button"
              onClick={onReserveClick}
              className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-white px-6 py-3 text-sm font-extrabold text-[var(--ink)] transition-colors hover:bg-[var(--soft)]"
            >
              {t('nav.visitReservation')}
              <ChevronRight size={15} />
            </button>
          </div>

          {/* 협업 문의 */}
          <div className="pl-12">
            <div className="flex items-center gap-2">
              <Handshake size={18} className="text-white" />
              <h2 className="break-keep text-xl font-black text-white">
                {t('home.collaboration')}
              </h2>
            </div>
            <ul className="mt-4 border-t border-[var(--dark-line)]">
              <li className="border-b border-[var(--dark-line)] py-2.5 text-sm text-[var(--dark-muted)]">{t('home.collaborationItem1')}</li>
              <li className="border-b border-[var(--dark-line)] py-2.5 text-sm text-[var(--dark-muted)]">{t('home.collaborationItem2')}</li>
              <li className="border-b border-[var(--dark-line)] py-2.5 text-sm text-[var(--dark-muted)]">{t('home.collaborationItem3')}</li>
            </ul>
            <Link
              href="/collaboration"
              className="mt-6 inline-flex items-center gap-2 rounded-[5px] border border-white/80 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              {t('home.viewCollaboration')}
              <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
