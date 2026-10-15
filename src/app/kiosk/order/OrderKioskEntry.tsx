'use client'

import dynamic from 'next/dynamic'

// 시계·언어·화면 크기를 브라우저에서만 아는 화면이라 서버에서 그리지 않는다
const OrderKiosk = dynamic(() => import('./OrderKiosk').then((m) => m.OrderKiosk), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#0b0806' }} aria-busy="true" />,
})

export function OrderKioskEntry() {
  return <OrderKiosk />
}
