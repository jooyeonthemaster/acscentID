'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, ChevronLeft, Star, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { MobileMenuSheet } from './MobileMenuSheet'
import { LanguageSwitcher } from './LanguageSwitcher'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface HeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  hideLogo?: boolean
}

// title / hideLogo 은 하위호환을 위해 props 에 유지하되, 중앙 로고는 항상 표시한다.
export function Header({ showBack, backHref = "/" }: HeaderProps) {
  const { user, unifiedUser, loading, signOut } = useAuth()
  const currentUser = unifiedUser || user
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const t = useTranslations()
  const router = useRouter()

  // 장바구니 개수 조회 (로그인 시)
  useEffect(() => {
    if (!currentUser) {
      setCartCount(0)
      return
    }
    let cancelled = false
    fetch('/api/cart?count=true')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled && data) setCartCount(data.count || 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [currentUser])

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col transition-transform duration-300 w-full max-w-[455px]",
          "bg-white border-b-2 border-black shadow-md"
        )}
      >
        {/* Marquee Bar (Top) */}
        <div className="w-full bg-yellow-400 border-b-2 border-black py-1 overflow-hidden flex items-center h-7">
          <div className="animate-ticker whitespace-nowrap flex gap-6 items-center font-black text-[9px] tracking-[0.15em] uppercase text-black">
            {Array(8).fill(t('header.marquee')).map((text, i) => (
              <span key={i} className="flex items-center gap-2">
                {text} <Star size={8} fill="black" />
              </span>
            ))}
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="w-full px-4 h-14 flex items-center justify-between">
          {/* Left: Back Icon OR Logo (Desktop) */}
          <div className="flex-1 flex items-center justify-start">
            {showBack ? (
              <Link
                href={backHref}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-900 hover:bg-slate-100 transition-colors border-2 border-transparent hover:border-black"
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
          </div>

          {/* Center: 항상 홈으로 가는 로고 버튼 */}
          <div className="flex-[2] flex items-center justify-center">
            <Link href="/" aria-label={t('nav.home')}>
              <motion.div
                key="logo"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <span className="text-base font-black tracking-tighter text-slate-900">
                  AC&apos;SCENT
                </span>
                <span className="text-[7px] font-bold tracking-[0.25em] text-slate-500 -mt-1">
                  IDENTITY
                </span>
              </motion.div>
            </Link>
          </div>

          {/* Right: Language + Login + Hamburger Menu */}
          <div className="flex-1 flex justify-end items-center gap-1.5">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {!loading && currentUser ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {(unifiedUser?.avatar_url || user?.user_metadata?.avatar_url) ? (
                    <img src={unifiedUser?.avatar_url || user?.user_metadata?.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <User size={12} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            ) : !loading && !currentUser ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1 px-2 py-1 bg-yellow-100 border-2 border-yellow-400 rounded-full hover:bg-yellow-200 transition-colors whitespace-nowrap"
              >
                <User size={12} className="text-yellow-700" />
                <span className="text-[10px] font-bold text-yellow-700">{t('nav.login')}</span>
              </button>
            ) : null}

            {/* Cart Button */}
            <button
              onClick={() => router.push('/mypage?tab=cart')}
              className="relative w-9 h-9 rounded-full border-2 border-black flex items-center justify-center bg-white hover:bg-yellow-400 transition-all active:scale-90 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-0 hover:translate-x-[2px] hover:translate-y-[2px]"
              aria-label={t('nav.cart')}
            >
              <ShoppingCart size={16} className="text-black" strokeWidth={2.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-black leading-none">
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
