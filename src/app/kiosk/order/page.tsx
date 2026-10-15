import { OrderKioskEntry } from './OrderKioskEntry'

// Aible AI 주문 키오스크 — 외국인 관광객용 매장 주문 화면의 레퍼런스(가상 매장 '모락 MORAK').
// 로케일 라우팅 밖(/kiosk/ 아래), 검색 노출 금지. 매장 키오스크 앱은 appUrl 을 이 주소로 바꾸면 그대로 뜬다.
export const metadata = {
  title: 'MORAK · Aible AI Order',
  robots: { index: false, follow: false },
}

export default function OrderKioskPage() {
  return <OrderKioskEntry />
}
