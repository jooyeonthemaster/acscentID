'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, LogIn, QrCode, Ticket } from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/contexts/AuthContext'

const COUPON_BOX_PATH = '/mypage?tab=coupons'

export function CouponRegisterClient() {
  const router = useRouter()
  const { user, unifiedUser, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const hasUser = Boolean(user || unifiedUser)

  useEffect(() => {
    if (!loading && hasUser) {
      router.replace(COUPON_BOX_PATH)
    }
  }, [hasUser, loading, router])

  if (loading || hasUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F2] px-5 py-10">
        <div className="w-full max-w-sm rounded-lg border-3 border-slate-950 bg-white p-6 text-center shadow-[5px_5px_0_#000]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border-2 border-slate-950 bg-yellow-300">
            <Loader2 className="h-7 w-7 animate-spin text-slate-950" />
          </div>
          <h1 className="text-xl font-black text-slate-950">쿠폰함으로 이동 중</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">로그인 상태를 확인하고 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F2] px-5 py-8">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-950 bg-yellow-300 font-black text-slate-950">
            AC
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">AC&apos;SCENT Coupon</p>
            <p className="text-sm font-black text-slate-950">오프라인 쿠폰 등록</p>
          </div>
        </div>

        <section className="rounded-lg border-3 border-slate-950 bg-white p-6 shadow-[6px_6px_0_#000]">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-slate-950 bg-slate-950">
            <QrCode className="h-8 w-8 text-yellow-300" />
          </div>

          <h1 className="text-2xl font-black leading-tight text-slate-950">
            로그인 후 쿠폰함에서 코드를 등록하세요
          </h1>
          <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">
            종이 쿠폰에 적힌 8자리 코드를 입력하면 온라인 쿠폰함에 저장됩니다. 계정이 없어도 로그인 과정에서 바로 가입할 수 있습니다.
          </p>

          <div className="mt-6 grid gap-2">
            {[
              '카카오 또는 구글로 로그인',
              '마이페이지 쿠폰함으로 자동 이동',
              '종이 쿠폰의 8자리 코드 입력',
            ].map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-3"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-black text-slate-800">{step}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowAuthModal(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-slate-950 bg-yellow-300 px-4 py-4 font-black text-slate-950 shadow-[3px_3px_0_#000] transition hover:-translate-y-0.5"
          >
            <LogIn className="h-5 w-5" />
            로그인하고 쿠폰 등록하기
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            onClick={() => router.push('/')}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-4 py-3 font-black text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Ticket className="h-4 w-4" />
            홈으로 돌아가기
          </button>
        </section>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="쿠폰 등록을 위해 로그인해주세요"
        description="로그인 또는 회원가입 후 쿠폰함의 코드 입력 화면으로 바로 이동합니다"
        redirectPath={COUPON_BOX_PATH}
      />
    </div>
  )
}
