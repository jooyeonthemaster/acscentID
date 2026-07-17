import { supabase } from '@/lib/supabase/client'

// FAQ 한 건. 노출 순서는 배열 순서를 그대로 따른다.
export interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
  is_active: boolean
}

const BUCKET = 'admin-content'
const FAQ_PATH = 'faqs/faqs.json'

// 파일이 아직 없을 때(최초 상태) 보여줄 기본 FAQ.
// 관리자가 한 번이라도 저장하면 이 값 대신 저장된 내용이 사용된다.
export const DEFAULT_FAQS: FAQItem[] = [
  {
    id: 'seed-before-order-checklist',
    category: '주문 전 확인',
    question: '구매 전에 무엇을 확인하면 좋나요?',
    answer:
      '상품별 구성품, 용량/옵션, 제작 기간, 배송비, 취소 가능 시점을 먼저 확인해 주세요.\n\n맞춤 제작 상품은 주문 내용에 따라 제작이 시작되기 때문에, 결제 전 이름/이미지/옵션/배송지를 한 번 더 확인해 주시면 좋습니다.',
    is_active: true,
  },
  {
    id: 'seed-scent-fit-concern',
    category: '주문 전 확인',
    question: '향이 제 취향과 다르면 어떡하나요?',
    answer:
      '향은 업로드하신 이미지, 선택한 상품, 입력 정보 등을 바탕으로 추천·제작됩니다. 향 취향이 분명하다면 요청 가능한 상품의 요청란이나 주문 메모에 선호/비선호 노트를 적어주세요.\n\n처음 구매가 걱정된다면 시향지 옵션 또는 시향지 상품을 먼저 이용해보시는 방법도 추천드립니다.',
    is_active: true,
  },
  {
    id: 'seed-gift-ready',
    category: '주문 전 확인',
    question: '선물용으로 구매해도 괜찮나요?',
    answer:
      '네. 퍼퓸, 분석 카드, 패키지 등 상품별 구성에 맞춰 선물하기 좋은 형태로 준비됩니다.\n\n선물 일정이 정해져 있다면 배송 기간을 고려해 여유 있게 주문해 주세요. 배송 접수가 지연될 경우 개별 안내드립니다.',
    is_active: true,
  },
  {
    id: 'seed-perfume-image',
    category: '향/제작',
    question: '어떤 이미지를 업로드해야 하나요?',
    answer:
      '인물 또는 캐릭터의 얼굴이 보이는 사진이면 모두 가능합니다. 화보, 무대, 셀카 등 어떤 사진이든 분석 가능합니다.\n\n분석 받고 싶은 인물 또는 캐릭터가 단독으로 있는 사진일수록, 고화질일수록 더 정확한 분석이 가능합니다.',
    is_active: true,
  },
  {
    id: 'seed-how-scent-made',
    category: '향/제작',
    question: '향은 어떻게 정해지나요?',
    answer:
      'AI 분석 결과와 상품별 제작 기준을 바탕으로 분위기, 이미지 키워드, 선택 옵션에 어울리는 향을 구성합니다.\n\n분석 결과는 향을 고르는 기준으로 사용되며, 최종 상품은 주문하신 옵션과 제작 가능 범위 안에서 준비됩니다.',
    is_active: true,
  },
  {
    id: 'seed-custom-request',
    category: '향/제작',
    question: '원하는 향료나 분위기를 요청할 수 있나요?',
    answer:
      '요청란이 있는 상품은 원하는 향료, 분위기, 피하고 싶은 향을 적어주실 수 있습니다.\n\n예: 달달한 향은 적게, 시트러스 계열 선호, 특정 인물의 시그니처 무드 반영 등. 단, 원료 재고와 제작 안정성에 따라 모든 요청이 100% 반영되지는 않을 수 있습니다.',
    is_active: true,
  },
  {
    id: 'seed-how-to-order',
    category: '주문/결제',
    question: '주문은 어떻게 하나요?',
    answer:
      '원하시는 프로그램 또는 상품 페이지에서 옵션을 선택한 뒤 장바구니에 담거나 바로 구매할 수 있습니다.\n\nAI 분석형 상품은 이미지를 업로드하고 분석 결과를 확인한 다음 결제 단계로 이동합니다. 결제 전 주문 상품, 수량, 배송지, 최종 결제 금액을 꼭 확인해 주세요.',
    is_active: true,
  },
  {
    id: 'seed-guest-order',
    category: '주문/결제',
    question: '비회원도 구매할 수 있나요?',
    answer:
      '일부 바로 구매 상품은 비회원 구매가 가능합니다. 다만 분석 결과 저장, 장바구니, 리뷰 작성, 재구매 쿠폰 등 회원 기능은 로그인이 필요할 수 있습니다.\n\n주문 조회와 문의 처리를 위해 결제 시 입력한 연락처와 주문번호를 보관해 주세요.',
    is_active: true,
  },
  {
    id: 'seed-payment-methods',
    category: '주문/결제',
    question: '어떤 결제 수단을 사용할 수 있나요?',
    answer:
      '카드 결제와 계좌이체를 지원합니다. 카카오페이, 네이버페이 등 간편결제는 결제 채널 연동 상태에 따라 결제 화면에 표시됩니다.\n\n계좌이체 주문은 입금 확인 후 제작 및 배송 절차가 진행됩니다.',
    is_active: true,
  },
  {
    id: 'seed-payment-security',
    category: '주문/결제',
    question: '결제는 안전하게 처리되나요?',
    answer:
      '온라인 결제는 PG 결제창을 통해 진행되며, 주문 금액은 서버에서 한 번 더 확인한 뒤 처리됩니다.\n\n사이트에는 주문 처리와 배송에 필요한 정보가 저장되며, 결제 수단의 민감한 정보는 결제사 절차에 따라 처리됩니다.',
    is_active: true,
  },
  {
    id: 'seed-when-ship',
    category: '배송',
    question: '언제 배송되나요?',
    answer:
      '입금 확인 또는 결제 완료 후 보통 2~3 영업일 이내 배송이 접수됩니다.\n\n맞춤 제작 상품은 제작 상황에 따라 일정이 달라질 수 있으며, 배송 접수가 지연되는 경우 미리 연락드릴 예정입니다.',
    is_active: true,
  },
  {
    id: 'seed-shipping-fee',
    category: '배송',
    question: '배송비는 얼마인가요?',
    answer:
      '기본 배송비는 3,000원이며, 상품 합계 50,000원 이상 주문 시 무료배송이 적용됩니다.\n\n프로모션 기간에는 별도의 무료배송 혜택이 적용될 수 있고, 최종 배송비는 결제 화면에서 확인할 수 있습니다.',
    is_active: true,
  },
  {
    id: 'seed-cancel-before-production',
    category: '취소/교환',
    question: '주문 취소는 언제까지 가능한가요?',
    answer:
      '입금 대기 상태이거나 제작 전 단계라면 마이페이지 또는 고객센터를 통해 취소 신청이 가능합니다.\n\n제작이 시작된 맞춤 제작 상품은 단순 변심으로 인한 취소가 어려울 수 있습니다. 자세한 기준은 취소/환불/교환 정책을 확인해 주세요.',
    is_active: true,
  },
  {
    id: 'seed-defect-exchange',
    category: '취소/교환',
    question: '상품에 문제가 있으면 교환이나 환불이 가능한가요?',
    answer:
      '상품 파손, 변질, 오배송 등 하자가 있는 경우 수령 후 7일 이내 고객센터로 문의해 주세요.\n\n확인 후 교환 또는 환불 절차를 안내드리며, 상품 하자로 인한 반품 배송비는 회사가 부담합니다.',
    is_active: true,
  },
  {
    id: 'seed-opened-product',
    category: '취소/교환',
    question: '개봉한 상품도 교환할 수 있나요?',
    answer:
      '퍼퓸을 개봉하거나 사용해 상품 가치가 감소한 경우에는 교환/환불이 제한될 수 있습니다.\n\n단순 변심이 아닌 상품 하자나 오배송이라면 수령 후 7일 이내 주문번호와 사진을 함께 보내주세요.',
    is_active: true,
  },
  {
    id: 'seed-contact-order',
    category: '문의',
    question: '주문 관련 문의는 어디로 하면 되나요?',
    answer:
      '주문번호와 함께 고객센터로 문의해 주세요.\n\n전화: 02-336-3368\n이메일: neander@neander.co.kr\n운영 시간: 평일 10:00 ~ 18:00 (점심 12:00 ~ 13:00 / 주말·공휴일 휴무)',
    is_active: true,
  },
]

