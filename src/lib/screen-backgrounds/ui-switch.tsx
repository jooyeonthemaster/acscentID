'use client'

// 기존(classic) ↔ 레트로(retro) ↔ 맥(mac) 화면 디자인 전환.
// 클래식과 공통 화면(레트로·맥)은 같은 .ksk-* / .bth-* 클래스 이름과 다른 전역 CSS를 써서, 둘 다 실리면 서로의
// 규칙이 섞인다. 그래서 페이지를 처음 열 때 하나만 골라 싣고(next/dynamic, ssr:false), 설정이 바뀌면
// 새로고침으로 갈아탄다 — 손님이 쓰는 중에는 기다렸다가 대기 화면에서 바꾼다.

import { ScreenDesignContext } from '@/components/mac/design-context'
import { useEffect, useState, type ComponentType } from 'react'
import { isScreenUi, type DeviceSettings, type ScreenTarget, type ScreenUi } from './types'

const cacheKey = (target: ScreenTarget) => `acscent-shared-backgrounds-v1-${target}`

function cachedUi(target: ScreenTarget): ScreenUi | null {
  try {
    const raw = localStorage.getItem(cacheKey(target))
    const ui = raw ? JSON.parse(raw)?.settings?.[target]?.ui : null
    return isScreenUi(ui) ? ui : null
  } catch { return null }
}

/** 첫 로드에 쓸 UI — 기기 캐시(useScreenBackgrounds 가 저장) → 없으면 서버 → 실패하면 레트로.
 *  localStorage 를 첫 렌더에 읽으므로 ssr:false 로만 싣는다(KioskScreen·BoothScreen). */
export function ScreenUiGate({ target, classic: Classic, retro: Retro }: {
  target: ScreenTarget
  classic: ComponentType
  retro: ComponentType<{ design?: 'retro' | 'mac' }>
}) {
  const [ui, setUi] = useState<ScreenUi | null>(() => cachedUi(target))
  const known = ui !== null
  useEffect(() => {
    if (known) return
    let alive = true
    fetch(`/api/screen-backgrounds?target=${target}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (alive) setUi(isScreenUi(data?.settings?.[target]?.ui) ? data.settings[target].ui : 'retro') })
      .catch(() => { if (alive) setUi('retro') })
    return () => { alive = false }
  }, [target, known])
  if (!ui) return <div style={{ position: 'fixed', inset: 0, background: '#f4f5f8' }} aria-busy="true" />
  return ui === 'classic' ? <Classic /> : (
    <ScreenDesignContext.Provider value={ui}>
      <Retro design={ui} />
    </ScreenDesignContext.Provider>
  )
}

/** 서버에서 확인한 설정이 지금 UI와 다르면, 손님이 없을 때(idle) 새로고침해 갈아탄다 */
export function useScreenUiSwitch(current: ScreenUi, settings: DeviceSettings, confirmed: boolean, idle: boolean) {
  useEffect(() => {
    if (confirmed && idle && settings.ui !== current) window.location.reload()
  }, [current, settings.ui, confirmed, idle])
}
