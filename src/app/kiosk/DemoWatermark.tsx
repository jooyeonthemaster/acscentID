'use client'

// 영업용 데모 표시 — /kiosk-demo 에서 연 화면(주소에 demo=1)에는 화면 전체에 'NEANDER' 워터마크를 깐다.
// 누르는 데 방해가 되지 않게 터치는 그대로 통과시키고, 안내창·관리자 창보다도 위에 그린다. 매장 키오스크 앱은 이 주소로 열지 않는다.

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { KIOSK_DEMO_PARAM } from '@/lib/kiosk/demo'
import './demo-watermark.css'

const subscribeNever = () => () => {}
const isDemo = () => new URLSearchParams(window.location.search).has(KIOSK_DEMO_PARAM)

export function DemoWatermark() {
  const demo = useSyncExternalStore(subscribeNever, isDemo, () => false)
  if (!demo) return null
  return createPortal(<div className="kdm-watermark" aria-hidden="true" />, document.body)
}
