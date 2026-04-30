import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'
import { getServerOption } from '@/lib/products/pricing'

export const metadata: Metadata = createMetadata({
  title: '시그니처 뿌덕퍼퓸 LE QUACK',
  description:
    "AC'SCENT IDENTITY 시그니처 향수 LE QUACK. 오리 캐릭터 키링과 함께하는 특별한 향수.",
  path: '/programs/le-quack',
  keywords: ['시그니처 향수', '뿌덕퍼퓸', 'LE QUACK', '오리 키링', '캐릭터 향수'],
  openGraph: {
    type: 'website',
    images: [
      {
        url: '/images/perfume/LE QUACK.avif',
        width: 800,
        height: 800,
        alt: '시그니처 뿌덕퍼퓸 LE QUACK',
      },
    ],
  },
})

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '프로그램', path: '/programs/le-quack' },
  { name: 'LE QUACK', path: '/programs/le-quack' },
])

export default async function LeQuackLayout({ children }: { children: React.ReactNode }) {
  const opt = await getServerOption('signature', '10ml')
  const productJsonLd = productSchema({
    name: '시그니처 뿌덕퍼퓸 LE QUACK',
    description: "AC'SCENT IDENTITY 시그니처 향수. 오리 캐릭터 키링 포함.",
    price: opt?.price ?? 34000,
    originalPrice: opt?.original_price ?? 45000,
    image: '/images/perfume/LE QUACK.avif',
    path: '/programs/le-quack',
    availability: opt?.is_active === false ? 'SoldOut' : 'PreOrder',
    sku: 'ACSCENT-LEQUACK',
  })

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
