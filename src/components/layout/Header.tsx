'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ChevronLeft, Star, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { MobileMenuSheet, NAV_LINKS } from './MobileMenuSheet'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  hideLogo?: boolean
}

// Desktop Dropdown Component
function DesktopDropdown({
  title,
  links,
  isActive
}: {
  title: string
  links: Array<{ href: string; label: string }>
  isActive: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={cn(
          "flex items-center gap-1 px-3 py-2 rounded-lg font-bold text-sm transition-all",
          isActive
            ? "text-purple-600 bg-purple-50"
            : "text-slate-700 hover:text-black hover:bg-slate-50"
        )}
      >
        {title}
        <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-48 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden z-50"
          >
            {links.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-yellow-100 hover:text-black transition-colors",
                  index !== links.length - 1 && "border-b border-slate-200"
                )}
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header({ title, showBack, backHref = "/", hideLogo = false }: HeaderProps) {
  const { user, unifiedUser, loading, signOut } = useAuth()
  const pathname = usePathname()
  // 카카오 사용자는 unifiedUser에만 있음
  const currentUser = unifiedUser || user
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Check if current path is active
  const isAboutActive = pathname?.startsWith('/about') || false
  const isProgramsActive = pathname?.startsWith('/programs') || false

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 flex flex-col transition-transform duration-300",
          // On PC: Always solid border. On Mobile: Transparent unless scrolled? 
          // Let's go with Solid Kitsch Header always for consistency with the new "Homepage" request.
          "bg-white border-b-2 border-black shadow-md"
        )}
      >
        {/* Marquee Bar (Top) */}
        <div className="w-full bg-yellow-400 border-b-2 border-black py-1.5 overflow-hidden flex items-center h-8">
          <div className="animate-ticker whitespace-nowrap flex gap-8 items-center font-black text-[10px] tracking-[0.2em] uppercase text-black">
            {Array(10).fill("AC'SCENT IDENTITY • FIND YOUR IDOL SCENT • ").map((text, i) => (
              <span key={i} className="flex items-center gap-2">
                {text} <Star size={10} fill="black" />
              </span>
            ))}
          </div>
        </div>

        {/* Main Header Bar */}
        <div className="w-full px-6 h-16 flex items-center justify-between max-w-7xl mx-auto">
          {/* Left: Back Icon OR Logo (Desktop) */}
          <div className="flex-1 flex items-center justify-start">
            {showBack ? (
              <Link
                href={backHref}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-900 hover:bg-slate-100 transition-colors border-2 border-transparent hover:border-black"
                onClick={(e) => {
                  if (backHref === 'back') {
                    e.preventDefault();
                    window.history.back();
                  }
                }}
              >
                <ChevronLeft size={24} />
              </Link>
            ) : (
              /* Desktop Logo Position (Left) */
              <Link href="/" className="hidden md:flex flex-col items-start group">
                <span className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 transition-all">
                  AC&apos;SCENT
                </span>
                <span className="text-[9px] font-bold tracking-[0.4em] text-slate-500 -mt-1 group-hover:text-slate-900">
                  IDENTITY
                </span>
              </Link>
            )}
          </div>

          {/* Center: Title (Mobile) or Desktop Navigation */}
          <div className="flex-[2] flex items-center justify-center">
            {/* Mobile: Title or Logo */}
            <div className="md:hidden">
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
                      <span className="text-lg font-black tracking-tighter text-slate-900">
                        AC&apos;SCENT
                      </span>
                      <span className="text-[8px] font-bold tracking-[0.3em] text-slate-500 -mt-1">
                        IDENTITY
                      </span>
                    </motion.div>
                  </Link>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Desktop: Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <DesktopDropdown title="About" links={NAV_LINKS.about} isActive={isAboutActive} />
              <DesktopDropdown title="Programs" links={NAV_LINKS.programs} isActive={isProgramsActive} />
              <Link
                href="/mypage"
                className={cn(
                  "px-3 py-2 rounded-lg font-bold text-sm transition-all",
                  pathname === '/mypage'
                    ? "text-purple-600 bg-purple-50"
                    : "text-slate-700 hover:text-black hover:bg-slate-50"
                )}
              >
                My Page
              </Link>
            </nav>
          </div>

          {/* Right: Login Status + Hamburger Menu */}
          <div className="flex-1 flex justify-end items-center gap-3">
            {/* 로그인 상태 표시 */}
            {!loading && currentUser ? (
              <div className="flex items-center gap-2">
                {/* 로그인 배지 */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 border-2 border-green-400 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-green-700 tracking-wide">로그인됨</span>
                </div>
                {/* 아바타 */}
                <div className="w-8 h-8 rounded-full border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {(unifiedUser?.avatar_url || user?.user_metadata?.avatar_url) ? (
                    <img src={unifiedUser?.avatar_url || user?.user_metadata?.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <User size={14} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            ) : !loading && !currentUser ? (
              <button
                onClick={() => setShowAuthModal(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-yellow-100 border-2 border-yellow-400 rounded-full hover:bg-yellow-200 transition-colors"
              >
                <User size={12} className="text-yellow-700" />
                <span className="text-[10px] font-bold text-yellow-700 tracking-wide">로그인</span>
              </button>
            ) : null}

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsOpen(true)}
              className="w-10 h-10 rounded-full border-2 border-black flex flex-col items-center justify-center gap-1 bg-white hover:bg-yellow-400 transition-all active:scale-90 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-x-0 hover:translate-x-[2px] hover:translate-y-[2px]"
              aria-label="메뉴 열기"
            >
              <motion.span
                animate={isOpen ? { rotate: 45, y: 5, width: "20px" } : { rotate: 0, y: 0, width: "20px" }}
                className="h-[2px] bg-black rounded-full origin-center transition-all duration-300"
              />
              <motion.span
                animate={isOpen ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
                className="h-[2px] w-[20px] bg-black rounded-full transition-all duration-300"
              />
              <motion.span
                animate={isOpen ? { rotate: -45, y: -5, width: "20px" } : { rotate: 0, y: 0, width: "20px" }}
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
