import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createMetadata } from '@/lib/seo/metadata'
import { isProgramEnabledServer } from '@/lib/programs/availability'
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
  const seo = getProgramSeo('graduation', locale)
  const enabled = await isProgramEnabledServer('graduation')
  const tInactive = await getTranslations({ locale, namespace: 'programs.inactive' })
  const title = enabled ? seo.title : `${tInactive('metaTitlePrefix')} · ${seo.title}`
  const path = getLocalizedProgramPath('graduation', locale)

  return createMetadata({
    title,
    // 판매중지 프로그램은 검색 노출에서 제외
    noIndex: !enabled,
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

export default async function GraduationLayout({ children, params }: ProgramLayoutProps) {
  const locale = resolveProgramLocale((await params).locale)
  const seo = getProgramSeo('graduation', locale)
  const path = getLocalizedProgramPath('graduation', locale)
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: seo.programLabel, path },
    { name: seo.title, path },
  ], locale)

  const opt = await getServerOption('graduation', '10ml')
  const productJsonLd = productSchema({
    name: seo.title,
    description: seo.productDescription,
    price: opt?.price ?? STANDARD_PERFUME_10ML_PRICE,
    originalPrice: opt?.original_price ?? 49000,
    image: '/images/product-placeholder.svg',
    path,
    availability: opt?.is_active === false ? 'SoldOut' : 'LimitedAvailability',
    validThrough: '2026-02-28',
    sku: 'ACSCENT-GRADUATION',
  })

  return (
    <>
      <JsonLd data={productJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
