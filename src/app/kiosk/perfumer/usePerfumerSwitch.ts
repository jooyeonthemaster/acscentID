'use client'

import { useEffect, useRef } from 'react'
import { previewKioskModeParam } from '@/lib/kiosk/experience'
import { kioskModeDesign } from '@/lib/kiosk/modes'

/**
 * SCENT! AI 조향사 전용 화면 ↔ 다른 화면 갈아타기 — 페이지를 처음 열 때 KioskScreen 이 하나만 고르므로,
 * 운영 모드가 이 화면 쪽으로(또는 반대로) 바뀌면 새로고침해 다시 고르게 한다(useExperienceSwitch 와 같은 규칙).
 * 손님이 없을 때(idle), 또는 관리자 창에서 바꾼 뒤 그 창이 닫힐 때만. 주소의 ?mode= 미리보기 중에는 따라가지 않는다.
 *  - onPerfumerScreen: 지금 이 화면이 SCENT! 전용 화면인가
 *  - mode: 지금 도는 모드(이 기기에만 켠 체험 모드 → 함께 쓰는 운영 모드)
 */
export function usePerfumerSwitch(onPerfumerScreen: boolean, mode: string | null | undefined, confirmed: boolean, idle: boolean, adminOpen = false) {
  const viaAdmin = useRef(false)
  useEffect(() => { if (adminOpen) viaAdmin.current = true }, [adminOpen])
  useEffect(() => {
    if (!confirmed || adminOpen || previewKioskModeParam()) return
    if ((kioskModeDesign(mode) === 'perfumer') === onPerfumerScreen) { viaAdmin.current = false; return }
    if (idle || viaAdmin.current) window.location.reload()
  }, [onPerfumerScreen, mode, confirmed, idle, adminOpen])
}
