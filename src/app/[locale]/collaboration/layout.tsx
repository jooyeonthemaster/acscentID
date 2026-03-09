import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = createMetadata({
  title: '협업 문의 - 브랜드 콜라보레이션',
  description:
    '브랜드, IP, 기업과 함께하는 맞춤형 향 콜라보레이션. AI 향 추천 프로그램 개발, 체험형 팝업스토어, 커스텀 향수 키링 케이스 제작.',
  path: '/collaboration',
  keywords: ['브랜드 콜라보', '팝업스토어', '커스텀 향수', '기업 협업', 'B2B 향수'],
})

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '협업 문의', path: '/collaboration' },
])

export default function CollaborationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
