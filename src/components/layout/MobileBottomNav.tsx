'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Sparkles, User, Menu, X, ChevronRight, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { MobileMenuSheet } from './MobileMenuSheet'
import { cn } from '@/lib/utils'

// Programs 드롭업 메뉴 항목
const PROGRAM_LINKS = [
  { href: '/programs/idol-image', label: 'AI 이미지 분석', emoji: '🎤' },
  { href: '/programs/figure', label: '피규어 향수', emoji: '🎭' },
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
  links,
  onClose
}: {
  links: typeof PROGRAM_LINKS
  onClose: () => void
}) {
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black rounded-t-3xl shadow-[0_-8px_0px_0px_rgba(250,204,21,1)]"
      >
        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-6 pb-4 border-b-2 border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">프로그램 선택</h3>
              <p className="text-xs text-slate-500 mt-0.5">원하는 프로그램을 선택해주세요</p>
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
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="flex items-center gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(250,204,21,1)] flex items-center justify-center text-2xl group-hover:shadow-[3px_3px_0px_0px_rgba(147,51,234,1)] transition-all">
                {link.emoji}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">{link.label}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {link.href === '/programs/idol-image' ? '최애의 무드를 향기로 재해석' : '캐릭터의 서사를 담은 향'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center group-hover:border-purple-400 group-hover:bg-purple-100 transition-all">
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
  const router = useRouter()
  const { user, unifiedUser, loading, signOut } = useAuth()
  const currentUser = unifiedUser || user

  const [showProgramsMenu, setShowProgramsMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // 프로그램 상세 페이지인지 확인
  const isIdolImagePage = pathname === '/programs/idol-image'
  const isFigurePage = pathname === '/programs/figure'
  const isProgramDetailPage = isIdolImagePage || isFigurePage

  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  // 스크롤 방향 감지 - 아래로 스크롤하면 숨기고, 위로 스크롤하면 보이기
  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const scrollDelta = currentScrollY - lastScrollY.current

          // 스크롤 임계값 (10px 이상 움직여야 반응)
          if (Math.abs(scrollDelta) > 10) {
            if (scrollDelta > 0 && currentScrollY > 100) {
              // 아래로 스크롤 - 숨기기 (페이지 상단 100px 이후부터)
              setIsVisible(false)
            } else if (scrollDelta < 0) {
              // 위로 스크롤 - 보이기
              setIsVisible(true)
            }
            lastScrollY.current = currentScrollY
          }

          // 페이지 최상단에서는 항상 보이기
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
  }, [])

  // 현재 경로에 따른 활성 탭 판별
  const isHomeActive = pathname === '/'
  const isProgramsActive = pathname?.startsWith('/programs') || false
  const isMyPageActive = pathname === '/mypage' || pathname?.startsWith('/mypage') || false

  // My 탭 클릭 핸들러
  const handleMyClick = () => {
    if (loading) return
    if (currentUser) {
      if (pathname !== '/mypage') {
        window.location.href = '/mypage'
      }
    } else {
      setShowAuthModal(true)
    }
  }

  // 로그인 모달 열기 핸들러
  const handleLoginClick = () => {
    setShowAuthModal(true)
  }

  // 프로그램 CTA 클릭 핸들러
  const handleProgramCTAClick = () => {
    if (loading) return

    if (isIdolImagePage) {
      if (currentUser) {
        router.push('/input?type=idol_image&mode=online')
      } else {
        setShowAuthModal(true)
      }
    } else if (isFigurePage) {
      if (currentUser) {
        router.push('/input?type=figure&mode=online')
      } else {
        setShowAuthModal(true)
      }
    }
  }

  // 프로그램별 CTA 텍스트
  const getProgramCTAText = () => {
    if (isIdolImagePage) return '지금 바로 분석 시작하기'
    if (isFigurePage) return '지금 바로 분석 시작하기'
    return '시작하기'
  }

  return (
    <>
      {/* 프로그램 상세 페이지: CTA 버튼 (항상 표시) */}
      {isProgramDetailPage && (
        <div
          className={cn(
            "md:hidden fixed left-0 right-0 z-50 px-4 py-2 bg-white border-t-2 border-black safe-area-bottom",
            "transition-all duration-300 ease-out",
            isVisible ? "bottom-16" : "bottom-0 shadow-[0_-4px_0px_0px_rgba(250,204,21,1)]"
          )}
        >
          <button
            onClick={handleProgramCTAClick}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_black] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Camera size={18} />
            {getProgramCTAText()}
          </button>
        </div>
      )}

      {/* 하단 네비게이션 바 (4탭) */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-black shadow-[0_-4px_0px_0px_rgba(250,204,21,1)] safe-area-bottom",
          "transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-around h-16 px-2 relative">
          {/* Home */}
          <NavItem
            href="/"
            icon={Home}
            label="Home"
            isActive={isHomeActive}
          />

          {/* Programs (드롭업) */}
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

          {/* My */}
          <button
            onClick={handleMyClick}
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
            )}>
              {currentUser ? "My" : "Login"}
            </span>
          </button>

          {/* Menu */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-slate-600 hover:text-slate-900 transition-all"
          >
            <div className="p-1.5 rounded-xl">
              <Menu size={20} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Menu</span>
          </button>

          {/* Programs 하단 시트 메뉴 */}
          <AnimatePresence>
            {showProgramsMenu && (
              <ProgramsSheet
                links={PROGRAM_LINKS}
                onClose={() => setShowProgramsMenu(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Mobile Menu Sheet */}
      <MobileMenuSheet
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        user={user}
        unifiedUser={unifiedUser}
        loading={loading}
        onSignOut={signOut}
        onLoginClick={handleLoginClick}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath={
          isIdolImagePage ? '/input?type=idol_image&mode=online' :
          isFigurePage ? '/input?type=figure&mode=online' :
          '/mypage'
        }
      />
    </>
  )
}
