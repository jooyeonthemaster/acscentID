import type { Metadata } from 'next'
import { KioskDemoLanding } from './KioskDemoLanding'

export const metadata: Metadata = {
  title: 'NEANDER 키오스크 데모',
  description: '세로형 터치 키오스크의 체험 프로그램 31가지를 직접 눌러 보는 데모입니다.',
  robots: { index: false, follow: false },
}

export default function KioskDemoPage() {
  return <KioskDemoLanding />
}
