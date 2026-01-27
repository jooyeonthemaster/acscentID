'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, ChevronDown, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from '@/lib/utils'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useState } from 'react'

// Navigation Links
export const NAV_LINKS = {
  about: [
    { href: '/about/brand', label: '브랜드 스토리' },
    { href: '/about/how-it-works', label: '작동 원리' },
  ],
  programs: [
    { href: '/programs/idol-image', label: 'AI 이미지 분석 퍼퓸', image: '/images/perfume/KakaoTalk_20260125_225218071.jpg' },
    { href: '/programs/figure', label: '피규어 화분 디퓨저', image: '/images/diffuser/KakaoTalk_20260125_225229624.jpg' },
  ],
}

// Unified User Type
interface UnifiedUser {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  provider: string
}

interface MobileMenuSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: SupabaseUser | null
  unifiedUser: UnifiedUser | null
  loading: boolean
  onSignOut: () => Promise<void>
  onLoginClick: () => void
}

// Mobile Collapsible Section
export function MobileSection({
  title,
  links,
  isActive,
  onLinkClick
}: {
  title: string
  links: Array<{ href: string; label: string; image?: string }>
  isActive: boolean
  onLinkClick: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-4 font-bold text-left transition-colors",
          isActive ? "text-purple-600 bg-purple-50" : "text-slate-900 hover:bg-slate-50"
        )}
      >
        {title}
        <ChevronDown size={16} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-slate-50"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onLinkClick}
                className="flex items-center gap-3 px-8 py-3 text-sm text-slate-600 hover:text-black hover:bg-yellow-100 transition-colors"
              >
                {link.image && (
                  <img
                    src={link.image}
                    alt=""
                    className="w-8 h-8 rounded-md object-cover border border-slate-200"
                  />
                )}
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MobileMenuSheet({
  isOpen,
  onOpenChange,
  user,
  unifiedUser,
  loading,
  onSignOut,
  onLoginClick
}: MobileMenuSheetProps) {
  const pathname = usePathname()
  const currentUser = unifiedUser || user

  const isProgramsActive = pathname?.startsWith('/programs') || false

  const handleClose = () => onOpenChange(false)

  const handleSignOut = async () => {
    await onSignOut()
    handleClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] border-l-2 border-black bg-white p-0">
        <SheetHeader className="p-6 border-b-2 border-slate-100 bg-yellow-50">
          <SheetTitle className="text-left text-xs font-black tracking-widest text-slate-900 uppercase flex items-center gap-2">
            Menu
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-black border-dashed rounded-full animate-spin mx-auto mb-2" />
            </div>
          ) : currentUser ? (
            <div className="flex flex-col flex-1 pb-20">
              {/* User Profile */}
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

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto">
                <Link
                  href="/"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  Home
                </Link>
                <MobileSection
                  title="Programs"
                  links={NAV_LINKS.programs}
                  isActive={isProgramsActive}
                  onLinkClick={handleClose}
                />
                <Link
                  href="/faq"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <HelpCircle size={18} />
                  FAQ
                </Link>
                <Link
                  href="/mypage"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  My Page
                </Link>
              </nav>

              {/* Sign Out */}
              <div className="mt-auto p-4 border-t border-slate-100">
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
            <div className="flex flex-col h-full">
              {/* Navigation for non-logged in users */}
              <nav className="flex-1 overflow-y-auto">
                <Link
                  href="/"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  Home
                </Link>
                <MobileSection
                  title="Programs"
                  links={NAV_LINKS.programs}
                  isActive={isProgramsActive}
                  onLinkClick={handleClose}
                />
                <Link
                  href="/faq"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <HelpCircle size={18} />
                  FAQ
                </Link>
              </nav>

              {/* Login CTA */}
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <h3 className="text-2xl font-black text-slate-900 mb-2">WELCOME!</h3>
                <p className="text-sm text-slate-500 mb-6">
                  로그인하고 나만의 향기를<br />기록해보세요.
                </p>
                <Button
                  onClick={() => {
                    onLoginClick()
                    handleClose()
                  }}
                  className="w-full h-14 bg-black text-white rounded-xl font-bold text-lg shadow-[4px_4px_0px_0px_#FACC15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all active:bg-slate-800"
                >
                  LOGIN
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
