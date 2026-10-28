'use client'

// DEMO 워터마크 — 매장 키오스크 앱이 아닌 웹브라우저로 /kiosk 를 열면 화면 전체에 'DEMO' 를 비스듬히 깐다(무단 사용 방지 표시).
// 2026-10-13 접속 비밀번호를 없애고 이것으로 대신했다. 영업용 데모(/kiosk-demo 에서 연 주소, demo=1)는 어디서 열든 깐다.
// 매장 키오스크 앱(window.kiosk.isElectron)과 개발·기기 안 서버(localhost)에는 깔지 않는다. 앱인지는 화면에서 본다 — 서버에 묻지 않는다.
// 터치는 그대로 통과하고, 안내창·관리자 창보다 위에 그린다. 화면에만 깔린다(받는 그림·영수증에는 찍지 않는다).

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { DEMO_CLEAN, KIOSK_DEMO_PARAM } from '@/lib/kiosk/demo'
import './kiosk-watermark.css'

const subscribeNever = () => () => {}
function marked() {
  const demo = new URLSearchParams(window.location.search).get(KIOSK_DEMO_PARAM)
  // 워터마크 없는 데모(/kiosk-demo/clean 에서 연 demo=clean)는 깔지 않는다
  if (demo === DEMO_CLEAN) return false
  if (demo !== null) return true
  if (window.kiosk?.isElectron === true) return false
  const host = window.location.hostname
  return host !== 'localhost' && host !== '127.0.0.1'
}

export function KioskWatermark() {
  const show = useSyncExternalStore(subscribeNever, marked, () => false)
  if (!show) return null
  return createPortal(<div className="kdm-watermark" aria-hidden="true" />, document.body)
}
