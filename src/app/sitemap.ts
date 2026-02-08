import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.acscent.co.kr'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/programs/idol-image`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/programs/figure`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/programs/graduation`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/programs/le-quack`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about/brand`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/collaboration`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // 동적 페이지: Supabase에서 공개 분석 결과 조회
  let dynamicPages: MetadataRoute.Sitemap = []

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const { data: results } = await supabase
        .from('analysis_results')
        .select('id, created_at')
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)

      if (results) {
        dynamicPages = results.map((result) => ({
          url: `${BASE_URL}/result/${result.id}`,
          lastModified: new Date(result.created_at),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        }))
      }
    }
  } catch (error) {
    console.error('Sitemap: Failed to fetch dynamic pages:', error)
  }

  return [...staticPages, ...dynamicPages]
}
