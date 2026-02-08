import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'QR',
  robots: { index: false, follow: false },
}

export default function QrLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
