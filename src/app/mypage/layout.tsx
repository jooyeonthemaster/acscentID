'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'

interface MyPageLayoutProps {
  children: React.ReactNode
}

export default function MyPageLayout({ children }: MyPageLayoutProps) {
  const { user, unifiedUser, loading } = useAuth()
  const router = useRouter()
  // 카카오 사용자는 unifiedUser에만 있음
  const currentUser = unifiedUser || user

  // 세션 복원을 위한 지연 체크 상태
  const [authChecked, setAuthChecked] = useState(false)

  // 로딩 완료 후 세션 복원을 위한 짧은 대기 시간
  useEffect(() => {
    if (!loading) {
      // 세션 쿠키 복원을 위해 약간의 지연 추가
      const timer = setTimeout(() => {
        setAuthChecked(true)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [loading])

  useEffect(() => {
    // authChecked가 true이고 사용자가 없으면 홈으로 리다이렉트
    if (authChecked && !currentUser) {
      router.push('/?login=required')
    }
  }, [authChecked, currentUser, router])

  // 로딩 중이거나 인증 확인 전
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 인증 확인 후 로그인되지 않은 경우 (리다이렉트 대기 중)
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">로그인이 필요합니다</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Header />
      {/* Header 높이만큼 상단 여백 (마퀴 바 32px + 메인 헤더 64px = 96px) */}
      <div className="pt-24">
        {children}
      </div>
    </>
  )
}
