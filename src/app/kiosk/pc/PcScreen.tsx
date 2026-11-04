'use client'

import dynamic from 'next/dynamic'
import { findKioskPcProgram } from '@/lib/kiosk/pc'

// 노트북 가로 화면 — 링크가 프로그램을 정한다. 퍼스널 컬러는 매장 키오스크의 기존(classic) 셸을, 캐리커처·직업 탐색은
// 체험 화면 틀을 가로 배치(pc)로 싣는다. 기기 설정을 읽어 화면을 갈아타지 않고, 워터마크·관리자 창도 없다.
const Classic = dynamic(() => import('../classic/KioskClassic').then((m) => m.KioskClassic), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#fff8e8' }} aria-busy="true" />,
})
const Experience = dynamic(() => import('../experience/ExperienceApp').then((m) => m.ExperienceApp), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#f4f5f8' }} aria-busy="true" />,
})

export function PcScreen({ slug }: { slug: string }) {
  const program = findKioskPcProgram(slug)
  if (!program) return null
  return program.kind === 'shell' ? <Classic pinnedMode={program.mode} pc /> : <Experience id={program.experience} pc />
}
