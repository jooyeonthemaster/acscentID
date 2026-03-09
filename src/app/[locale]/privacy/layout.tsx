import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = createMetadata({
  title: '개인정보 처리방침',
  description: "AC'SCENT IDENTITY 개인정보 처리방침. 주식회사 네안더의 개인정보 수집 및 이용 안내.",
  path: '/privacy',
  noIndex: true,
})

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
