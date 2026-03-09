import { createMetadata } from '@/lib/seo/metadata'

export const metadata = createMetadata({
  title: '퍼스널 퍼퓸 - 나만의 맞춤 향수',
  description: 'AI 이미지 분석으로 나만의 시그니처 퍼퓸을 만들어보세요. 10,000건 이상의 분석 데이터 기반 맞춤 향수 추천.',
  path: '/programs/personal',
  keywords: ['퍼스널 퍼퓸', '맞춤 향수', '시그니처 향수', 'AI 향수 추천'],
})

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
