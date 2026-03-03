import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: '취소/환불/교환 정책',
  description: "AC'SCENT IDENTITY 취소, 환불, 교환 정책 안내. 맞춤 퍼퓸 및 피규어 디퓨저 주문 취소, 환불, 교환 절차를 확인하세요.",
  path: '/refund-policy',
  keywords: ['환불 정책', '취소 정책', '교환 정책'],
})

export default function RefundPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
