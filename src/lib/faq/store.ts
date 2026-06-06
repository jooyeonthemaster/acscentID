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
    id: 'seed-perfume-image',
    category: 'AI 이미지 분석 퍼퓸',
    question: '어떤 이미지를 업로드해야 하나요?',
    answer:
      '인물 또는 캐릭터의 얼굴이 보이는 사진이면 모두 가능합니다. 화보, 무대, 셀카 등 어떤 사진이든 분석 가능합니다.\n\n분석 받고 싶은 인물 또는 캐릭터가 단독으로 있는 사진일수록, 고화질일수록 더 정확한 분석이 가능합니다.',
    is_active: true,
  },
  {
    id: 'seed-how-to-order',
    category: '주문/결제',
    question: '주문은 어떻게 하나요?',
    answer:
      '원하시는 프로그램 페이지에서 이미지를 업로드하고 분석을 진행한 후, 결과가 마음에 드시면 결제를 진행하시면 됩니다.',
    is_active: true,
  },
  {
    id: 'seed-when-ship',
    category: '배송',
    question: '언제 배송되나요?',
    answer: '주문일로부터 2~3일 내에 배송이 접수됩니다. 배송 접수가 지연되는 경우 미리 연락드릴 예정입니다.',
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
