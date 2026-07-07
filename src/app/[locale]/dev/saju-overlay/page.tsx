'use client'

// 사주 로딩 오버레이 검수용 dev 하네스 — 프로덕션에서는 404
import { notFound, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { setMobileOverlayOpen } from '@/lib/mobile-overlay'
import { SajuAnalyzingOverlay } from '@/app/[locale]/input/saju/components'
import type { SajuChartSnapshot } from '@/types/analysis'
import sajuFixture from '../../../../../scripts/fixtures/saju-sample.json'

function OverlayHarness() {
  const searchParams = useSearchParams()

  // 검수 방해 방지: 하네스 표시 중 전역 BottomNav 숨김 (실제 /input 경로에서는 원래 렌더되지 않음)
  useEffect(() => {
    setMobileOverlayOpen('dev-saju-overlay-harness', true)
    return () => setMobileOverlayOpen('dev-saju-overlay-harness', false)
  }, [])

  if (process.env.NODE_ENV === 'production') notFound()

  const chart = ((sajuFixture as Record<string, unknown>).analysis_data as {
    sajuChart: SajuChartSnapshot
  }).sajuChart
  const isComplete = searchParams.get('complete') === '1'
  const noChart = searchParams.get('nochart') === '1'

  return (
    <div className="saju-ink-grain min-h-screen bg-[#0C0E16]">
      <SajuAnalyzingOverlay
        isVisible
        userName="김주연"
        targetType="self"
        chart={noChart ? null : chart}
        isComplete={isComplete}
        onDoorOpened={() => console.log('[harness] onDoorOpened')}
      />
      {/* 오버레이가 뷰포트를 완전히 덮는지 검증하기 위한 뒤쪽 더미 콘텐츠 */}
      <div className="mx-auto min-h-[200vh] w-full max-w-[455px] p-8 text-[#E9E2D0]">
        <p className="pt-24">이 텍스트가 보이면 오버레이가 뷰포트를 덮지 못한 것.</p>
      </div>
    </div>
  )
}

export default function SajuOverlayDevPage() {
  return (
    <Suspense fallback={null}>
      <OverlayHarness />
    </Suspense>
  )
}
