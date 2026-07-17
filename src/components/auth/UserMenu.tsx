'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, BookMarked, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// 기본 아바타 URL 생성 (DiceBear API 사용)
function getDefaultAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`
}

export function UserMenu() {
  const { user, signOut, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ESC 키로 메뉴 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-[#232838] animate-pulse" />
    )
  }

  if (!user) {
    return null
  }

  const userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '사용자'
  const avatarSeed = user.id || user.email || 'default'
  const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || getDefaultAvatar(avatarSeed)

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-[#1B1F2C] transition-colors"
      >
        <img
          src={userAvatar}
          alt="프로필"
          className="w-8 h-8 rounded-full object-cover border-2 border-[#343A4C] bg-[#151823]"
        />
        <ChevronDown
          size={14}
          className={`text-[#8B8578] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 bg-[#12141D] rounded-[12px] shadow-xl border border-[#1E222E] overflow-hidden z-50"
          >
            {/* 프로필 정보 */}
            <div className="px-4 py-3 border-b border-[#1E222E] bg-gradient-to-b from-[#0C0E16] to-[#12141D]">
              <p className="font-semibold text-[#E9E2D0] text-sm lg:text-base truncate">
                {userName}
              </p>
              <p className="text-xs lg:text-sm text-[#8B8578] truncate">{user.email}</p>
            </div>

            {/* 메뉴 아이템 */}
            <div className="py-1">
              <Link
                href="/mypage"
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#151823] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <BookMarked size={16} className="text-[#8B8578]" />
                <span className="text-sm lg:text-base text-[#A69F8D]">내 레시피</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#151823] transition-colors w-full text-left border-t border-[#1E222E]"
              >
                <LogOut size={16} className="text-[#8B8578]" />
                <span className="text-sm lg:text-base text-[#8B8578]">로그아웃</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
