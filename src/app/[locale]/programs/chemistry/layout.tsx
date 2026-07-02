import type { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { productSchema, breadcrumbSchema } from '@/lib/seo/schemas'
import { getServerOption } from '@/lib/products/pricing'
import { getLocalizedProgramPath, getProgramSeo, resolveProgramLocale } from '@/lib/programs/program-seo'

interface ProgramLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = resolveProgramLocale((await params).locale)
  const seo = getProgramSeo('chemistry', locale)
  const path = getLocalizedProgramPath('chemistry', locale)

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
          alt: `${seo.title} - AC'SCENT IDENTITY`,
        },
      ],
    },
  })
}

export default async function ChemistryLayout({ children, params }: ProgramLayoutProps) {
  const locale = resolveProgramLocale((await params).locale)
  const seo = getProgramSeo('chemistry', locale)
  const path = getLocalizedProgramPath('chemistry', locale)
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: seo.programLabel, path },
    { name: seo.title, path },
  ], locale)

  const opt = await getServerOption('chemistry_set', 'set_10ml').catch((error) => {
    console.warn('[chemistry/layout] pricing lookup failed; using metadata fallback:', error)
    return null
  })
  const productJsonLd = productSchema({
    name: seo.title,
    description: seo.productDescription,
    price: opt?.price ?? 38000,
    originalPrice: opt?.original_price ?? 38000,
    image: '/images/product-placeholder.svg',
    path,
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
