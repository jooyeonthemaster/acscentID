import type { Metadata } from 'next'

const SITE_NAME = "AC'SCENT IDENTITY"
const DEFAULT_DESCRIPTION = 'AI 이미지 분석으로 나만의 맞춤 퍼퓸을 찾아드립니다. 이미지 분석 퍼퓸, 피규어 화분 디퓨저, 졸업 기념 퍼퓸까지. 10,000건 이상 분석 완료, 만족도 95%.'

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
  openGraph?: {
    type?: 'website' | 'article'
    images?: Array<{ url: string; width?: number; height?: number; alt?: string }>
  }
  noIndex?: boolean
}

export function createMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  keywords = [],
  openGraph,
  noIndex = false,
}: CreateMetadataOptions): Metadata {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${path}`

  const defaultKeywords = [
    '맞춤 향수', 'AI 퍼퓸', '향수 추천', '커스텀 향수',
    '이미지 분석 향수', '퍼스널 퍼퓸', '피규어 디퓨저', '졸업 선물',
  ]

  const metadata: Metadata = {
    title,
    description,
    keywords: [...defaultKeywords, ...keywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: openGraph?.type || 'website',
      ...(openGraph?.images && { images: openGraph.images }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(openGraph?.images && { images: openGraph.images.map(img => img.url) }),
    },
  }

  if (noIndex) {
    metadata.robots = { index: false, follow: false }
  }

  return metadata
}

export { SITE_NAME, DEFAULT_DESCRIPTION }
