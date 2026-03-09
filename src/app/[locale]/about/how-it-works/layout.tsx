import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { howToSchema, breadcrumbSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = createMetadata({
  title: '이용방법 - AI 향기 분석 프로세스',
  description:
    'AI 이미지 분석으로 맞춤 퍼퓸을 만드는 방법. 이미지 업로드 → AI 분석 → 향기 레시피 생성 → 제품 제작. 간단한 과정으로 나만의 향기를 찾아보세요.',
  path: '/about/how-it-works',
  keywords: ['향수 만들기', 'AI 분석 방법', '맞춤 향수 과정', '퍼퓸 제작 과정'],
})

const howToJsonLd = howToSchema(
  'AI 이미지 분석으로 맞춤 퍼퓸 만들기',
  '이미지 업로드부터 맞춤 퍼퓸 수령까지의 과정을 안내합니다.',
  [
    { name: '이미지 업로드', text: '분석 받고 싶은 인물 또는 캐릭터의 이미지를 업로드합니다.' },
    { name: 'AI 분석', text: 'AI가 이미지의 색감, 분위기, 감정을 분석하여 향기 프로필을 생성합니다.' },
    { name: '향기 레시피 확인', text: '분석 결과와 맞춤 퍼퓸 레시피를 확인하고 주문합니다.' },
    { name: '제품 수령', text: '주문 후 2~3일 내에 맞춤 제작된 퍼퓸과 분석보고서를 받아보실 수 있습니다.' },
  ]
)

const breadcrumbJsonLd = breadcrumbSchema([
  { name: '소개', path: '/about/how-it-works' },
  { name: '이용방법', path: '/about/how-it-works' },
])

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={howToJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
