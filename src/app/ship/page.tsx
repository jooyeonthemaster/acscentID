import { OfflineShippingFormClient } from './OfflineShippingFormClient'

// 매장 QR 전용 접수 페이지 — 로케일 라우팅 제외(미들웨어 skip), 검색 노출 금지
export const metadata = {
  title: '매장 택배 접수 | AC\'SCENT IDENTITY',
  robots: { index: false, follow: false },
}

export default function OfflineShippingPage() {
  return <OfflineShippingFormClient />
}
