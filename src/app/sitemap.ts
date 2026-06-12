import { MetadataRoute } from 'next'
import { defaultLocale, locales, type Locale } from '@/i18n/config'
import { STORE_PRODUCTS } from '@/lib/products/store-products'

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acscent.co.kr').replace(/\/$/, '')

type StaticSitemapPage = {
  path: `/${string}`
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}

const STATIC_PAGES: StaticSitemapPage[] = [
  {
    path: '/',
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    path: '/programs/idol-image',
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/programs/figure',
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/programs/graduation',
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/programs/chemistry',
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/programs/le-quack',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/programs/personal',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/products',
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  ...STORE_PRODUCTS.map((product): StaticSitemapPage => ({
    path: `/products/${product.slug}`,
    changeFrequency: 'weekly',
    priority: 0.75,
  })),
  {
    path: '/about/brand',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/about/how-it-works',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/faq',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/collaboration',
    changeFrequency: 'monthly',
    priority: 0.6,
  },
  {
    path: '/terms',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/refund-policy',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/privacy',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
]

function getLocalizedUrl(path: string, locale: Locale) {
  const normalizedPath = path === '/' ? '' : path
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`
  return `${BASE_URL}${localePrefix}${normalizedPath}`
}

function getLanguageAlternates(path: string) {
  return {
    'x-default': getLocalizedUrl(path, defaultLocale),
    ...Object.fromEntries(
      locales.map((locale) => [locale, getLocalizedUrl(path, locale)])
    ),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  return STATIC_PAGES.flatMap((page) =>
    locales.map((locale) => ({
      url: getLocalizedUrl(page.path, locale),
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: getLanguageAlternates(page.path),
      },
    }))
  )
}
