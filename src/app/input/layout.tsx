import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '분석 진행',
  robots: { index: false, follow: false },
}

export default function InputLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
