'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/routing'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LogIn,
  QrCode,
  RotateCcw,
  Ticket,
} from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'
import { Header } from '@/components/layout/Header'

type ClaimStatus = 'idle' | 'loading' | 'success' | 'error' | 'login'

interface CouponClaimClientProps {
  initialToken?: string
  initialCode?: string
  redirectPathOverride?: string
}

export function CouponClaimClient({
  initialToken = '',
  initialCode = '',
  redirectPathOverride,
}: CouponClaimClientProps = {}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = initialToken || searchParams.get('token') || ''
  const code = (initialCode || searchParams.get('code') || '').toUpperCase().replace(/[\s-]+/g, '')
  const redirectPath = useMemo(
    () => redirectPathOverride || (token
      ? `/coupon/claim?token=${encodeURIComponent(token)}`
      : `/coupon/claim?code=${encodeURIComponent(code)}`),
    [code, redirectPathOverride, token]
  )

  const { user, unifiedUser, loading } = useAuth()
  const t = useTranslations('coupon.claimPage')
  const [status, setStatus] = useState<ClaimStatus>('idle')
  const [message, setMessage] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const claimStartedRef = useRef<string | null>(null)

  const hasUser = !!(user || unifiedUser)

  const claimCoupon = useCallback(async () => {
    if (!token && !code) {
      setStatus('error')
      setMessage('쿠폰 QR 정보가 없습니다')
      return
    }

    setStatus('loading')
    setMessage('쿠폰을 확인하고 있습니다')

    try {
      const response = await fetch('/api/coupons/offline/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(token ? { token } : { code }),
      })
      const data = await response.json()

      if (response.status === 401 || data.requireLogin) {
        setStatus('login')
        setMessage('로그인 후 쿠폰을 등록할 수 있습니다')
        setShowAuthModal(true)
        return
      }

      if (!response.ok) {
        throw new Error(data.error || '쿠폰 등록에 실패했습니다')
      }

      setStatus('success')
      setMessage(data.message || '쿠폰이 쿠폰함에 저장되었습니다')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : '쿠폰 등록에 실패했습니다')
    }
  }, [code, token])

  useEffect(() => {
    if (loading) return

    if (!token && !code) {
      setStatus('error')
      setMessage('쿠폰 QR 정보가 없습니다')
      return
    }

    if (!hasUser) {
      setStatus('login')
      setMessage('로그인 후 쿠폰을 등록할 수 있습니다')
      setShowAuthModal(true)
      return
    }

    const claimKey = token || code
    if (claimStartedRef.current === claimKey) return
    claimStartedRef.current = claimKey
    void claimCoupon()
  }, [claimCoupon, code, hasUser, loading, token])

  const retryClaim = () => {
    claimStartedRef.current = null
    void claimCoupon()
  }

  // QR 정보 없이 직접 들어온 경우 — 다시 시도해도 소용없으므로 재스캔 안내와 홈 이동만 보여준다
  const isMissingQr = !token && !code
  const title = isMissingQr
    ? t('missingTitle')
    : status === 'success'
      ? t('successTitle')
      : status === 'error'
        ? t('errorTitle')
        : status === 'login'
          ? t('loginTitle')
          : t('loadingTitle')
  const description = isMissingQr ? t('missingDescription') : (message || t('waiting'))

  return (
    <>
      <Header />
      <div className="flex min-h-[75vh] items-center justify-center bg-[var(--canvas)] px-5 pb-10 pt-28 lg:pt-32">
        <div className="w-full max-w-sm rounded-[6px] border border-[var(--line)] bg-white p-6 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)]">
            {status === 'success' ? (
              <CheckCircle2 className="h-7 w-7 text-[var(--ink)]" aria-hidden />
            ) : isMissingQr ? (
              <QrCode className="h-7 w-7 text-[var(--muted-ink)]" aria-hidden />
            ) : status === 'error' ? (
              <AlertTriangle className="h-7 w-7 text-[var(--ink)]" aria-hidden />
            ) : status === 'loading' ? (
              <Loader2 className="h-7 w-7 animate-spin text-[var(--muted-ink)]" aria-hidden />
            ) : (
              <Ticket className="h-7 w-7 text-[var(--ink)]" aria-hidden />
            )}
          </div>

          <h1 className="text-xl font-black text-[var(--ink)]">{title}</h1>
          <p className="mt-2 min-h-10 text-sm lg:text-base leading-relaxed text-[var(--muted-ink)]" role="status">
            {description}
          </p>

          <div className="mt-6 space-y-2">
            {status === 'success' && (
              <button
                onClick={() => router.push('/mypage?tab=coupons')}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[5px] bg-[var(--ink)] px-4 font-bold text-white transition-colors hover:bg-black"
              >
                {t('viewCoupons')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}

            {status === 'login' && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[5px] bg-[var(--ink)] px-4 font-bold text-white transition-colors hover:bg-black"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {t('loginAndClaim')}
              </button>
            )}

            {status === 'error' && !isMissingQr && (
              <button
                onClick={retryClaim}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[5px] border border-[var(--ink)] bg-white px-4 font-bold text-[var(--ink)] transition-colors hover:bg-[var(--soft)]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {t('retry')}
              </button>
            )}

            <button
              onClick={() => router.push('/')}
              className={isMissingQr
                ? 'flex min-h-12 w-full items-center justify-center rounded-[5px] bg-[var(--ink)] px-4 font-bold text-white transition-colors hover:bg-black'
                : 'flex min-h-12 w-full items-center justify-center rounded-[5px] border border-[var(--line)] bg-white px-4 font-bold text-[var(--muted-ink)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)]'}
            >
              {t('goHome')}
            </button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title={t('authTitle')}
        description={t('authDescription')}
        redirectPath={redirectPath}
      />
    </>
  )
}
