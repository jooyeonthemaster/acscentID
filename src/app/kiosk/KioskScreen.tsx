'use client'

import dynamic from 'next/dynamic'
import { kioskExperience, previewKioskModeParam } from '@/lib/kiosk/experience'
import { readDeviceKioskMode } from '@/lib/kiosk/device-mode'
import { WebAccessGate } from './WebAccessGate'

// 기존·레트로·맥 화면 중 기기 설정의 하나만 싣는다 — 클래식과 공통 화면의 전역 CSS가 섞이지 않게(ui-switch.tsx 참고)
const Gate = dynamic(() => import('@/lib/screen-backgrounds/ui-switch').then(m => m.ScreenUiGate), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#f4f5f8' }} aria-busy="true" />,
})
const Retro = dynamic(() => import('./KioskClient').then(m => m.KioskClient), { ssr: false })
const Classic = dynamic(() => import('./classic/KioskClassic').then(m => m.KioskClassic), { ssr: false })
// 체험 모드(네일·명함 등)는 화면 디자인과 무관한 전용 화면 하나로 돈다 — 그 모드일 때만 싣는다
const Experience = dynamic(() => import('./experience/ExperienceApp').then(m => m.ExperienceApp), { ssr: false })

export function KioskScreen() {
  return (
    // 매장 키오스크 앱이 아닌 웹브라우저로 열면 먼저 비밀번호를 묻는다
    <WebAccessGate>
      <Gate
        target="kiosk"
        retro={Retro}
        classic={Classic}
        special={(mode) => {
          // 미리보기 주소 → 이 기기에만 켠 체험 모드 → 모든 키오스크가 함께 쓰는 운영 모드
          const id = kioskExperience(previewKioskModeParam() ?? readDeviceKioskMode() ?? mode)
          return id ? <Experience id={id} /> : null
        }}
      />
    </WebAccessGate>
  )
}
