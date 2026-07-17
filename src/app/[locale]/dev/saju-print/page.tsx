'use client'

// 사주 인쇄 보고서 디자인 검수용 dev 하네스 — 프로덕션에서는 404
import { notFound, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { PrintableReport } from '@/app/admin/analysis/components/PrintableReport'
import { setMobileOverlayOpen } from '@/lib/mobile-overlay'
import sajuFixture from '../../../../../scripts/fixtures/saju-sample.json'

function SajuPrintHarness() {
  const searchParams = useSearchParams()

  // 전역 모바일 BottomNav가 842×595 캔버스 하단(L17 푸터/R14) 위에 겹쳐
  // 검수를 방해하므로, 하네스가 떠 있는 동안 오버레이 키로 숨긴다.
  useEffect(() => {
    setMobileOverlayOpen('dev-saju-print-harness', true)
    return () => setMobileOverlayOpen('dev-saju-print-harness', false)
  }, [])

  if (process.env.NODE_ENV === 'production') notFound()

  const variant = searchParams.get('variant') === 'self' ? 'self' : 'idol'
  const analysis = {
    ...(sajuFixture as Record<string, unknown>),
    target_type: variant,
  }

  return (
    <div className="min-h-screen bg-slate-200 py-6">
      <div className="mx-auto mb-4 flex w-[842px] items-center justify-between print:hidden">
        <span className="text-sm lg:text-base font-bold text-slate-600">
          사주 보고서 하네스 — variant: {variant} (?variant=self|idol)
        </span>
        <button
          onClick={() => window.print()}
          className="rounded-[12px] bg-slate-900 px-3 py-1.5 text-sm lg:text-base font-bold text-white"
        >
          인쇄
        </button>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <PrintableReport analysis={analysis as any} />
    </div>
  )
}

export default function SajuPrintDevPage() {
  return (
    <Suspense fallback={null}>
      <SajuPrintHarness />
    </Suspense>
  )
}
