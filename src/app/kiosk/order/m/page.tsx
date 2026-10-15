import { PhoneEntry } from './PhoneEntry'

// 손님 휴대폰 페이지 — 키오스크 완료 화면·영수증의 QR 로 연다. 주문 요약은 주소(o=)에 담겨 와서 서버에 저장하지 않는다.
// ar= 로 열면 그 메뉴의 3D 보기만 보여 준다.
export const metadata = {
  title: 'MORAK · My order',
  robots: { index: false, follow: false },
}

export default function OrderPhonePage() {
  return <PhoneEntry />
}
