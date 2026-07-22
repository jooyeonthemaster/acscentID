'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { User, Star, ShoppingCart, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { cn } from '@/lib/utils'
import { useCartCount } from '@/hooks/useCartCount'
import { useViewportMode } from '@/hooks/useViewportMode'
import { isDesktopChromeExcludedPath } from '@/lib/desktop/routes'
import { useActiveProducts } from '@/hooks/useAdminContent'
import { useStoreProducts } from '@/hooks/useStoreProducts'
import { useStoreProductText } from '@/hooks/useStoreProductText'
import { stripLocaleFromPathname } from '@/lib/route-visibility'

// MobileBottomNav의 ALL_PROGRAM_LINKS와 동일한 슬러그/키 (데스크탑 드롭다운용)
const PROGRAM_MENU_LINKS = [
  { slug: 'idol-image', href: '/programs/idol-image', labelKey: 'products.idolImage' as const },
  { slug: 'figure', href: '/programs/figure', labelKey: 'products.figureDiffuser' as const },
  { slug: 'graduation', href: '/programs/graduation', labelKey: 'products.graduation' as const },
  { slug: 'personal', href: '/programs/personal', labelKey: 'products.personal' as const },
  { slug: 'chemistry', href: '/programs/chemistry', labelKey: 'products.chemistry' as const },
  { slug: 'saju', href: '/programs/saju', labelKey: 'products.saju' as const },
  { slug: 'le-quack', href: '/programs/le-quack', labelKey: 'products.leQuack' as const },
  { slug: 'today-scent', href: '/programs/today-scent', labelKey: 'todayScent.title' as const },
]

/** 노출 상품 필터가 필요한 드롭다운 내용물 — 첫 오픈 시에만 마운트해 모바일에서 불필요한 fetch를 막는다 */
function DropdownSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex min-w-[240px] flex-col gap-1 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-[4px] bg-[var(--soft)]" />
      ))}
    </div>
  )
}

