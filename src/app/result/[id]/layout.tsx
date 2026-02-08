import { Metadata } from 'next'
import { getBaseUrl } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/seo/schemas'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const baseUrl = getBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/api/results/${id}`, {
      next: { revalidate: 3600 },
    })

    if (!response.ok) return getDefaultMetadata()

    const data = await response.json()
    if (!data.success || !data.result) return getDefaultMetadata()

    const { twitterName, perfumeName, perfumeBrand, keywords } = data.result

    const title = `${twitterName || perfumeName}의 향기 분석 결과`
    const description = `${twitterName ? `${twitterName}의 ` : ''}AI 이미지 분석 결과 - ${perfumeBrand} ${perfumeName}. ${keywords ? keywords.slice(0, 3).join(', ') : '맞춤 퍼퓸 추천'}`
    const url = `${baseUrl}/result/${id}`

    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: "AC'SCENT IDENTITY",
        type: 'article',
        locale: 'ko_KR',
        images: [{ url: `${baseUrl}/opengraph-image`, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`${baseUrl}/opengraph-image`],
      },
    }
  } catch {
    return getDefaultMetadata()
  }
}

function getDefaultMetadata(): Metadata {
  return {
    title: '향기 분석 결과',
    description: 'AI가 분석한 당신만의 시그니처 향기. 이미지에서 추출된 맞춤 퍼퓸 레시피를 확인하세요.',
    openGraph: {
      title: "AC'SCENT IDENTITY - 향기 분석 결과",
      description: 'AI가 분석한 당신만의 시그니처 향기',
      siteName: "AC'SCENT IDENTITY",
      type: 'article',
      locale: 'ko_KR',
    },
  }
}

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '분석 결과', path: '/result' },
])

export default function SharedResultLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
