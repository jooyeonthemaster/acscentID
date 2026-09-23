'use client'

import dynamic from 'next/dynamic'

// 기존·레트로·맥 화면 중 기기 설정의 하나만 싣는다 — 클래식과 공통 화면의 전역 CSS가 섞이지 않게(ui-switch.tsx 참고)
const Gate = dynamic(() => import('@/lib/screen-backgrounds/ui-switch').then(m => m.ScreenUiGate), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#f4f5f8' }} aria-busy="true" />,
})
const Retro = dynamic(() => import('./KioskClient').then(m => m.KioskClient), { ssr: false })
const Classic = dynamic(() => import('./classic/KioskClassic').then(m => m.KioskClassic), { ssr: false })

export function KioskScreen() {
  return <Gate target="kiosk" retro={Retro} classic={Classic} />
}
