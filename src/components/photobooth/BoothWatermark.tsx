'use client'

// 영업용 포토부스 데모(/booth?…&demo=1) 화면에 'DEMO' 워터마크 — 키오스크 데모(KioskWatermark)와 같은 모양·CSS.
// 화면에만 깔린다(인화물·폰으로 받는 사진에는 찍지 않는다). 터치는 그대로 통과한다.

import { createPortal } from 'react-dom'
import { useCleanDemo } from '@/lib/use-clean-demo'
import '@/app/kiosk/kiosk-watermark.css'

export function BoothWatermark() {
  // 워터마크 없는 데모 — demo=clean 이고 서명(k)이 서버 확인을 통과했을 때만 걷는다(확인 전 · 실패는 깐다, src/lib/demo-clean.ts)
  const clean = useCleanDemo()
  if (clean) return null
  return createPortal(<div className="kdm-watermark" aria-hidden="true" />, document.body)
}
