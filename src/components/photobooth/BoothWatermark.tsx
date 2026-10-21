'use client'

// 영업용 포토부스 데모(/booth?…&demo=1) 화면에 'NEANDER' 워터마크 — 키오스크 데모(KioskWatermark)와 같은 모양·CSS.
// 화면에만 깔린다(인화물·폰으로 받는 사진에는 찍지 않는다). 터치는 그대로 통과한다.

import { createPortal } from 'react-dom'
import { boothDemoClean } from '@/lib/booth/demo'
import '@/app/kiosk/kiosk-watermark.css'

export function BoothWatermark() {
  // 워터마크 없는 데모(/booth-demo/clean 에서 연 demo=clean)는 깔지 않는다
  if (boothDemoClean()) return null
  return createPortal(<div className="kdm-watermark" aria-hidden="true" />, document.body)
}
