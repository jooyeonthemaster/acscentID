import type { Metadata } from 'next'
import { BoothDemoLanding } from './BoothDemoLanding'

export const metadata: Metadata = {
  title: 'NEANDER 포토부스 데모',
  description: 'AI 아이돌·런웨이·한복·웨딩 등 AI 사진 프로그램과 뮤직비디오·추억 무비 영상을 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

export default function BoothDemoPage() {
  return <BoothDemoLanding />
}
