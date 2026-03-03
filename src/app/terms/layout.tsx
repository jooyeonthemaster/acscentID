import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: '이용약관',
  description: "AC'SCENT IDENTITY 서비스 이용약관. 맞춤 퍼퓸 주문, 결제, 배송, 환불 등 서비스 이용에 관한 약관입니다.",
  path: '/terms',
  keywords: ['이용약관', '서비스 약관'],
})

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
