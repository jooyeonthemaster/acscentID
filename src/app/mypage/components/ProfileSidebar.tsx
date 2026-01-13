'use client'

import { User } from '@supabase/supabase-js'
import { LogOut, Home, Sparkles, Beaker, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

interface UnifiedUser {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  provider: string
}

interface ProfileSidebarProps {
  user: User | null
  unifiedUser: UnifiedUser | null
}

// 기본 아바타 URL 생성 (DiceBear API 사용)
function getDefaultAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`
}

export function ProfileSidebar({ user, unifiedUser }: ProfileSidebarProps) {
  const { signOut } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'analyses'

  if (!user && !unifiedUser) return null

  // 이름 가져오기
  const userName = unifiedUser?.name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    '사용자'

  // 아바타 시드 (userId 또는 이메일 기반 - 항상 같은 캐릭터 표시)
  const avatarSeed = unifiedUser?.id || user?.id || unifiedUser?.email || user?.email || 'default'

  // 아바타 가져오기 (없으면 기본 캐릭터)
  const userAvatar = unifiedUser?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    getDefaultAvatar(avatarSeed)

  // 이메일 가져오기
  const userEmail = unifiedUser?.email || user?.email

  // 프로바이더 가져오기
  const provider = unifiedUser?.provider || user?.app_metadata?.provider || 'email'
  const providerLabel = provider === 'google' ? 'Google' : provider === 'kakao' ? 'Kakao' : '이메일'

  const handleSignOut = async () => {
    if (confirm('로그아웃 할까요?')) {
      await signOut()
    }
  }

  const navItems = [
    { href: '/', icon: Home, label: '홈으로' },
    { href: '/mypage?tab=analyses', icon: Sparkles, label: '분석 결과' },
    { href: '/mypage?tab=recipes', icon: Beaker, label: '내 레시피' },
  ]

  return (
    <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0_0_black]">
      {/* 브랜드 로고 */}
      <div className="hidden lg:block px-6 py-5 border-b-2 border-black">
        <Link href="/" className="text-2xl font-black tracking-tight">
          AC'SCENT<span className="text-yellow-500">.</span>
        </Link>
      </div>

      {/* 프로필 섹션 */}
      <div className="p-5 border-b-2 border-black bg-gradient-to-br from-yellow-50 to-amber-50">
        <div className="flex items-center gap-4">
          {/* 프로필 이미지 */}
          <img
            src={userAvatar}
            alt="프로필"
            className="w-14 h-14 rounded-xl object-cover border-2 border-black shadow-[2px_2px_0_0_black] bg-yellow-100"
          />

          {/* 프로필 정보 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-black truncate">{userName}</h2>
            <p className="text-xs text-slate-600 truncate">{userEmail || '카카오 로그인'}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-black text-white rounded-full font-bold">
              {providerLabel} 로그인
            </span>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            // 홈 링크는 pathname으로 체크, 탭 링크는 currentTab으로 체크
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname === '/mypage' && item.href.includes(`tab=${currentTab}`)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-yellow-400 border-2 border-black shadow-[2px_2px_0_0_black]'
                      : 'hover:bg-yellow-100 border-2 border-transparent'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={16} className="opacity-50" />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 로그아웃 버튼 */}
      <div className="p-3 border-t-2 border-black">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors border-2 border-transparent hover:border-red-200"
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </div>

      {/* 프로모션 카드 */}
      <div className="p-3 hidden lg:block">
        <div className="p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl border-2 border-black shadow-[2px_2px_0_0_black]">
          <div className="text-3xl mb-2">🎁</div>
          <p className="font-black text-sm mb-1">친구 초대하기</p>
          <p className="text-xs text-slate-600 mb-3">친구를 초대하고 특별한 혜택을 받아보세요!</p>
          <button className="w-full py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors">
            초대 링크 복사
          </button>
        </div>
      </div>
    </div>
  )
}
