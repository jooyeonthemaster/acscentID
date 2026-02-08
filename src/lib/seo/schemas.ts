import { getBaseUrl } from './metadata'

// --- Organization ---
export function organizationSchema() {
  const baseUrl = getBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: "AC'SCENT IDENTITY",
    legalName: '주식회사 네안더',
    url: baseUrl,
    logo: `${baseUrl}/icon.png`,
    description: 'AI 이미지 분석 기반 맞춤 퍼퓸 추천 서비스',
    foundingDate: '2023',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+82-2-336-3368',
      email: 'neander@neander.co.kr',
      contactType: 'customer service',
      availableLanguage: 'Korean',
    },
    sameAs: [
      'https://www.instagram.com/acscent_id/',
      'https://x.com/acscent_id',
    ],
  }
}

// --- LocalBusiness ---
export function localBusinessSchema() {
  const baseUrl = getBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: "AC'SCENT IDENTITY",
    image: `${baseUrl}/images/hero/1.jpg`,
    '@id': `${baseUrl}/#localbusiness`,
    url: baseUrl,
    telephone: '+82-2-336-3368',
    email: 'neander@neander.co.kr',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '와우산로 112-1 1층',
      addressLocality: '마포구',
      addressRegion: '서울특별시',
      postalCode: '04066',
      addressCountry: 'KR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.554938,
      longitude: 126.92435,
    },
    priceRange: '₩₩',
    currenciesAccepted: 'KRW',
    paymentAccepted: '계좌이체',
  }
}

// --- WebSite ---
export function webSiteSchema() {
  const baseUrl = getBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: "AC'SCENT IDENTITY",
    url: baseUrl,
    description: 'AI 이미지 분석 기반 맞춤 퍼퓸 추천 서비스',
    inLanguage: 'ko',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/faq?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

// --- Product ---
interface ProductSchemaInput {
  name: string
  description: string
  price: number
  originalPrice: number
  image: string
  path: string
  availability?: 'InStock' | 'PreOrder' | 'SoldOut' | 'LimitedAvailability'
  validThrough?: string
  ratingValue?: number
  reviewCount?: number
  sku?: string
}

export function productSchema(product: ProductSchemaInput) {
  const baseUrl = getBaseUrl()
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image.startsWith('http') ? product.image : `${baseUrl}${product.image}`,
    url: `${baseUrl}${product.path}`,
    brand: {
      '@type': 'Brand',
      name: "AC'SCENT IDENTITY",
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'KRW',
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      seller: {
        '@type': 'Organization',
        name: '주식회사 네안더',
      },
      priceValidUntil: product.validThrough || '2026-12-31',
      ...(product.originalPrice > product.price && {
        discount: `${Math.round((1 - product.price / product.originalPrice) * 100)}%`,
      }),
    },
    ...(product.sku && { sku: product.sku }),
  }

  if (product.ratingValue && product.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.ratingValue,
      bestRating: 5,
      worstRating: 1,
      reviewCount: product.reviewCount,
    }
  }

  return schema
}

// --- FAQPage ---
interface FAQItem {
  question: string
  answer: string
}

export function faqPageSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer.replace(/\n/g, ' '),
      },
    })),
  }
}

// --- BreadcrumbList ---
interface BreadcrumbItem {
  name: string
  path: string
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  const baseUrl = getBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: baseUrl },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.name,
        item: `${baseUrl}${item.path}`,
      })),
    ],
  }
}

// --- HowTo ---
interface HowToStep {
  name: string
  text: string
}

export function howToSchema(name: string, description: string, steps: HowToStep[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  }
}