function ProgramsMenu({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations()
  const { isProductVisible, loading } = useActiveProducts()

  // 로딩 중에는 FALLBACK(전체)이 필터 전에 잠깐 노출되는 버그를 막기 위해 스켈레톤만 렌더링
  if (loading) return <DropdownSkeleton />

  const links = PROGRAM_MENU_LINKS.filter((link) => isProductVisible(link.slug))

  return (
    <div className="flex min-w-[240px] flex-col gap-0.5 p-2">
      {links.map((link) => (
        <Link
          key={link.slug}
          href={link.href}
          onClick={onNavigate}
          className="rounded-[4px] px-3 py-2.5 text-sm lg:text-base font-bold text-[var(--muted-ink)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)]"
        >
          {t(link.labelKey)}
        </Link>
      ))}
    </div>
  )
}

/** 스토어 상품 드롭다운 — 첫 오픈 시에만 마운트 */
function StoreProductsMenu({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations()
  const { products, loading } = useStoreProducts()
  const storeText = useStoreProductText()

  // 로딩 중에는 STORE_PRODUCTS(전체)가 isActive 필터 전에 잠깐 노출되는 것을 막는다
  if (loading) return <DropdownSkeleton rows={3} />

  const visible = products
    .filter((product) => product.isActive !== false)
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  return (
    <div className="flex min-w-[200px] flex-col gap-0.5 p-2">
      {visible.map((product) => (
        <Link
          key={product.slug}
          href={`/products/${product.slug}`}
          onClick={onNavigate}
          className="rounded-[4px] px-3 py-2.5 text-sm lg:text-base font-bold text-[var(--muted-ink)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)]"
        >
          {storeText(product).title}
        </Link>
      ))}
      <Link
        href="/products"
        onClick={onNavigate}
        className="mt-0.5 border-t border-[var(--line)] px-3 pb-1 pt-2.5 text-xs lg:text-sm font-bold text-[var(--muted-ink)] transition-colors hover:text-[var(--ink)]"
      >
        {t('store.viewAll')}
      </Link>
    </div>
  )
}

function NavDropdown({
  label,
  children,
  open,
  onOpenChange,
}: {
  label: string
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <div
      className="relative h-full"
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex h-full items-center gap-1 text-sm lg:text-base font-bold transition-colors',
          open ? 'text-[var(--ink)]' : 'text-[var(--muted-ink)] hover:text-[var(--ink)]',
        )}
      >
        {label}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full pt-2">
          <div className="rounded-[6px] border border-[var(--line)] bg-white shadow-sm">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * lg 이상 전용 전역 헤더. 모바일 Header(84px = 마키 28px + 바 56px)와
 * 총 높이를 정확히 일치시켜, 기존 페이지들의 pt-[84px] 오프셋이 lg에서도
 * 수정 없이 동작하게 한다.
 */
export function DesktopHeader() {
  const pathname = usePathname()
  const mode = useViewportMode()
  const { user, unifiedUser, loading } = useAuth()
  const currentUser = unifiedUser || user
  const cartCount = useCartCount()
  const t = useTranslations()
  const router = useRouter()

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [programsOpen, setProgramsOpen] = useState(false)
  const [programsEverOpened, setProgramsEverOpened] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [productsEverOpened, setProductsEverOpened] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  if (isDesktopChromeExcludedPath(pathname)) return null
  if (mode === 'mobile') return null

  const currentPath = stripLocaleFromPathname(pathname)

  const handleProgramsOpen = (open: boolean) => {
    setProgramsOpen(open)
    if (open) setProgramsEverOpened(true)
  }

  const handleProductsOpen = (open: boolean) => {
    setProductsOpen(open)
    if (open) setProductsEverOpened(true)
  }

  const navLinkClass = (active: boolean) =>
    cn(
      'flex h-full items-center text-sm lg:text-base font-bold transition-colors',
      active ? 'text-[var(--ink)]' : 'text-[var(--muted-ink)] hover:text-[var(--ink)]',
    )

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 hidden flex-col border-b border-[var(--line)] bg-white/[0.97] lg:flex">
        {/* 마키 티커 — 모바일 헤더와 동일 마크업/높이(28px) */}
        <div className="flex h-7 w-full items-center overflow-hidden border-b border-[var(--dark-band)] bg-[var(--dark-band)] py-1">
          <div className="animate-ticker flex items-center gap-6 whitespace-nowrap text-[9px] font-black uppercase text-white">
            {Array(16).fill(t('header.marquee')).map((text, i) => (
              <span key={i} className="flex items-center gap-2">
                {text} <Star size={8} fill="#ADAEAA" />
              </span>
            ))}
          </div>
        </div>

        {/* 메인 바 — 56px */}
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-10 px-6">
          {/* 로고 */}
          <Link href="/" aria-label={t('nav.home')} className="flex flex-col items-center">
            <Image
              src="/images/logo/acscent-wordmark-ink.png"
              alt="AC'SCENT"
              width={2053}
              height={285}
              priority
              className="h-[15px] w-auto select-none"
            />
            <span className="mt-[3px] text-[7px] font-bold tracking-[0.25em] text-[var(--muted-ink)]">
              IDENTITY
            </span>
          </Link>

          {/* 내비게이션 */}
          <nav className="flex h-full flex-1 items-center gap-8">
            <NavDropdown label={t('nav.programs')} open={programsOpen} onOpenChange={handleProgramsOpen}>
              {programsEverOpened && <ProgramsMenu onNavigate={() => setProgramsOpen(false)} />}
            </NavDropdown>
            <NavDropdown label={t('nav.products')} open={productsOpen} onOpenChange={handleProductsOpen}>
              {productsEverOpened && <StoreProductsMenu onNavigate={() => setProductsOpen(false)} />}
            </NavDropdown>
            <NavDropdown label={t('nav.about')} open={aboutOpen} onOpenChange={setAboutOpen}>
              <div className="flex min-w-[200px] flex-col gap-0.5 p-2">
                <Link
                  href="/about/brand"
                  onClick={() => setAboutOpen(false)}
                  className="rounded-[4px] px-3 py-2.5 text-sm lg:text-base font-bold text-[var(--muted-ink)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)]"
                >
                  {t('footer.brandStory')}
                </Link>
                <Link
                  href="/about/how-it-works"
                  onClick={() => setAboutOpen(false)}
                  className="rounded-[4px] px-3 py-2.5 text-sm lg:text-base font-bold text-[var(--muted-ink)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)]"
                >
                  {t('footer.howItWorks')}
                </Link>
              </div>
            </NavDropdown>
            <Link href="/collaboration" className={navLinkClass(currentPath === '/collaboration')}>
              {t('footer.collaboration')}
            </Link>
            <Link href="/faq" className={navLinkClass(currentPath === '/faq')}>
              {t('footer.faq')}
            </Link>
          </nav>

          {/* 우측 컨트롤 — 모바일 헤더와 동일한 컴포넌트/스타일 재사용 */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {!loading && currentUser ? (
              <Link
                href="/mypage"
                aria-label={t('nav.myPage')}
                className="h-8 w-8 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--soft)] transition-all hover:border-[var(--ink)] active:scale-90"
              >
                {(unifiedUser?.avatar_url || user?.user_metadata?.avatar_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={unifiedUser?.avatar_url || user?.user_metadata?.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--soft)]">
                    <User size={13} className="text-[var(--muted-ink)]" />
                  </div>
                )}
              </Link>
            ) : !loading && !currentUser ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border border-[var(--ink)] bg-white px-3 py-1.5 transition-colors hover:bg-[var(--soft)]"
              >
                <User size={13} className="text-[var(--ink)]" />
                <span className="text-[11px] lg:text-[13px] font-bold text-[var(--ink)]">{t('nav.login')}</span>
              </button>
            ) : null}
            <button
              onClick={() => router.push('/mypage?tab=cart')}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white transition-all hover:border-[var(--ink)] hover:bg-[var(--soft)] active:scale-90"
              aria-label={t('nav.cart')}
            >
              <ShoppingCart size={16} className="text-[var(--ink)]" strokeWidth={2.5} />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] lg:text-[12px] font-black leading-none text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/mypage"
      />
    </>
  )
}
