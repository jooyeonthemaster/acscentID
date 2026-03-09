import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { localBusinessSchema, breadcrumbSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = createMetadata({
  title: '브랜드 스토리',
  description:
    "향기로 전하는 당신의 정체성. 주식회사 네안더의 AI 기반 퍼퓸 추천 서비스 AC'SCENT IDENTITY. 10,000건 이상 분석, 만족도 95%. 서울 마포구 홍대입구.",
  path: '/about/brand',
  keywords: ['악센트 아이디', '네안더', '브랜드 스토리', '홍대 향수', 'AI 향수 브랜드'],
})

const localBizJsonLd = localBusinessSchema()
const breadcrumbJsonLd = breadcrumbSchema([
  { name: '브랜드', path: '/about/brand' },
  { name: '브랜드 스토리', path: '/about/brand' },
])

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={localBizJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
