'use client'

// 기존(classic) ↔ 레트로(retro) ↔ 맥(mac) 화면 디자인 전환.
// 클래식과 공통 화면(레트로·맥)은 같은 .ksk-* / .bth-* 클래스 이름과 다른 전역 CSS를 써서, 둘 다 실리면 서로의
// 규칙이 섞인다. 그래서 페이지를 처음 열 때 하나만 골라 싣고(next/dynamic, ssr:false), 설정이 바뀌면
// 새로고침으로 갈아탄다 — 손님이 쓰는 중에는 기다렸다가 대기 화면에서 바꾼다.

import { ScreenDesignContext } from '@/components/mac/design-context'
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { isScreenUi, type DeviceSettings, type ScreenTarget, type ScreenUi } from './types'

const cacheKey = (target: ScreenTarget) => `acscent-shared-backgrounds-v1-${target}`

interface GateSettings { ui: ScreenUi; mode: string | null }

function cachedSettings(target: ScreenTarget): GateSettings | null {
  try {
    const raw = localStorage.getItem(cacheKey(target))
    const settings = raw ? JSON.parse(raw)?.settings?.[target] : null
    return isScreenUi(settings?.ui) ? { ui: settings.ui, mode: typeof settings.mode === 'string' ? settings.mode : null } : null
  } catch { return null }
}

/** 첫 로드에 쓸 UI — 기기 캐시(useScreenBackgrounds 가 저장) → 없으면 서버 → 실패하면 레트로.
 *  localStorage 를 첫 렌더에 읽으므로 ssr:false 로만 싣는다(KioskScreen·BoothScreen).
 *  special: 화면 디자인과 무관한 전용 화면(키오스크 체험 모드) — 운영 모드를 보고 화면을 돌려주면 셸 대신 그것을 싣는다. */
export function ScreenUiGate({ target, classic: Classic, retro: Retro, special }: {
  target: ScreenTarget
  classic: ComponentType
  retro: ComponentType<{ design?: 'retro' | 'mac' }>
  special?: (mode: string | null) => ReactNode | null
}) {
  const [settings, setSettings] = useState<GateSettings | null>(() => cachedSettings(target))
  const known = settings !== null
  useEffect(() => {
    if (known) return
    let alive = true
    fetch(`/api/screen-backgrounds?target=${target}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!alive) return
        const value = data?.settings?.[target]
        setSettings({ ui: isScreenUi(value?.ui) ? value.ui : 'retro', mode: typeof value?.mode === 'string' ? value.mode : null })
      })
      .catch(() => { if (alive) setSettings({ ui: 'retro', mode: null }) })
    return () => { alive = false }
  }, [target, known])
  if (!settings) return <div style={{ position: 'fixed', inset: 0, background: '#f4f5f8' }} aria-busy="true" />
  const dedicated = special?.(settings.mode)
  if (dedicated) return <>{dedicated}</>
  const ui = settings.ui
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
