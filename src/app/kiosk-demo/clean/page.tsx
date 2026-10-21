import type { Metadata } from 'next'
import { KioskDemoLanding } from '../KioskDemoLanding'

// 워터마크 없는 데모 랜딩 — 여기서 연 화면은 demo=clean 이라 NEANDER 워터마크가 깔리지 않는다(2026-10-22 사용자 지시).
// 주소를 받은 사람만 본다(검색 노출 금지). 워터마크 있는 기본판은 /kiosk-demo.
export const metadata: Metadata = {
  title: 'NEANDER 키오스크 데모',
  description: '세로형 터치 키오스크의 체험 프로그램 31가지를 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

export default function KioskDemoPageClean() {
  return <KioskDemoLanding clean />
}
