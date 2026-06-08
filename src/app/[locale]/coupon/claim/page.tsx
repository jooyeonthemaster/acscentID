import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { CouponClaimClient } from './CouponClaimClient'

export const metadata = {
  title: '쿠폰 등록 | AC\'SCENT IDENTITY',
  robots: { index: false, follow: false },
}

export default function CouponClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        </div>
      }
    >
      <CouponClaimClient />
    </Suspense>
  )
}
