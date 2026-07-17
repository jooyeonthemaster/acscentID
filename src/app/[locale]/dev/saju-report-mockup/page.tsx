'use client'

// 사주 인쇄 보고서 개선 목업 하네스 — 프로덕션에서는 404
import { notFound, useParams, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { PrintableReport } from '@/app/admin/analysis/components/PrintableReport'
import { setMobileOverlayOpen } from '@/lib/mobile-overlay'
import sajuFixture from '../../../../../scripts/fixtures/saju-sample.json'

function SajuReportMockupHarness() {
  const searchParams = useSearchParams()
  const params = useParams<{ locale: string }>()

  useEffect(() => {
    document.body.dataset.acscentSajuReportMockupOpen = 'true'
    setMobileOverlayOpen('dev-saju-report-mockup-harness', true)

    const hideSharedLayout = () => {
      document.querySelectorAll<HTMLElement>('footer, nav.fixed').forEach((element) => {
        if (!element.dataset.sajuReportMockupPreviousDisplay) {
          element.dataset.sajuReportMockupPreviousDisplay = element.style.display || '__empty__'
        }
        element.style.display = 'none'
      })
    }

    hideSharedLayout()
    const observer = new MutationObserver(hideSharedLayout)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      document
        .querySelectorAll<HTMLElement>('[data-saju-report-mockup-previous-display]')
        .forEach((element) => {
          const previous = element.dataset.sajuReportMockupPreviousDisplay
          element.style.display = previous === '__empty__' ? '' : previous || ''
          delete element.dataset.sajuReportMockupPreviousDisplay
        })
      delete document.body.dataset.acscentSajuReportMockupOpen
      setMobileOverlayOpen('dev-saju-report-mockup-harness', false)
    }
  }, [])

  if (process.env.NODE_ENV === 'production') notFound()

  const variant = searchParams.get('variant') === 'idol' ? 'idol' : 'self'
  const variantLabel = variant === 'idol' ? '최애 판' : '나의 판'
  const analysis = {
    ...(sajuFixture as Record<string, unknown>),
    target_type: variant,
  }

  return (
    <div className="saju-report-mockup-dev-shell fixed inset-0 z-[2147483647] overflow-auto bg-[#F3EEDC] px-8 py-6 print:static print:bg-white print:p-0">
      <style jsx global>{`
        body[data-acscent-saju-report-mockup-open="true"] footer,
        body[data-acscent-saju-report-mockup-open="true"] nav.fixed,
        body:has(.saju-report-mockup-dev-shell) footer,
        body:has(.saju-report-mockup-dev-shell) nav.fixed {
          display: none !important;
        }
      `}</style>

      <div className="mx-auto mb-5 flex w-[842px] items-center justify-between print:hidden">
        <div>
          <p className="m-0 text-xs lg:text-sm font-bold tracking-[0.18em] text-[#7A5C14]">
            사주 보고서 시안
          </p>
          <h1 className="m-0 mt-1 text-lg font-black text-[#1A1610]">
            기존안 기반 · 소폭 개선안 · {variantLabel}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`?variant=${variant === 'self' ? 'idol' : 'self'}`}
            className="rounded-[12px] border border-[#1A1610]/20 bg-white/55 px-3 py-2 text-sm lg:text-base font-bold text-[#1A1610] hover:bg-white"
          >
            {variant === 'self' ? '최애 판' : '나의 판'}
          </a>
          <a
            href={`/${params.locale}/dev/saju-print?variant=${variant}`}
            className="rounded-[12px] border border-[#1A1610]/20 bg-white/55 px-3 py-2 text-sm lg:text-base font-bold text-[#1A1610] hover:bg-white"
          >
            인쇄 하네스
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-[12px] bg-[#1A1610] px-4 py-2 text-sm lg:text-base font-black text-white hover:bg-[#3A3329]"
          >
            인쇄
          </button>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <PrintableReport analysis={analysis as any} />
    </div>
  )
}

export default function SajuReportMockupDevPage() {
  return (
    <Suspense fallback={null}>
      <SajuReportMockupHarness />
    </Suspense>
  )
}
