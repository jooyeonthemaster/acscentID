import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acscent.co.kr'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/checkout/',
          '/mypage/',
          '/input/',
          '/qr/',
          '/auth/',
          '/api/',
        ],
      },
      {
        userAgent: 'Yeti', // 네이버 크롤러
        allow: '/',
        disallow: [
          '/admin/',
          '/checkout/',
          '/mypage/',
          '/input/',
          '/qr/',
          '/auth/',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
