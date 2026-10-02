import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createMetadata } from '@/lib/seo/metadata'
import { isProgramEnabledServer } from '@/lib/programs/availability'
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
  const enabled = await isProgramEnabledServer('chemistry')
  const tInactive = await getTranslations({ locale, namespace: 'programs.inactive' })
  const title = enabled ? seo.title : `${tInactive('metaTitlePrefix')} · ${seo.title}`
  const path = getLocalizedProgramPath('chemistry', locale)

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
    price: opt?.price ?? 44000,
    originalPrice: opt?.original_price ?? 58000,
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
