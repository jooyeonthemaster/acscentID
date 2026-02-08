import { Metadata } from 'next'
import { createMetadata } from '@/lib/seo/metadata'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageSchema, breadcrumbSchema } from '@/lib/seo/schemas'

export const metadata: Metadata = createMetadata({
  title: '자주 묻는 질문',
  description:
    'AI 이미지 분석 퍼퓸, 피규어 화분 디퓨저, 주문/결제, 배송에 대한 자주 묻는 질문과 답변. 궁금하신 점을 빠르게 찾아보세요.',
  path: '/faq',
  keywords: ['FAQ', '자주 묻는 질문', '향수 주문 방법', '배송 안내', '퍼퓸 사용법'],
})

// FAQ 데이터 (page.tsx의 FAQ_DATA와 동기화)
const ALL_FAQS = [
  {
    question: '어떤 이미지를 업로드해야 하나요? (AI 이미지 분석 퍼퓸)',
    answer: '인물 또는 캐릭터의 얼굴이 보이는 사진이면 모두 가능합니다. 화보, 무대, 셀카 등 어떤 사진이든 분석 가능합니다. 분석 받고 싶은 인물 또는 캐릭터가 단독으로 있는 사진일수록, 고화질일수록 더 정확한 분석이 가능합니다.',
  },
  {
    question: '어떤 이미지를 업로드해야 하나요? (피규어 화분 디퓨저)',
    answer: '피규어로 제작될 이미지를 업로드하실 때는 인물 또는 캐릭터의 전신 또는 상반신이 잘 보이는 이미지일수록 좋습니다. 업로드하신 이미지와 최대한 비슷하게 구현하고 있기 때문에 피규어로 제작될 이미지를 업로드해주시면 됩니다.',
  },
  {
    question: '디퓨저는 어떻게 사용하나요?',
    answer: '샤쉐스톤 위에 향 에센스를 뿌려주시면 됩니다. 향이 약하면 에센스를 더욱 많이 뿌려주세요.',
  },
  {
    question: '주문은 어떻게 하나요?',
    answer: '원하시는 프로그램 페이지에서 이미지를 업로드하고 분석을 진행한 후, 결과가 마음에 드시면 결제를 진행하시면 됩니다.',
  },
  {
    question: '언제 배송되나요?',
    answer: '주문일로부터 2~3일 내에 배송이 접수됩니다. 배송 접수가 지연되는 경우 미리 연락드릴 예정입니다.',
  },
]

const faqJsonLd = faqPageSchema(ALL_FAQS)
const breadcrumbJsonLd = breadcrumbSchema([
  { name: '자주 묻는 질문', path: '/faq' },
])

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      {children}
    </>
  )
}
