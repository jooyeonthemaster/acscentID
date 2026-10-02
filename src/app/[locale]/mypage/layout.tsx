'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePathname, useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { AuthModal } from '@/components/auth/AuthModal'

interface MyPageLayoutProps {
  children: React.ReactNode
}

function MyPageLoginGate() {
  const t = useTranslations('auth')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  // 로그인 후 보던 마이페이지(탭·레시피 상세 포함)로 그대로 돌아온다
  const returnTo = query ? `${pathname}?${query}` : pathname

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[var(--canvas)]" />
      <AuthModal
        isOpen
        onClose={() => router.push('/')}
        title={t('pageLoginTitle')}
        description={t('pageLoginDescription')}
        redirectPath={returnTo}
      />
    </>
  )
}

export default function MyPageLayout({ children }: MyPageLayoutProps) {
  const { user, unifiedUser, loading } = useAuth()
  const t = useTranslations('auth')
  // 카카오 사용자는 unifiedUser에만 있음
  const currentUser = unifiedUser || user

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-ink)] mx-auto mb-3" />
          <p className="text-sm lg:text-base text-[var(--muted-ink)]">{t('checkingLogin')}</p>
        </div>
      </div>
    )
  }

  // 비로그인: 아무 안내 없이 홈으로 보내지 않고, 이 자리에서 로그인 모달을 띄운다
  if (!currentUser) {
    return (
      <Suspense fallback={null}>
        <MyPageLoginGate />
      </Suspense>
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
