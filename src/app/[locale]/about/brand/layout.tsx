import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { localBusinessSchema, breadcrumbSchema } from '@/lib/seo/schemas'
import type { Locale } from '@/i18n/config'

const BRAND_SEO: Record<Locale, {
  title: string
  description: string
  keywords: string[]
  breadcrumbParent: string
  breadcrumbCurrent: string
}> = {
  ko: {
    title: '브랜드 스토리',
    description: "향기로 전하는 당신의 정체성. 주식회사 네안더의 AI 기반 퍼퓸 추천 서비스 AC'SCENT IDENTITY. 10,000건 이상 분석, 만족도 95%. 서울 마포구 홍대입구.",
    keywords: ['악센트 아이디', '네안더', '브랜드 스토리', '홍대 향수', 'AI 향수 브랜드'],
    breadcrumbParent: '브랜드',
    breadcrumbCurrent: '브랜드 스토리',
  },
  en: {
    title: 'Brand Story',
    description: "AC'SCENT IDENTITY is Neander Inc.'s AI-powered perfume recommendation service, sharing identity through scent in Seoul.",
    keywords: ['ACSCENT identity', 'Neander', 'brand story', 'Hongdae perfume', 'AI perfume brand'],
    breadcrumbParent: 'Brand',
    breadcrumbCurrent: 'Brand Story',
  },
  ja: {
    title: 'ブランドストーリー',
    description: "AC'SCENT IDENTITYは、香りであなたのアイデンティティを伝えるNeanderのAIパフューム推薦サービスです。",
    keywords: ['ACSCENT IDENTITY', 'Neander', 'ブランドストーリー', '弘大 香水', 'AI香水ブランド'],
    breadcrumbParent: 'ブランド',
    breadcrumbCurrent: 'ブランドストーリー',
  },
  zh: {
    title: '品牌故事',
    description: "AC'SCENT IDENTITY 是 NEANDER 以香气传递个性的 AI 香水推荐服务。",
    keywords: ['ACSCENT IDENTITY', 'NEANDER', '品牌故事', '弘大香水', 'AI香水品牌'],
    breadcrumbParent: '品牌',
    breadcrumbCurrent: '品牌故事',
  },
  es: {
    title: 'Historia de marca',
    description: "AC'SCENT IDENTITY es el servicio de recomendación de perfume con IA de Neander Inc., creado para expresar identidad a través del aroma.",
    keywords: ['ACSCENT identity', 'Neander', 'historia de marca', 'perfume Hongdae', 'marca de perfume IA'],
    breadcrumbParent: 'Marca',
    breadcrumbCurrent: 'Historia de marca',
  },
}

function resolveBrandLocale(locale: string | undefined): Locale {
  return locale === 'en' || locale === 'ja' || locale === 'zh' || locale === 'es' || locale === 'ko'
    ? locale
    : 'ko'
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = resolveBrandLocale(rawLocale)
  const seo = BRAND_SEO[locale] || BRAND_SEO.ko
  return createMetadata({
    title: seo.title,
    description: seo.description,
    path: locale === 'ko' ? '/about/brand' : `/${locale}/about/brand`,
    keywords: seo.keywords,
    locale,
  })
}

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = resolveBrandLocale(rawLocale)
  const seo = BRAND_SEO[locale] || BRAND_SEO.ko
  const path = locale === 'ko' ? '/about/brand' : `/${locale}/about/brand`
  const localBizJsonLd = localBusinessSchema(locale)
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: seo.breadcrumbParent, path },
    { name: seo.breadcrumbCurrent, path },
  ], locale)
  return (
    <>
      <JsonLd data={localBizJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
