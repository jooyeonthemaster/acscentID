'use client'

import dynamic from 'next/dynamic'
import { useAutoUpdate } from '@/lib/photobooth/use-auto-update'
import { ScreenDesignContext } from '@/components/mac/design-context'
import { BOOTH_DEMO_PARAM } from '@/lib/booth/demo'

// 기존·레트로·맥 화면 중 기기 설정의 하나만 싣는다 — 클래식과 공통 화면의 전역 CSS가 섞이지 않게(ui-switch.tsx 참고)
const Gate = dynamic(() => import('@/lib/screen-backgrounds/ui-switch').then(m => m.ScreenUiGate), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#f4f5f8' }} aria-busy="true" />,
})
const Retro = dynamic(() => import('./BoothClient').then(m => m.BoothClient), { ssr: false })
const Classic = dynamic(() => import('./classic/BoothClassic').then(m => m.BoothClassic), { ssr: false })

export function BoothScreen() {
  useAutoUpdate()
  // 영업용 데모(?demo=1)는 매장과 같은 맥 화면으로 고정 — 기기 설정의 화면 디자인을 따르지 않는다
  const demo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has(BOOTH_DEMO_PARAM)
  if (demo) {
    return (
      <ScreenDesignContext.Provider value="mac">
        <Retro design="mac" />
      </ScreenDesignContext.Provider>
    )
  }
  return <Gate target="booth" retro={Retro} classic={Classic} />
}
