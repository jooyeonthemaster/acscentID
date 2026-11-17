'use client'

// 펀그라운드 별내 체험기 화면 틀 — 32인치 가로 터치스크린(1920×1080 기준, 2026-11-14 사용자 지시: 기기 화면은 모두 가로)을
// 창 크기에 맞춰 키우거나 줄인다(가운데, 남는 곳은 어둡게). 노트북 창(1280×800 · 1440×900 등)에서도 같은 배치로 보인다.
// 위: 펀그라운드 로고 자리(실제 로고는 나중에 받는다 — 임시 「FUN GROUND」 글자) · 처음으로 단추. 아래 내용은 화면마다.
// 데모 주소(demo=1 · demo=clean&k=…)면 DEMO 워터마크(BoothWatermark — 서명이 맞으면 걷는다).

import { Home } from 'lucide-react'
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { BoothWatermark } from '@/components/photobooth/BoothWatermark'
import { anton } from '@/app/booth/programs/fonts'
import './funground.css'
import './editorial.css'

/**
 * 「FUN GROUND Editorial」 테마(2026-11-16 목업 ~/Downloads/펀그라운드별내_UI목업_20261116_에디토리얼) — 흰 바탕 · 검정 잉크 · 1px 선 ·
 * 프로그램마다 형광 강조색 하나. FgStage 에 program 을 넘기면 이 테마(위 막대: FUN GROUND · 01 02 03 · 처음으로)로 그린다.
 * 넘기지 않으면 예전 틀(LATER! · THEME! 처럼 데모 목록 밖 화면).
 */
export type FgProgramKey = 'color' | 'next' | 'fortune' | 'news' | 'dream' | 'start'
export const FG_ACCENT: Record<FgProgramKey, { accent: string; on: string }> = {
  color: { accent: '#C8FF2E', on: '#111111' },
  next: { accent: '#2E6BFF', on: '#FFFFFF' },
  fortune: { accent: '#FF7A1A', on: '#111111' },
  news: { accent: '#FF2E4D', on: '#FFFFFF' },
  dream: { accent: '#8B5CF6', on: '#FFFFFF' },
  start: { accent: '#111111', on: '#FFFFFF' },
}
/** 위 막대의 단계 — 시작 · 하기 · 결과 세 묶음(실제 화면이 더 많으면 묶어서 보인다) */
export type FgStep = 1 | 2 | 3

/** 강조색 CSS 변수(펀그라운드 밖에서 같은 색을 쓰는 화면 — 인쇄 미리보기 등) */
export const fgAccentVars = (program: FgProgramKey): CSSProperties => ({
  ['--fg-accent' as string]: FG_ACCENT[program].accent,
  ['--fg-on-accent' as string]: FG_ACCENT[program].on,
})

export const FG_W = 1920
export const FG_H = 1080

/** 창 크기에 맞춘 배율 */
export function useFgScale() {
  const [scale, setScale] = useState(0)
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / FG_W, window.innerHeight / FG_H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

/** 데모로 연 화면인가(주소의 demo=) — 데모 워터마크를 깐다 */
const subscribeNever = () => () => {}
/** 지금 주소의 검색 칸(브라우저) — 화면 처음 그릴 때(서버)는 '' */
export const useSearch = () => useSyncExternalStore(subscribeNever, () => window.location.search, () => '')

export function useIsDemo() {
  return new URLSearchParams(useSearch()).has('demo')
}

/**
 * 「처음으로」 — 세로 시작 화면에서 연 화면(주소 from=start, iframe 안)이면 시작 화면으로 돌아가고, 따로 연 화면이면 reset(제 첫 단계로).
 * 체험이 끝난 뒤 무입력으로 돌아갈 때도 이것을 부른다.
 */
export function useFgHome(reset: () => void) {
  return useCallback(() => {
    const fromStart = new URLSearchParams(window.location.search).get('from') === 'start'
    if (fromStart && window.parent !== window) window.parent.postMessage('fg:home', window.location.origin)
    else reset()
  }, [reset])
}

/** 펀그라운드 로고 자리 — 실제 로고를 받으면 그림으로 바꾼다 */
export function FgLogo({ small = false }: { small?: boolean }) {
  return (
    <span className={`fg-logo${small ? ' fg-logo--sm' : ''}`} aria-label="FUN GROUND 별내">
      <b>FUN</b><i>GROUND</i><em>별내</em>
    </span>
  )
}

/** 에디토리얼 위 막대 — 왼쪽 FUN GROUND 압축 글자 · 가운데 01 02 03(지금 단계 굵게 + 강조색 밑줄) · 오른쪽 작은 검정 「처음으로」 */
export function FgTopBar({ step, onHome, homeLabel = '처음으로' }: { step?: FgStep; onHome?: () => void; homeLabel?: string }) {
  return (
    <header className="fge-top">
      <span className="fge-logo" aria-label="FUN GROUND 별내">FUN GROUND</span>
      <span className="fge-rule" aria-hidden="true" />
      <ol className="fge-steps" aria-label="단계">
        {([1, 2, 3] as const).map((n) => (
          <li key={n} data-on={step === n || undefined} aria-current={step === n ? 'step' : undefined}>{`0${n}`}</li>
        ))}
      </ol>
      <span className="fge-rule" aria-hidden="true" />
      {onHome ? (
        <button type="button" className="fge-home" onClick={onHome}>{homeLabel}</button>
      ) : <span className="fge-home fge-home--empty" aria-hidden="true" />}
    </header>
  )
}

export function FgStage({ children, onHome, homeLabel = '처음으로', tone, className, program, step }: {
  children: ReactNode
  /** 처음으로 단추 — 없으면 단추를 숨긴다 */
  onHome?: () => void
  homeLabel?: string
  /** 화면 대표색(예전 틀의 머리 띠 · 단추) */
  tone?: string
  className?: string
  /** 에디토리얼 테마 — 프로그램 강조색 · 위 막대(넘기면 이 테마로 그린다) */
  program?: FgProgramKey
  /** 위 막대의 지금 단계(1 시작 · 2 하기 · 3 결과) */
  step?: FgStep
}) {
  const scale = useFgScale()
  const demo = useIsDemo()
  const editorial = Boolean(program)
  const style: CSSProperties = {
    width: FG_W, height: FG_H, transform: `translate(-50%, -50%) scale(${scale || 0.0001})`,
    ...(tone ? { ['--fg-tone' as string]: tone } : {}),
    ...(program ? fgAccentVars(program) : {}),
  }
  return (
    <div className={`fg-viewport${editorial ? ` fge-viewport ${anton.variable}` : ''}`}>
      <div className={`fg-stage${className ? ` ${className}` : ''}`} data-theme={editorial ? 'editorial' : undefined} data-program={program} style={style}>
        {editorial ? (
          <FgTopBar step={step} onHome={onHome} homeLabel={homeLabel} />
        ) : (
          <header className="fg-head">
            <FgLogo />
            {onHome && (
              <button type="button" className="fg-home" onClick={onHome}>
                <Home size={34} strokeWidth={2.2} aria-hidden="true" />{homeLabel}
              </button>
            )}
          </header>
        )}
        <div className="fg-body">{children}</div>
      </div>
      {demo && <BoothWatermark />}
    </div>
  )
}
