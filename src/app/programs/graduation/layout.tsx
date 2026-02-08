import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = createMetadata({
  title: '졸업 기념 퍼퓸 | 2/28 한정판매',
  description:
    '졸업의 추억을 향기로 남기세요. 뿌덕퍼퓸(10ml) + 학사모 퍼퓸 키링 + 졸업장 스타일 분석보고서 포함. 2/28까지 한정 판매. ₩34,000 (31% 할인)',
  path: '/programs/graduation',
  keywords: ['졸업 선물', '졸업 향수', '졸업 기념품', '학사모 키링', '졸업 퍼퓸', '졸업식 선물 추천'],
  openGraph: {
    type: 'website',
    images: [
      {
        url: '/images/jollduck/KakaoTalk_20260130_201156204.jpg',
        width: 800,
        height: 800,
        alt: '졸업 기념 퍼퓸 - AC\'SCENT IDENTITY',
      },
    ],
  },
})

const productJsonLd = productSchema({
  name: '졸업 기념 퍼퓸',
  description: '졸업의 추억을 향기로 남기세요. 뿌덕퍼퓸 + 학사모 퍼퓸 키링 + 졸업장st 분석보고서 포함.',
  price: 34000,
  originalPrice: 49000,
  image: '/images/jollduck/KakaoTalk_20260130_201156204.jpg',
  path: '/programs/graduation',
  availability: 'LimitedAvailability',
  validThrough: '2026-02-28',
  sku: 'ACSCENT-GRADUATION',
  ratingValue: 4.9,
  reviewCount: 60,
})

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '프로그램', path: '/programs/graduation' },
  { name: '졸업 기념 퍼퓸', path: '/programs/graduation' },
])

export default function GraduationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
