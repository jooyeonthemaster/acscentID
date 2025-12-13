import { Metadata } from 'next'

// 기본 메타데이터
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://acscent-identity.vercel.app'

interface Props {
  params: Promise<{ id: string }>
}

// 동적 OG 메타 태그 생성
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  try {
    // API에서 결과 데이터 가져오기
    const response = await fetch(`${baseUrl}/api/results/${id}`, {
      next: { revalidate: 3600 } // 1시간 캐시
    })

    if (!response.ok) {
      return getDefaultMetadata()
    }

    const data = await response.json()

    if (!data.success || !data.result) {
      return getDefaultMetadata()
    }

    const { twitterName, perfumeName, perfumeBrand } = data.result

    const title = `AC'SCENT IDENTITY - ${perfumeName}`
    const description = `${twitterName} | ${perfumeBrand}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/result/${id}`,
        siteName: "AC'SCENT IDENTITY",
        type: 'website',
        locale: 'ko_KR',
        images: [
          {
            url: `${baseUrl}/og-image.png`,
            width: 1200,
            height: 630,
            alt: "AC'SCENT IDENTITY 분석 결과"
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`${baseUrl}/og-image.png`]
      }
    }
  } catch (error) {
    console.error('Metadata generation error:', error)
    return getDefaultMetadata()
  }
}

function getDefaultMetadata(): Metadata {
  return {
    title: "AC'SCENT IDENTITY - 향수 추천 결과",
    description: '나만의 향수를 찾아보세요! AI가 분석한 당신만의 시그니처 향기',
    openGraph: {
      title: "AC'SCENT IDENTITY",
      description: '나만의 향수를 찾아보세요! AI가 분석한 당신만의 시그니처 향기',
      siteName: "AC'SCENT IDENTITY",
      type: 'website',
      locale: 'ko_KR'
    }
  }
}

export default function SharedResultLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
