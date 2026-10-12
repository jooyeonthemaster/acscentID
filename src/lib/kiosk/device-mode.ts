'use client'

// 이 키오스크에만 켜는 체험 모드 — 기기(localStorage)에만 저장한다.
// 운영 모드(매장 기본)는 서버의 기기 설정(settings-kiosk.mode)으로 모든 키오스크가 함께 쓰고,
// 체험 모드(사주·컬러·타로·체험 일곱 가지)는 관리자 창에서 고른 그 키오스크에서만 매장 기본 대신 돈다.
// 값이 있으면 서버 값보다 먼저다(useScreenBackgrounds 가 합친다). 설명: docs/kiosk-modes.md

import { useSyncExternalStore } from 'react'
import { isDeviceKioskMode } from './modes'

const KEY = 'acscent-kiosk-device-mode-v1'
const listeners = new Set<() => void>()

/** 이 기기에 저장된 체험 모드 — 없거나 없어진 모드 이름이면 null(운영 모드를 따른다) */
export function readDeviceKioskMode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const id = localStorage.getItem(KEY)
    return isDeviceKioskMode(id) ? id : null
  } catch { return null }
}

/** 체험 모드를 이 기기에 저장한다(null = 끄고 운영 모드로). 저장소를 못 쓰면 false */
export function writeDeviceKioskMode(id: string | null): boolean {
  try {
    if (isDeviceKioskMode(id)) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch { return false }
  if (readDeviceKioskMode() !== (isDeviceKioskMode(id) ? id : null)) return false
  listeners.forEach((notify) => notify())
  return true
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) notify() }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(notify); window.removeEventListener('storage', onStorage) }
}

/** 이 기기의 체험 모드 — 같은 화면의 여러 곳(셸·관리자 창)이 함께 바뀐다 */
export function useDeviceKioskMode(): string | null {
  return useSyncExternalStore(subscribe, readDeviceKioskMode, () => null)
}
