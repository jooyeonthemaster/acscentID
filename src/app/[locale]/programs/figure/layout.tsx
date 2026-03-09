import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = createMetadata({
  title: '피규어 화분 디퓨저',
  description:
    '좋아하는 이미지로 제작되는 나만의 3D 피규어 디퓨저. AI 맞춤 향 에센스와 샤쉐스톤 포함. 소중한 추억을 화분에 담아드립니다. ₩48,000 (29% 할인)',
  path: '/programs/figure',
  keywords: ['피규어 디퓨저', '3D 피규어', '커스텀 피규어', 'AI 디퓨저', '화분 디퓨저', '맞춤 굿즈'],
  openGraph: {
    type: 'website',
    images: [
      {
        url: '/images/diffuser/KakaoTalk_20260125_225229624.jpg',
        width: 800,
        height: 800,
        alt: '피규어 화분 디퓨저 - AC\'SCENT IDENTITY',
      },
    ],
  },
})

const productJsonLd = productSchema({
  name: '피규어 화분 디퓨저',
  description: '좋아하는 이미지로 제작되는 나만의 3D 피규어 디퓨저. 피규어 + 디퓨저 + 분석보고서 + 샤쉐스톤 + AI 맞춤 향 에센스 포함.',
  price: 48000,
  originalPrice: 68000,
  image: '/images/diffuser/KakaoTalk_20260125_225229624.jpg',
  path: '/programs/figure',
  availability: 'InStock',
  sku: 'ACSCENT-FIGURE',
  ratingValue: 4.9,
  reviewCount: 80,
})

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '프로그램', path: '/programs/figure' },
  { name: '피규어 화분 디퓨저', path: '/programs/figure' },
])

export default function FigureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
