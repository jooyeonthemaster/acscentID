'use client'

import { User } from '@supabase/supabase-js'
import { User as UserIcon, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface ProfileHeaderProps {
  user: User | null
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const { signOut } = useAuth()

  if (!user) return null

  const userName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    '사용자'

  const userAvatar =
    user.user_metadata?.avatar_url || user.user_metadata?.picture

  const provider = user.app_metadata?.provider || 'email'
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
          <p className="text-sm text-slate-500 truncate">{user.email}</p>
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
