'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, User, LogOut, Sparkles, X, ChevronLeft, Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'
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
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

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

          {/* Center: Title (Mobile/Tablet) or Logo (Mobile) */}
          <div className="flex-[2] flex items-center justify-center md:hidden">
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

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button
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
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] border-l-2 border-black bg-white p-0">
                <SheetHeader className="p-6 border-b-2 border-slate-100 bg-yellow-50">
                  <SheetTitle className="text-left text-xs font-black tracking-widest text-slate-900 uppercase flex items-center gap-2">
                    <Star size={14} className="fill-black" /> Menu
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col h-full overflow-y-auto">
                  {/* Keep existing Menu Content logic but maybe cleanup styles later if needed. 
                        For now, assuming reuse of internal content is fine. 
                        Re-implementing the simplistic version from previous file for safety.
                    */}
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="w-8 h-8 border-2 border-black border-dashed rounded-full animate-spin mx-auto mb-2" />
                    </div>
                  ) : currentUser ? (
                    <div className="flex flex-col flex-1 pb-20">
                      <div className="p-6 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full border-2 border-black bg-white flex items-center justify-center overflow-hidden">
                            {(unifiedUser?.avatar_url || user?.user_metadata?.avatar_url) ? (
                              <img src={unifiedUser?.avatar_url || user?.user_metadata?.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={20} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {unifiedUser?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || '사용자'}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {unifiedUser?.email || user?.email || '카카오 로그인'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <nav className="p-4 space-y-2">
                        <Link
                          href="/mypage"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 px-4 py-4 rounded-xl border-2 border-transparent hover:border-black hover:bg-yellow-100 transition-all font-bold"
                        >
                          <Sparkles size={18} />
                          마이페이지
                        </Link>
                      </nav>

                      <div className="mt-auto p-4">
                        <Button
                          variant="ghost"
                          onClick={handleSignOut}
                          className="w-full h-12 flex items-center justify-start gap-3 px-4 rounded-xl hover:bg-red-50 hover:text-red-600 text-slate-500 transition-all font-medium"
                        >
                          <LogOut size={18} />
                          <span>로그아웃</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full p-6">
                      <h3 className="text-2xl font-black text-slate-900 mb-2">WELCOME!</h3>
                      <p className="text-sm text-slate-500 mb-8">
                        로그인하고 나만의 향기를<br />기록해보세요.
                      </p>
                      <Button
                        onClick={() => {
                          setShowAuthModal(true)
                          setIsOpen(false)
                        }}
                        className="w-full h-14 bg-black text-white rounded-xl font-bold text-lg shadow-[4px_4px_0px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-slate-800"
                      >
                        LOGIN
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
}
