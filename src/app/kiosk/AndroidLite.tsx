'use client'

// 프린터 없는 안드로이드 키오스크 앱(tools/kiosk-android — 첫 기기 SUNMI TOSS_Front · RK3399 · Mali-T860)에서만 거는 가벼운 그리기.
// 유리 흐림(backdrop-filter)이 길잡이 영상 위에 겹치면 이 기기에서 화면이 초당 15장으로 떨어진다(2026-11-21 기기 실측: 끄면 28장).
// 흐림만 끄고 바탕색 · 테두리는 그대로 둔다 — 판들이 이미 거의 불투명(rgba .82~.9)이라 글자는 그대로 읽힌다.

import { useSyncExternalStore } from 'react'
import { receiptByQr } from '@/lib/kiosk/kiosk-bridge'

const subscribeNever = () => () => {}

// 이 기기에서만 그리는 <style> 이라 고르개는 전체(*)
const LITE_CSS = `
*, *::before, *::after {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}
`

export function AndroidLite() {
  const android = useSyncExternalStore(subscribeNever, () => receiptByQr(), () => false)
  if (!android) return null
  return <style>{LITE_CSS}</style>
}
