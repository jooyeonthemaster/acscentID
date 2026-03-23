'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Sparkles, User, Menu, X, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTransition } from '@/contexts/TransitionContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { MobileMenuSheet } from './MobileMenuSheet'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

// Programs 드롭업 메뉴 항목
const PROGRAM_LINKS = [
  { href: '/programs/idol-image', labelKey: 'programs.subtitle.idolImage' as const, descKey: 'programs.subtitle.idolImage' as const, image: '/images/perfume/KakaoTalk_20260125_225218071.jpg' },
  { href: '/programs/figure', labelKey: 'programs.subtitle.figure' as const, descKey: 'programs.subtitle.figure' as const, image: '/images/diffuser/KakaoTalk_20260125_225229624.jpg' },
]

// NavItem 컴포넌트
function NavItem({
  href,
  icon: Icon,
  label,
  isActive
}: {
  href: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  label: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all",
        isActive
          ? "text-yellow-600"
          : "text-slate-600 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-xl transition-all",
        isActive && "bg-yellow-100"
      )}>
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className={cn(
        "text-[10px] tracking-wide",
        isActive ? "font-black" : "font-bold"
      )}>{label}</span>
    </Link>
  )
}

// ProgramsSheet 컴포넌트 - 하단 시트 모달
function ProgramsSheet({
  onClose
}: {
  onClose: () => void
}) {
  const t = useTranslations()

  return (
    <>
      {/* 백드롭 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* 하단 시트 모달 */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[455px] z-50 bg-white border-t-2 border-black rounded-t-3xl shadow-[0_-8px_0px_0px_rgba(250,204,21,1)]"
      >
        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-6 pb-4 border-b-2 border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">{t('nav.programSelect')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('nav.programSelectDesc')}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <X size={16} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* 프로그램 목록 */}
        <div className="p-4 pb-8 space-y-3">
          {PROGRAM_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex items-center gap-4 p-4 border-2 rounded-2xl transition-all group bg-slate-50 border-slate-200 hover:border-purple-400 hover:bg-purple-50"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-black flex items-center justify-center overflow-hidden transition-all shadow-[3px_3px_0px_0px_rgba(250,204,21,1)] group-hover:shadow-[3px_3px_0px_0px_rgba(147,51,234,1)]">
                  <img src={link.image} alt={t(link.labelKey)} className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold transition-colors text-slate-900 group-hover:text-purple-700">{t(link.labelKey)}</h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">
                  {t(link.descKey)}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center transition-all border-slate-200 group-hover:border-purple-400 group-hover:bg-purple-100">
                <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-600" />
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user, unifiedUser, loading, signOut } = useAuth()
  const { startTransition } = useTransition()
  const currentUser = unifiedUser || user
  const t = useTranslations()

  const [showProgramsMenu, setShowProgramsMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  const isAdminPage = pathname?.startsWith('/admin')

  const isIdolImagePage = pathname === '/programs/idol-image'
  const isFigurePage = pathname === '/programs/figure'
  const isGraduationPage = pathname === '/programs/graduation'
  const isProgramDetailPage = isIdolImagePage || isFigurePage || isGraduationPage

  useEffect(() => {
    if (isAdminPage) return

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollDelta = currentScrollY - lastScrollY.current

          if (Math.abs(scrollDelta) > 10) {
            if (scrollDelta > 0 && currentScrollY > 100) {
              setIsVisible(false)
            } else if (scrollDelta < 0) {
              setIsVisible(true)
            }
            lastScrollY.current = currentScrollY
          }

          if (currentScrollY < 50) {
            setIsVisible(true)
          }

          ticking.current = false
        })
        ticking.current = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isAdminPage])

  if (isAdminPage) return null

  const isHomeActive = pathname === '/'
  const isProgramsActive = pathname?.startsWith('/programs') || false
  const isMyPageActive = pathname === '/mypage' || pathname?.startsWith('/mypage') || false

  const handleLoginClick = () => {
    setShowAuthModal(true)
  }

  const handleProgramCTAClick = () => {
    if (loading) return

    if (isIdolImagePage) {
      if (currentUser) {
        startTransition('/input?type=idol_image&mode=online')
      } else {
        setShowAuthModal(true)
      }
    } else if (isFigurePage) {
      if (currentUser) {
        startTransition('/input?type=figure&mode=online')
      } else {
        setShowAuthModal(true)
      }
    } else if (isGraduationPage) {
      if (currentUser) {
        startTransition('/input?type=graduation&mode=online')
      } else {
        setShowAuthModal(true)
      }
    }
  }

  return (
    <>
      {/* 프로그램 상세 페이지: CTA 버튼 */}
      {isProgramDetailPage && (
        <div
          className={cn(
            "fixed left-1/2 -translate-x-1/2 w-full max-w-[455px] z-50 px-4 py-2 bg-white border-t-2 border-black safe-area-bottom",
            "transition-all duration-300 ease-out",
            isVisible ? "bottom-16" : "bottom-0 shadow-[0_-4px_0px_0px_rgba(250,204,21,1)]"
          )}
        >
          <button
            onClick={handleProgramCTAClick}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {t('buttons.analyzeNow')}
          </button>
        </div>
      )}

      {/* 하단 네비게이션 바 (4탭) */}
      <nav
        className={cn(
          "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[455px] z-40 bg-white border-t-2 border-black shadow-[0_-4px_0px_0px_rgba(250,204,21,1)] safe-area-bottom",
          "transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-around h-16 px-2 relative">
          <NavItem
            href="/"
            icon={Home}
            label="Home"
            isActive={isHomeActive}
          />

          <button
            onClick={() => setShowProgramsMenu(!showProgramsMenu)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all relative",
              isProgramsActive || showProgramsMenu
                ? "text-yellow-600"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-xl transition-all",
              (isProgramsActive || showProgramsMenu) && "bg-yellow-100"
            )}>
              {showProgramsMenu ? (
                <X size={20} strokeWidth={2.5} />
              ) : (
                <Sparkles size={20} strokeWidth={isProgramsActive ? 2.5 : 2} />
              )}
            </div>
            <span className={cn(
              "text-[10px] tracking-wide",
              isProgramsActive ? "font-black" : "font-bold"
            )}>Programs</span>
          </button>

          {currentUser ? (
            <Link
              href="/mypage"
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all",
                isMyPageActive
                  ? "text-yellow-600"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all",
                isMyPageActive && "bg-yellow-100"
              )}>
                <User size={20} strokeWidth={isMyPageActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] tracking-wide",
                isMyPageActive ? "font-black" : "font-bold"
              )}>My</span>
            </Link>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all text-slate-600 hover:text-slate-900"
            >
              <div className="p-1.5 rounded-xl transition-all">
                <User size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] tracking-wide font-bold">{t('nav.login')}</span>
            </button>
          )}

          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-slate-600 hover:text-slate-900 transition-all"
          >
            <div className="p-1.5 rounded-xl">
              <Menu size={20} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold tracking-wide">{t('nav.menu')}</span>
          </button>

          <AnimatePresence>
            {showProgramsMenu && (
              <ProgramsSheet
                onClose={() => setShowProgramsMenu(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </nav>

      <MobileMenuSheet
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        user={user}
        unifiedUser={unifiedUser}
        loading={loading}
        onSignOut={signOut}
        onLoginClick={handleLoginClick}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath={
          isIdolImagePage ? '/input?type=idol_image&mode=online' :
            isFigurePage ? '/input?type=figure&mode=online' :
              isGraduationPage ? '/input?type=graduation&mode=online' :
                '/mypage'
        }
      />
    </>
  )
}
