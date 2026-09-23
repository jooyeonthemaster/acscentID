import { CounterClient } from './CounterClient'

// 매장 카운터 PC 전용 — 결제 후 포토부스 이용권을 영수증 프린터로 뽑아 준다. 검색 노출 금지
export const metadata = {
  title: "이용권 발급 | AC'SCENT PHOTO",
  robots: { index: false, follow: false },
}

export default function BoothCounterPage() {
  return <CounterClient />
}