function isValidItem(v: unknown): v is FAQItem {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.category === 'string' &&
    typeof o.question === 'string' &&
    typeof o.answer === 'string' &&
    typeof o.is_active === 'boolean'
  )
}

/**
 * 저장된 FAQ 목록을 불러온다.
 * - 파일이 아직 없으면 DEFAULT_FAQS를 반환한다.
 * - fresh=true이면 CDN 캐시를 우회해 방금 저장한 값을 즉시 읽는다(관리자용).
 */
export async function loadFaqs(fresh = false): Promise<FAQItem[]> {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(FAQ_PATH)
  let url = data.publicUrl
  if (fresh) url += `?t=${Date.now()}`

  try {
    const res = await fetch(url, { cache: fresh ? 'no-store' : 'default' })
    if (!res.ok) return DEFAULT_FAQS
    const json = await res.json()
    if (!Array.isArray(json)) return DEFAULT_FAQS
    const items = json.filter(isValidItem)
    return items
  } catch {
    return DEFAULT_FAQS
  }
}

/**
 * FAQ 목록 전체를 JSON 파일로 저장한다(관리자 세션 필요).
 */
export async function saveFaqs(items: FAQItem[]): Promise<void> {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
  const { error } = await supabase.storage.from(BUCKET).upload(FAQ_PATH, blob, {
    contentType: 'application/json',
    cacheControl: '60',
    upsert: true,
  })
  if (error) throw error
}
