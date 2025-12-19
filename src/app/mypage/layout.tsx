'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface MyPageLayoutProps {
  children: React.ReactNode
}

export default function MyPageLayout({ children }: MyPageLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 로딩이 끝났고 사용자가 없으면 홈으로 리다이렉트
    if (!loading && !user) {
      router.push('/?login=required')
    }
  }, [user, loading, router])

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 로그인되지 않은 경우 (리다이렉트 대기 중)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">로그인이 필요합니다</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
