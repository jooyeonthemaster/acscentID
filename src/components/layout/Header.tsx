'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, ChevronLeft, Star, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { MobileMenuSheet } from './MobileMenuSheet'
import { LanguageSwitcher } from './LanguageSwitcher'
import { cn } from '@/lib/utils'
import { onCartChanged } from '@/lib/cart-events'
import { useTranslations } from 'next-intl'
import { useViewportMode } from '@/hooks/useViewportMode'
import { isDesktopChromeExcludedPath } from '@/lib/desktop/routes'

interface HeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  hideLogo?: boolean
  compact?: boolean
  /** 사주 등 다크 테마 프로그램에서 전역 헤더를 어둡게 재스킨 */
  dark?: boolean
}

// title / hideLogo 은 하위호환을 위해 props 에 유지하되, 중앙 로고는 항상 표시한다.
export function Header({ showBack, backHref = "/", compact = false, dark = false }: HeaderProps) {
  const { user, unifiedUser, loading, signOut } = useAuth()
  const currentUser = unifiedUser || user
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const viewportMode = useViewportMode()
  // 데스크탑 크롬이 켜진 라우트에서는 lg+에서 DesktopHeader가 대신 렌더링된다
  const hideAtLg = !isDesktopChromeExcludedPath(pathname)

  // 장바구니 개수 조회 (로그인 시)
  const refreshCartCount = useCallback(() => {
    if (!currentUser) {
      setCartCount(0)
      return
    }
    fetch('/api/cart?count=true')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data) setCartCount(data.count || 0) })
      .catch(() => {})
  }, [currentUser])

  // 로그인 변경 + 페이지 이동 시 갱신 (담은 뒤 장바구니로 이동하는 흐름까지 커버)
  useEffect(() => {
    refreshCartCount()
  }, [refreshCartCount, pathname])

  // 담기/삭제 등 장바구니 변경 이벤트 시 즉시 개수 갱신
  useEffect(() => {
    return onCartChanged(refreshCartCount)
  }, [refreshCartCount])

  // 하이드레이션 후 데스크탑으로 확정되면 모바일 헤더는 언마운트 (lg 미만 동작 불변)
  if (hideAtLg && viewportMode === 'desktop') return null

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col transition-transform duration-300 w-full max-w-[455px] font-wanted",
          dark
            ? "bg-[var(--dark-band)] border-b border-[var(--dark-line)]"
            : "bg-white/[0.97] border-b border-[var(--line)]",
          hideAtLg && "lg:hidden"
        )}
      >
        {!compact && (
          <div className="w-full bg-[var(--dark-band)] border-b border-[var(--dark-band)] py-1 overflow-hidden flex items-center h-7">
            <div className="animate-ticker whitespace-nowrap flex gap-6 items-center font-black text-[9px] uppercase text-white">
              {Array(8).fill(t('header.marquee')).map((text, i) => (
                <span key={i} className="flex items-center gap-2">
                  {text} <Star size={8} fill="#ADAEAA" />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Main Header Bar — 로고는 absolute 정중앙 고정, 좌/우 컨트롤 폭에 영향받지 않는다 */}
        <div className="relative w-full px-4 h-14 flex items-center justify-between">
          {/* Left: Back Icon + Language */}
          <div className="flex items-center justify-start gap-1.5 z-10">
            {showBack ? (
              <Link
                href={backHref}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors border border-transparent",
                  dark
                    ? "text-white hover:bg-white/10 hover:border-[var(--dark-line)]"
                    : "text-[var(--ink)] hover:bg-[var(--soft)] hover:border-[var(--line)]"
                )}
                onClick={(e) => {
                  if (backHref === 'back') {
                    e.preventDefault();
                    window.history.back();
                  }
                }}
              >
                <ChevronLeft size={20} />
              </Link>
            ) : null}
            {/* Language Switcher — 로고 중앙 정렬을 위해 좌측 배치 */}
            <LanguageSwitcher dark={dark} />
          </div>

          {/* Center: 항상 홈으로 가는 로고 버튼 (absolute 정중앙) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
            <Link href="/" aria-label={t('nav.home')} className="pointer-events-auto">
              <motion.div
                key="logo"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <Image
                  src={dark ? "/images/logo/acscent-wordmark-cream.png" : "/images/logo/acscent-wordmark-ink.png"}
                  alt="AC'SCENT"
                  width={2053}
                  height={285}
                  priority
                  className="h-[15px] w-auto select-none"
                />
                <span className={cn(
                  "text-[7px] font-bold tracking-[0.25em] mt-[3px]",
                  dark ? "text-[var(--dark-muted)]" : "text-[var(--muted-ink)]"
                )}>
                  IDENTITY
                </span>
              </motion.div>
            </Link>
          </div>

          {/* Right: Login + Cart + Hamburger Menu */}
          <div className="flex justify-end items-center gap-1.5 z-10">
            {!loading && currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/mypage"
                  aria-label={t('nav.myPage')}
                  className={cn(
                    "w-7 h-7 rounded-full border overflow-hidden transition-all active:scale-90",
                    dark
                      ? "border-[var(--dark-line)] bg-white/10"
                      : "border-[var(--line)] bg-[var(--soft)] hover:border-[var(--ink)]"
                  )}
                >
                  {(unifiedUser?.avatar_url || user?.user_metadata?.avatar_url) ? (
                    <img src={unifiedUser?.avatar_url || user?.user_metadata?.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={cn(
                      "w-full h-full flex items-center justify-center",
                      dark ? "bg-white/10" : "bg-[var(--soft)]"
                    )}>
                      <User size={12} className={dark ? "text-white" : "text-[var(--muted-ink)]"} />
                    </div>
                  )}
                </Link>
              </div>
            ) : !loading && !currentUser ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 border rounded-[5px] transition-colors whitespace-nowrap",
                  dark
                    ? "bg-white/10 border-[var(--dark-line)] hover:bg-white/20"
                    : "bg-white border-[var(--ink)] hover:bg-[var(--soft)]"
                )}
              >
                <User size={12} className={dark ? "text-[var(--dark-muted)]" : "text-[var(--ink)]"} />
                <span className={cn("text-[10px] lg:text-[12px] font-bold", dark ? "text-[var(--dark-muted)]" : "text-[var(--ink)]")}>{t('nav.login')}</span>
              </button>
            ) : null}

            {/* Cart Button */}
            <button
              onClick={() => router.push('/mypage?tab=cart')}
              className={cn(
                "relative w-9 h-9 rounded-full border flex items-center justify-center transition-all active:scale-90",
                dark
                  ? "border-[var(--dark-line)] bg-white/10 hover:border-white hover:bg-white/20"
                  : "border-[var(--line)] bg-white hover:border-[var(--ink)] hover:bg-[var(--soft)]"
              )}
              aria-label={t('nav.cart')}
            >
              <ShoppingCart size={16} className={dark ? "text-white" : "text-[var(--ink)]"} strokeWidth={2.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 border-2 border-white text-white text-[10px] lg:text-[12px] font-black leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Sheet */}
            <MobileMenuSheet
              isOpen={isOpen}
              onOpenChange={setIsOpen}
              user={user}
              unifiedUser={unifiedUser}
              loading={loading}
              onSignOut={signOut}
              onLoginClick={() => setShowAuthModal(true)}
            />
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/mypage"
      />
    </>
  )
}
