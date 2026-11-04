import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  OFFLINE_PROOF_PRODUCTS_TABLE,
  type OfflineProofProductOption,
} from '@/lib/offline-proof'
import { OfflineProofFormClient } from './OfflineProofFormClient'

// 오프라인 결제 증빙 제출 페이지 — 로케일 라우팅 제외(미들웨어 skip), 검색 노출 금지
export const metadata = {
  title: '오프라인 결제 증빙 제출 | AC\'SCENT IDENTITY',
  robots: { index: false, follow: false },
}

// 관리자가 상품을 추가·숨기면 바로 반영되도록 매 요청마다 읽는다
export const dynamic = 'force-dynamic'

/** 노출 중인 증빙 상품 — 이름만 (기준 가격은 손님에게 보내지 않는다) */
async function loadProducts(): Promise<OfflineProofProductOption[]> {
  try {
    const { data, error } = await createServiceRoleClient()
      .from(OFFLINE_PROOF_PRODUCTS_TABLE)
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Offline proof products load failed:', error.message)
      return []
    }
    return data || []
  } catch (error) {
    console.error('Offline proof products load error:', error)
    return []
  }
}

export default async function OfflineProofPage() {
  return <OfflineProofFormClient products={await loadProducts()} />
}
