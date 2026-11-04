'use client'

import { useEffect, useRef } from 'react'
import { kioskExperience, previewKioskModeParam, type ExperienceId } from '@/lib/kiosk/experience'

/**
 * 운영 모드가 '화면 셸로 도는 모드'(매장·사주·컬러·타로)와 '체험 모드' 사이에서, 또는 체험 모드끼리 바뀌면
 * 새로고침해 갈아탄다 — 두 쪽은 다른 화면 묶음이라 페이지를 처음 열 때 하나만 싣는다(KioskScreen).
 * 갈아타는 때: 손님이 없을 때(idle), 또는 관리자 창에서 바꾼 뒤 그 창이 닫힐 때(직원이 기기 앞에 있다).
 * 관리자 창이 열려 있는 동안에는 갈아타지 않는다(저장 안내가 보이는 채로 화면이 사라지지 않게).
 * 주소의 ?mode= 로 미리보는 중에는 기기 설정을 따라가지 않는다(끝없이 새로고침하지 않게).
 *  - current: 지금 떠 있는 화면(셸이면 null)
 *  - mode: 지금 도는 모드 — 이 기기에만 켠 체험 모드가 있으면 그것, 없으면 함께 쓰는 운영 모드(useScreenBackgrounds 의 baseSettings.mode)
 *  - confirmed: 서버에서 한 번이라도 설정을 받았는가(캐시만으로 갈아타지 않는다)
 */
export function useExperienceSwitch(current: ExperienceId | null, mode: string | null | undefined, confirmed: boolean, idle: boolean, adminOpen = false) {
  const viaAdmin = useRef(false)
  useEffect(() => { if (adminOpen) viaAdmin.current = true }, [adminOpen])
  useEffect(() => {
    if (!confirmed || adminOpen || previewKioskModeParam()) return
    if ((kioskExperience(mode) ?? null) === current) { viaAdmin.current = false; return }
    if (idle || viaAdmin.current) window.location.reload()
  }, [current, mode, confirmed, idle, adminOpen])
}
