import type { Metadata } from 'next'
import { FungroundLanding } from './FungroundLanding'

// 펀그라운드 별내 견적 데모 — 링크를 받은 사람만 본다(검색 노출 금지, 로케일 라우팅 밖 middleware.ts). 설명: docs/funground-demo.md
export const metadata: Metadata = {
  title: '펀그라운드 별내 체험 부스 데모',
  description: '펀그라운드 별내 상설 체험기 견적(A안 AI 생성형 · B안 기기 안 처리형)의 프로그램을 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

export default function FungroundDemoPage() {
  return <FungroundLanding />
}
