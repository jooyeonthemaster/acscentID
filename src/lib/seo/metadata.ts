import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'

const SITE_NAME = "AC'SCENT IDENTITY"
const DEFAULT_DESCRIPTION = 'AI 이미지 분석으로 나만의 맞춤 퍼퓸을 찾아드립니다. 이미지 분석 퍼퓸, 피규어 화분 디퓨저, 졸업 기념 퍼퓸까지. 10,000건 이상 분석 완료, 만족도 95%.'

const DEFAULT_DESCRIPTIONS: Record<Locale, string> = {
  ko: DEFAULT_DESCRIPTION,
  en: 'Find your perfect custom perfume with AI image analysis. Over 10,000 analyses, 95% satisfaction.',
  ja: 'AI画像分析であなただけのカスタムパフュームを見つけます。10,000件以上分析、満足度95%。',
  zh: '通过AI图像分析为您找到专属定制香水。分析超过10,000次，满意度95%。',
  es: 'Encuentra tu perfume personalizado con análisis de imagen IA. Más de 10,000 análisis, 95% de satisfacción.',
}

const OG_LOCALES: Record<Locale, string> = {
  ko: 'ko_KR',
  en: 'en_US',
  ja: 'ja_JP',
  zh: 'zh_CN',
  es: 'es_ES',
}

const DEFAULT_KEYWORDS: Record<Locale, string[]> = {
  ko: ['맞춤 향수', 'AI 퍼퓸', '향수 추천', '커스텀 향수', '이미지 분석 향수', '퍼스널 퍼퓸', '피규어 디퓨저', '졸업 선물'],
  en: ['custom perfume', 'AI perfume', 'perfume recommendation', 'personalized scent', 'image analysis fragrance', 'figure diffuser', 'graduation gift'],
  ja: ['カスタム香水', 'AIパフューム', '香水推薦', 'パーソナル香水', '画像分析フレグランス', 'フィギュアディフューザー', '卒業ギフト'],
  zh: ['定制香水', 'AI香水', '香水推荐', '个性化香水', '图像分析香水', '人偶扩香器', '毕业礼物'],
  es: ['perfume personalizado', 'perfume IA', 'recomendación de perfume', 'fragancia personalizada', 'difusor de figura', 'regalo de graduación'],
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.startsWith('http')
      ? process.env.NEXT_PUBLIC_SITE_URL
      : `https://${process.env.NEXT_PUBLIC_SITE_URL}`
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  return 'https://www.acscent.co.kr'
}

interface CreateMetadataOptions {
  title: string
  description?: string
  path?: string
  keywords?: string[]
  locale?: Locale
  openGraph?: {
    type?: 'website' | 'article'
    images?: Array<{ url: string; width?: number; height?: number; alt?: string }>
  }
  noIndex?: boolean
}

export function createMetadata({
  title,
  description,
  path = '/',
  keywords = [],
  locale = 'ko',
  openGraph,
  noIndex = false,
}: CreateMetadataOptions): Metadata {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${path}`
  const desc = description || DEFAULT_DESCRIPTIONS[locale] || DEFAULT_DESCRIPTION
  const localeKeywords = DEFAULT_KEYWORDS[locale] || DEFAULT_KEYWORDS.ko

  const metadata: Metadata = {
    title,
    description: desc,
    keywords: [...localeKeywords, ...keywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALES[locale] || 'ko_KR',
      type: openGraph?.type || 'website',
      ...(openGraph?.images && { images: openGraph.images }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      ...(openGraph?.images && { images: openGraph.images.map(img => img.url) }),
    },
  }

  if (noIndex) {
    metadata.robots = { index: false, follow: false }
  }

  return metadata
}

export { SITE_NAME, DEFAULT_DESCRIPTION }
