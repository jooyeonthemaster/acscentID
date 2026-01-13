'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Shield, Loader2 } from 'lucide-react'

// 관리자 이메일 목록 (환경변수에서 읽기)
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { unifiedUser, loading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!loading) {
      const userEmail = unifiedUser?.email?.toLowerCase()

      if (!userEmail) {
        // 로그인되지 않음
        router.push('/?redirect=/admin')
        return
      }

      if (!ADMIN_EMAILS.includes(userEmail)) {
        // 관리자가 아님
        router.push('/')
        return
      }

      // 관리자 확인됨
      setIsAdmin(true)
      setChecking(false)
    }
  }, [unifiedUser, loading, router])

  // 로딩 중
  if (loading || checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-900 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>권한 확인 중...</span>
          </div>
        </div>
      </div>
    )
  }

  // 관리자가 아님 (리다이렉트 대기)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-slate-600">접근 권한이 없습니다</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
