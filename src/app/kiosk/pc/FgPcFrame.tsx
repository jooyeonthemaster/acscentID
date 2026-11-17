'use client'

// 펀그라운드 데모(주소 site=funground)로 연 노트북 가로판 — 「FUN GROUND Editorial」 위 막대(FUN GROUND · 01 02 03 · 처음으로)와
// 에디토리얼 테마 CSS(funground-editorial.css, html[data-site='funground'] 아래에만 걸린다)를 싣는다.
// 행사용 같은 링크(site 표시 없음)는 이 파일을 싣지 않는다(PcScreen 이 펀그라운드일 때만 동적으로 부른다) — 화면 · CSS 가 예전 그대로다.
// 프로그램 화면(KioskClassic · ExperienceApp)은 고치지 않는다 — 단계는 화면의 표시(data-program-step · data-page)를 읽어 01 · 02 · 03 으로 묶는다.

import { useEffect, useState } from 'react'
import { FG_ACCENT, FgTopBar, type FgStep } from '@/components/funground/FgStage'
import { anton } from '@/app/booth/programs/fonts'
import { usePcFit } from './usePcFit'
import './funground-editorial.css'

export type FgPcProgram = 'color' | 'next'

/** 지금 화면 → 위 막대 단계(1 시작 · 2 하기 · 3 결과) */
function readStep(program: FgPcProgram): FgStep {
  if (program === 'color') {
    const step = document.querySelector('.ksk-root[data-layout="pc"]')?.getAttribute('data-program-step')
    return !step || step === 'attract' ? 1 : step === 'result' ? 3 : 2
  }
  if (!document.querySelector('.kx-root[data-layout="pc"] .kx-page')) return 1
  return document.querySelector('.kx-root[data-layout="pc"] [data-page="career-result"]') ? 3 : 2
}

export function FgPcFrame({ program, onHome }: { program: FgPcProgram; onHome: () => void }) {
  const fit = usePcFit(true)
  const [step, setStep] = useState<FgStep>(1)

  // html 에 펀그라운드 표시 · 프로그램 · 단계 — 테마 CSS 가 이것만 본다. 강조색 변수와 Anton 글꼴 변수도 여기에
  useEffect(() => {
    const root = document.documentElement
    root.dataset.site = 'funground'
    root.dataset.fgProgram = program
    root.style.setProperty('--fg-accent', FG_ACCENT[program].accent)
    root.style.setProperty('--fg-on-accent', FG_ACCENT[program].on)
    root.classList.add(anton.variable)
    return () => {
      delete root.dataset.site
      delete root.dataset.fgProgram
      delete root.dataset.fgStep
      root.style.removeProperty('--fg-accent')
      root.style.removeProperty('--fg-on-accent')
      root.classList.remove(anton.variable)
    }
  }, [program])

  // 화면이 바뀔 때마다 단계를 다시 읽는다(프로그램 상태는 셸 안에 있어 DOM 표시로 본다)
  useEffect(() => {
    const update = () => {
      const next = readStep(program)
      setStep(next)
      document.documentElement.dataset.fgStep = String(next)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-program-step', 'data-page'] })
    return () => observer.disconnect()
  }, [program])

  return (
    <div className="fgpc-top" style={fit ? { zoom: fit.zoom, width: fit.width } : undefined}>
      <FgTopBar step={step} onHome={onHome} />
    </div>
  )
}
