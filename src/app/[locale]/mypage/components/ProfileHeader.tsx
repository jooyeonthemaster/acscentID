'use client'

import { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('mypage.profile')
  const { signOut } = useAuth()

  // Kakao 사용자는 unifiedUser, Google 사용자는 user 사용
  if (!user && !unifiedUser) return null

  // 이름 가져오기
  const userName = unifiedUser?.name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    t('defaultUser')

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
  const providerLabel = provider === 'google' ? 'Google' : provider === 'kakao' ? 'Kakao' : t('emailLogin')

  const handleSignOut = async () => {
    if (confirm(t('logoutConfirm'))) {
      await signOut()
    }
  }

  return (
    <div className="bg-[#12141D] rounded-[12px] p-5 shadow-sm border border-[#1E222E]">
      <div className="flex items-center gap-4">
        {/* 프로필 이미지 */}
        <img
          src={userAvatar}
          alt={t('profileAlt')}
          className="w-16 h-16 rounded-full object-cover border-3 border-[#343A4C] shadow-lg bg-[#151823]"
        />

        {/* 프로필 정보 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-[#E9E2D0] truncate">{userName}</h2>
          <p className="text-sm lg:text-base text-[#8B8578] truncate">{userEmail || t('kakaoLogin')}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] lg:text-[12px] px-2 py-0.5 bg-[#1B1F2C] text-[#A69F8D] rounded-full">
              {providerLabel} {t('loginSuffix')}
            </span>
          </div>
        </div>

        {/* 로그아웃 버튼 */}
        <button
          onClick={handleSignOut}
          className="p-2.5 rounded-[12px] bg-[#1B1F2C] hover:bg-[#232838] transition-colors text-[#8B8578] hover:text-[#A69F8D]"
          title={t('logout')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  )
}
