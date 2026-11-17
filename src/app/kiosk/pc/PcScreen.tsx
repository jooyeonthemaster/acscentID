'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { BoothWatermark } from '@/components/photobooth/BoothWatermark'
import { findKioskPcProgram } from '@/lib/kiosk/pc'
import { useDemoLink, useFungroundLink } from './demo-link'

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
// 펀그라운드 데모(site=funground)로 연 퍼스널 컬러 · 직업 탐색만 — 에디토리얼 위 막대와 테마 CSS(FgPcFrame). 행사 링크는 싣지 않는다
const FgPcFrame = dynamic(() => import('./FgPcFrame').then((m) => m.FgPcFrame), { ssr: false })
const FG_PROGRAM: Record<string, 'color' | 'next'> = { color: 'color', career: 'next' }

export function PcScreen({ slug }: { slug: string }) {
  const program = findKioskPcProgram(slug)
  const demo = useDemoLink()
  const fgProgram = useFungroundLink() ? FG_PROGRAM[slug] : undefined
  /** 펀그라운드 위 막대의 「처음으로」 — 프로그램 화면을 통째로 새로 그려 첫 화면으로 */
  const [session, setSession] = useState(0)
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
      {program.kind === 'shell' ? <Classic key={session} pinnedMode={program.mode} pc /> : <Experience key={session} id={program.experience} pc />}
      {fgProgram && <FgPcFrame program={fgProgram} onHome={() => setSession((n) => n + 1)} />}
      {/* 행사용 노트북 링크는 워터마크가 없다. 영업용 데모로 연 것만 DEMO 워터마크(서명 링크면 걷힌다 — BoothWatermark) */}
      {demo && <BoothWatermark />}
    </>
  )
}
