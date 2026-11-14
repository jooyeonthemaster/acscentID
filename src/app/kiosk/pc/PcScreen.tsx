'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { BoothWatermark } from '@/components/photobooth/BoothWatermark'
import { findKioskPcProgram } from '@/lib/kiosk/pc'
import { useDemoLink } from './demo-link'

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
  const demo = useDemoLink()
  // 영업용 데모 표시 — 퍼스널 컬러 결과의 [휴대폰으로 받기] 버튼을 CSS 로 [인쇄하기]로 보인다(color-pc.css, 버튼은 셸 안에 있다)
  useEffect(() => {
    if (!demo) return
    const root = document.documentElement
    root.dataset.kioskDemo = ''
    return () => { delete root.dataset.kioskDemo }
  }, [demo])
  if (!program) return null
  return (
    <>
      {program.kind === 'shell' ? <Classic pinnedMode={program.mode} pc /> : <Experience id={program.experience} pc />}
      {/* 행사용 노트북 링크는 워터마크가 없다. 영업용 데모로 연 것만 DEMO 워터마크(서명 링크면 걷힌다 — BoothWatermark) */}
      {demo && <BoothWatermark />}
    </>
  )
}
