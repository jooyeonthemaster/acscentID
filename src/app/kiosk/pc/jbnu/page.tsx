import { JbnuLanding } from './JbnuLanding'

// 2026학년도 2학기 JBNU 전공탐색박람회 — AI 체험존 랜딩(노트북 첫 화면). 박람회 키디자인 + 체험 블록 셋. docs/kiosk-pc.md
export const metadata = {
  title: 'JBNU 전공탐색박람회 · AI 체험존',
  robots: { index: false, follow: false },
}

export default function JbnuLandingPage() {
  return <JbnuLanding />
}
