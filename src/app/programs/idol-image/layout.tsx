import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = createMetadata({
  title: 'AI 이미지 분석 퍼퓸',
  description:
    '좋아하는 이미지로 추출하는 나만의 퍼퓸. AI가 이미지의 색감, 분위기, 감정을 분석하여 맞춤 퍼퓸 레시피를 만들어드립니다. 뿌덕퍼퓸(10ml/50ml) + 실물 분석보고서 포함. ₩24,000 (31% 할인)',
  path: '/programs/idol-image',
  keywords: ['아이돌 향수', '이미지 분석 향수', '뿌덕퍼퓸', 'AI 향수 추천', '덕후 향수', '최애 향수'],
  openGraph: {
    type: 'website',
    images: [
      {
        url: '/images/perfume/KakaoTalk_20260125_225218071.jpg',
        width: 800,
        height: 800,
        alt: 'AI 이미지 분석 퍼퓸 - AC\'SCENT IDENTITY',
      },
    ],
  },
})

const productJsonLd = productSchema({
  name: 'AI 이미지 분석 퍼퓸',
  description: '좋아하는 이미지로 추출하는 나만의 맞춤 퍼퓸. 뿌덕퍼퓸 + 실물 분석보고서 포함.',
  price: 24000,
  originalPrice: 35000,
  image: '/images/perfume/KakaoTalk_20260125_225218071.jpg',
  path: '/programs/idol-image',
  availability: 'InStock',
  sku: 'ACSCENT-IDOL-IMAGE',
  ratingValue: 4.8,
  reviewCount: 150,
})

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '프로그램', path: '/programs/idol-image' },
  { name: 'AI 이미지 분석 퍼퓸', path: '/programs/idol-image' },
])

export default function IdolImageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
