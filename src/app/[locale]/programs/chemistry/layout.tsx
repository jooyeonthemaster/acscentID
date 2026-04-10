import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = createMetadata({
  title: '케미 향수 세트',
  description:
    '두 캐릭터의 케미를 향기로 담는 맞춤 향수 세트. AI가 두 캐릭터의 이미지와 관계를 분석하여 케미 프로필과 맞춤 향수 세트를 추천합니다. 케미 퍼퓸 세트(10ml x 2 / 50ml x 2) + 케미 프로필 카드. ₩38,000~',
  path: '/programs/chemistry',
  keywords: ['케미 향수', '커플 향수', '캐릭터 향수', 'AI 케미 분석', '레이어링 향수', '향수 세트'],
  openGraph: {
    type: 'website',
    images: [
      {
        url: '/images/perfume/KakaoTalk_20260125_225218071.jpg',
        width: 800,
        height: 800,
        alt: '케미 향수 세트 - AC\'SCENT IDENTITY',
      },
    ],
  },
})

const productJsonLd = productSchema({
  name: '케미 향수 세트',
  description: '두 캐릭터의 케미를 향기로 담는 맞춤 향수 세트. 케미 퍼퓸 세트 + 케미 프로필 카드 포함.',
  price: 38000,
  originalPrice: 38000,
  image: '/images/perfume/KakaoTalk_20260125_225218071.jpg',
  path: '/programs/chemistry',
  availability: 'InStock',
  sku: 'ACSCENT-CHEMISTRY-SET',
})

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '프로그램', path: '/programs/chemistry' },
  { name: '케미 향수 세트', path: '/programs/chemistry' },
])

export default function ChemistryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
