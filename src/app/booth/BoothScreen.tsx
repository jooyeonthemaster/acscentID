'use client'

import dynamic from 'next/dynamic'
import { useAutoUpdate } from '@/lib/photobooth/use-auto-update'
import { ScreenDesignContext } from '@/components/mac/design-context'
import { BOOTH_DEMO_PARAM } from '@/lib/booth/demo'
import { isProgramId } from '@/lib/booth/programs/catalog'
import { readDeviceBoothMode } from '@/lib/booth/device-mode'

// 기존·레트로·맥 화면 중 기기 설정의 하나만 싣는다 — 클래식과 공통 화면의 전역 CSS가 섞이지 않게(ui-switch.tsx 참고)
const Gate = dynamic(() => import('@/lib/screen-backgrounds/ui-switch').then(m => m.ScreenUiGate), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#f4f5f8' }} aria-busy="true" />,
})
const Retro = dynamic(() => import('./BoothClient').then(m => m.BoothClient), { ssr: false })
const Classic = dynamic(() => import('./classic/BoothClassic').then(m => m.BoothClassic), { ssr: false })
// 포토부스 프로그램 14종(런웨이·한복·뮤직비디오 등)은 화면 디자인과 무관한 전용 화면 — 그 모드일 때만 싣는다
const Program = dynamic(() => import('./programs/ProgramApp').then(m => m.ProgramApp), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#111' }} aria-busy="true" />,
})

export function BoothScreen() {
  useAutoUpdate()
  // 영업용 데모(?demo=1)는 주소의 모드로 — 기기 설정(화면 디자인·운영 모드)을 따르지 않는다.
  // 프로그램 모드면 프로그램 화면, 아니면 매장과 같은 맥 화면
  const query = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  if (query?.has(BOOTH_DEMO_PARAM)) {
    const mode = query.get('mode')
    if (isProgramId(mode)) return <Program id={mode} demo />
    return (
      <ScreenDesignContext.Provider value="mac">
        <Retro design="mac" />
      </ScreenDesignContext.Provider>
    )
  }
  // 운영 모드 = 이 부스에 따로 고른 모드(booth/device-mode.ts) → 없으면 모든 부스 공통(서버 캐시)
  return (
    <Gate
      target="booth" retro={Retro} classic={Classic}
      special={(mode) => {
        const current = readDeviceBoothMode() ?? mode
        return isProgramId(current) ? <Program id={current} demo={false} /> : null
      }}
    />
  )
}
