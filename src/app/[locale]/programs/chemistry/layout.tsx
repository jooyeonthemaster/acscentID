import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'
import { getServerOption } from '@/lib/products/pricing'

export const metadata: Metadata = createMetadata({
  title: '케미 향수 세트',
  description:
    '두 인물의 케미를 향기로 담는 맞춤 향수 세트. AI가 두 인물의 이미지와 관계를 분석하여 케미 프로필과 맞춤 향수 세트를 추천합니다. 케미 퍼퓸 세트(10ml x 2 / 50ml x 2) + 케미 프로필 카드.',
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

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '프로그램', path: '/programs/chemistry' },
  { name: '케미 향수 세트', path: '/programs/chemistry' },
])

export default async function ChemistryLayout({ children }: { children: React.ReactNode }) {
  const opt = await getServerOption('chemistry_set', 'set_10ml')
  const productJsonLd = productSchema({
    name: '케미 향수 세트',
    description: '두 인물의 케미를 향기로 담는 맞춤 향수 세트. 케미 퍼퓸 세트 + 케미 프로필 카드 포함.',
    price: opt?.price ?? 38000,
    originalPrice: opt?.original_price ?? 38000,
    image: '/images/perfume/KakaoTalk_20260125_225218071.jpg',
    path: '/programs/chemistry',
    availability: opt?.is_active === false ? 'SoldOut' : 'InStock',
    sku: 'ACSCENT-CHEMISTRY-SET',
  })

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
