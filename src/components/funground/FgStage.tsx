'use client'

// 펀그라운드 별내 체험기 화면 틀 — 32인치 가로 터치스크린(1920×1080 기준, 2026-11-14 사용자 지시: 기기 화면은 모두 가로)을
// 창 크기에 맞춰 키우거나 줄인다(가운데, 남는 곳은 어둡게). 노트북 창(1280×800 · 1440×900 등)에서도 같은 배치로 보인다.
// 위: 펀그라운드 로고 자리(실제 로고는 나중에 받는다 — 임시 「FUN GROUND」 글자) · 처음으로 단추. 아래 내용은 화면마다.
// 데모 주소(demo=1 · demo=clean&k=…)면 DEMO 워터마크(BoothWatermark — 서명이 맞으면 걷는다).

import { Home } from 'lucide-react'
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { BoothWatermark } from '@/components/photobooth/BoothWatermark'
import './funground.css'

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

export function FgStage({ children, onHome, homeLabel = '처음으로', tone, className }: {
  children: ReactNode
  /** 처음으로 단추 — 없으면 단추를 숨긴다 */
  onHome?: () => void
  homeLabel?: string
  /** 화면 대표색(머리 띠 · 단추) */
  tone?: string
  className?: string
}) {
  const scale = useFgScale()
  const demo = useIsDemo()
  return (
    <div className="fg-viewport">
      <div
        className={`fg-stage${className ? ` ${className}` : ''}`}
        style={{ width: FG_W, height: FG_H, transform: `translate(-50%, -50%) scale(${scale || 0.0001})`, ...(tone ? { ['--fg-tone' as string]: tone } : {}) }}
      >
        <header className="fg-head">
          <FgLogo />
          {onHome && (
            <button type="button" className="fg-home" onClick={onHome}>
              <Home size={34} strokeWidth={2.2} aria-hidden="true" />{homeLabel}
            </button>
          )}
        </header>
        <div className="fg-body">{children}</div>
      </div>
      {demo && <BoothWatermark />}
    </div>
  )
}
