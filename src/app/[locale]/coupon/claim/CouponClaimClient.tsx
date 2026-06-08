'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LogIn,
  RotateCcw,
  Ticket,
} from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/contexts/AuthContext'

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

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-[28px] border-3 border-slate-950 bg-white p-6 text-center shadow-[6px_6px_0_#000]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-slate-950 bg-yellow-300">
          {status === 'success' ? (
            <CheckCircle2 className="h-8 w-8 text-slate-950" />
          ) : status === 'error' ? (
            <AlertTriangle className="h-8 w-8 text-red-600" />
          ) : status === 'loading' ? (
            <Loader2 className="h-8 w-8 animate-spin text-slate-950" />
          ) : (
            <Ticket className="h-8 w-8 text-slate-950" />
          )}
        </div>

        <h1 className="text-2xl font-black text-slate-950">
          {status === 'success'
            ? '쿠폰 등록 완료'
            : status === 'error'
              ? '등록할 수 없어요'
              : status === 'login'
                ? '로그인이 필요해요'
                : '쿠폰 등록 중'}
        </h1>
        <p className="mt-3 min-h-10 text-sm font-bold leading-relaxed text-slate-500">
          {message || '잠시만 기다려주세요'}
        </p>

        <div className="mt-6 space-y-3">
          {status === 'success' && (
            <button
              onClick={() => router.push('/mypage?tab=coupons')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-950 bg-slate-950 px-4 py-3 font-black text-white shadow-[3px_3px_0_#FACC15] transition hover:-translate-y-0.5"
            >
              쿠폰함 보기
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {status === 'login' && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-950 bg-yellow-300 px-4 py-3 font-black text-slate-950 shadow-[3px_3px_0_#000] transition hover:-translate-y-0.5"
            >
              <LogIn className="h-4 w-4" />
              로그인하고 등록
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={retryClaim}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-950 bg-white px-4 py-3 font-black text-slate-950 shadow-[3px_3px_0_#000] transition hover:-translate-y-0.5"
            >
              <RotateCcw className="h-4 w-4" />
              다시 시도
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-black text-slate-500 transition hover:border-slate-300 hover:bg-slate-100"
          >
            홈으로
          </button>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="쿠폰 등록을 위해 로그인해주세요"
        description="로그인 후 이 쿠폰이 자동으로 쿠폰함에 저장됩니다"
        redirectPath={redirectPath}
      />
    </div>
  )
}
