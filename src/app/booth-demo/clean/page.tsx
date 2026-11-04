import type { Metadata } from 'next'
import { BoothDemoLanding } from '../BoothDemoLanding'

// 워터마크 없는 데모 랜딩 — 여기서 연 화면은 demo=clean 이라 DEMO 워터마크가 깔리지 않는다(2026-10-22 사용자 지시).
// 주소를 받은 사람만 본다(검색 노출 금지). 워터마크 있는 기본판은 /booth-demo.
export const metadata: Metadata = {
  title: 'NEANDER 포토부스 데모',
  description: 'AI 아이돌·런웨이·한복·웨딩 등 AI 사진 프로그램과 뮤직비디오·추억 무비 영상을 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

export default function BoothDemoPageClean() {
  return <BoothDemoLanding clean />
}
