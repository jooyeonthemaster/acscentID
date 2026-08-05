import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'
import { getServerOption } from '@/lib/products/pricing'
import { STANDARD_PERFUME_10ML_PRICE } from '@/types/cart'
import { getLocalizedProgramPath, getProgramSeo, resolveProgramLocale } from '@/lib/programs/program-seo'

interface ProgramLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveProgramLocale((await params).locale)
  const seo = getProgramSeo('le-quack', locale)
  const path = getLocalizedProgramPath('le-quack', locale)

  return createMetadata({
    title: seo.title,
    description: seo.description,
    path,
    keywords: seo.keywords,
    locale,
    openGraph: {
      type: 'website',
      images: [
        {
          url: '/images/product-placeholder.svg',
          width: 800,
          height: 800,
          alt: seo.title,
        },
      ],
    },
  })
}

export default async function LeQuackLayout({ children, params }: ProgramLayoutProps) {
  const locale = resolveProgramLocale((await params).locale)
  const seo = getProgramSeo('le-quack', locale)
  const path = getLocalizedProgramPath('le-quack', locale)
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: seo.programLabel, path },
    { name: seo.title, path },
  ], locale)

  const opt = await getServerOption('signature', '10ml')
  const productJsonLd = productSchema({
    name: seo.title,
    description: seo.productDescription,
    price: opt?.price ?? STANDARD_PERFUME_10ML_PRICE,
    originalPrice: opt?.original_price ?? 45000,
    image: '/images/product-placeholder.svg',
    path,
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
