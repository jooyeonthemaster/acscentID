'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ChevronLeft, Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { MobileMenuSheet } from './MobileMenuSheet'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  hideLogo?: boolean
}

export function Header({ title, showBack, backHref = "/", hideLogo = false }: HeaderProps) {
  const { user, unifiedUser, loading, signOut } = useAuth()
  // 카카오 사용자는 unifiedUser에만 있음
  const currentUser = unifiedUser || user
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col transition-transform duration-300 w-full max-w-[455px]",
          // On PC: Always solid border. On Mobile: Transparent unless scrolled?
          // Let's go with Solid Kitsch Header always for consistency with the new "Homepage" request.
          "bg-white border-b-2 border-black shadow-md"
        )}
      >
        {/* Marquee Bar (Top) */}
        <div className="w-full bg-yellow-400 border-b-2 border-black py-1 overflow-hidden flex items-center h-7">
          <div className="animate-ticker whitespace-nowrap flex gap-6 items-center font-black text-[9px] tracking-[0.15em] uppercase text-black">
            {Array(8).fill("AC'SCENT IDENTITY • AI 이미지 분석으로 나만의 향을 추천 • ").map((text, i) => (
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

          {/* Center: Title or Logo (항상 모바일 레이아웃) */}
          <div className="flex-[2] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {title ? (
                <motion.span
                  key={title}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-xs font-black tracking-[0.2em] text-slate-800 uppercase block truncate px-2"
                >
                  {title}
                </motion.span>
              ) : !hideLogo ? (
                <Link href="/">
                  <motion.div
                    key="logo"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
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
              ) : null}
            </AnimatePresence>
          </div>

          {/* Right: Login Status + Hamburger Menu */}
          <div className="flex-1 flex justify-end items-center gap-2">
            {/* 로그인 상태 표시 */}
            {!loading && currentUser ? (
              <div className="flex items-center gap-2">
                {/* 아바타 */}
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
                <span className="text-[10px] font-bold text-yellow-700">로그인</span>
              </button>
            ) : null}

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="w-9 h-9 rounded-full border-2 border-black flex flex-col items-center justify-center gap-0.5 bg-white hover:bg-yellow-400 transition-all active:scale-90 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-0 hover:translate-x-[2px] hover:translate-y-[2px]"
              aria-label="메뉴 열기"
            >
              <motion.span
                animate={isOpen ? { rotate: 45, y: 4, width: "16px" } : { rotate: 0, y: 0, width: "16px" }}
                className="h-[2px] bg-black rounded-full origin-center transition-all duration-300"
              />
              <motion.span
                animate={isOpen ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
                className="h-[2px] w-[16px] bg-black rounded-full transition-all duration-300"
              />
              <motion.span
                animate={isOpen ? { rotate: -45, y: -4, width: "16px" } : { rotate: 0, y: 0, width: "16px" }}
                className="h-[2px] bg-black rounded-full origin-center transition-all duration-300"
              />
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
