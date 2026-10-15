'use client'

import dynamic from 'next/dynamic'

const PhoneView = dynamic(() => import('./PhoneView').then((m) => m.PhoneView), {
  ssr: false,
  loading: () => <div style={{ minHeight: '100vh', background: '#0d0907' }} aria-busy="true" />,
})

export function PhoneEntry() {
  return <PhoneView />
}
