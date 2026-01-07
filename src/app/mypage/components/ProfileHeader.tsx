'use client'

import { User } from '@supabase/supabase-js'
import { User as UserIcon, LogOut, Settings } from 'lucide-react'
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

  // 아바타 가져오기
  const userAvatar = unifiedUser?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture

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
        {userAvatar ? (
          <img
            src={userAvatar}
            alt="프로필"
            className="w-16 h-16 rounded-full object-cover border-3 border-amber-400 shadow-lg"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center border-3 border-amber-400 shadow-lg">
            <UserIcon size={28} className="text-amber-600" />
          </div>
        )}

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
