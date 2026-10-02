import { Suspense } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { Loader2 } from 'lucide-react'
import koMessages from '@/messages/ko.json'
import { CouponClaimClient } from '@/app/[locale]/coupon/claim/CouponClaimClient'

export const metadata = {
  title: '쿠폰 등록 | AC\'SCENT IDENTITY',
  robots: { index: false, follow: false },
}

export default async function ShortCouponClaimPage({
  params,
}: {
  params: Promise<{ claim: string }>
}) {
  const { claim } = await params
  const normalizedClaim = decodeURIComponent(claim).trim()
  const normalizedCode = normalizedClaim.toUpperCase().replace(/[\s-]+/g, '')
  const isCode = /^[A-Z0-9]{8}$/.test(normalizedCode)

  return (
    <NextIntlClientProvider locale="ko" messages={koMessages}>
      {/* [locale] 밖 라우트라 공개 사이트 디자인 토큰(.public-editorial)을 직접 씌운다 */}
      <div lang="ko" className="public-editorial min-h-screen">
      <Suspense
        fallback={
          <div className="flex min-h-[70vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-ink)]" />
          </div>
        }
      >
        <CouponClaimClient
          initialToken={isCode ? '' : normalizedClaim}
          initialCode={isCode ? normalizedCode : ''}
          redirectPathOverride={`/c/${encodeURIComponent(normalizedClaim)}`}
        />
      </Suspense>
      </div>
    </NextIntlClientProvider>
  )
}
