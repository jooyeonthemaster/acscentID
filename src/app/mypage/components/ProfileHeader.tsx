'use client'

import { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// 통합 사용자 타입 (AuthContext와 동일하게 맞춤)
interface UnifiedUser {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  provider: string
}

interface ProfileHeaderProps {
  user: User | null
  unifiedUser: UnifiedUser | null
}

// 기본 아바타 URL 생성 (DiceBear API 사용)
function getDefaultAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`
}

export function ProfileHeader({ user, unifiedUser }: ProfileHeaderProps) {
  const { signOut } = useAuth()

  // Kakao 사용자는 unifiedUser, Google 사용자는 user 사용
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

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-center gap-4">
        {/* 프로필 이미지 */}
        <img
          src={userAvatar}
          alt="프로필"
          className="w-16 h-16 rounded-full object-cover border-3 border-amber-400 shadow-lg bg-amber-100"
        />

        {/* 프로필 정보 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 truncate">{userName}</h2>
          <p className="text-sm text-slate-500 truncate">{userEmail || '카카오 로그인'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              {providerLabel} 로그인
            </span>
          </div>
        </div>

        {/* 로그아웃 버튼 */}
        <button
          onClick={handleSignOut}
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
          title="로그아웃"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  )
}
