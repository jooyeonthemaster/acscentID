import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

/**
 * 현재 활성화된 프로모션 조회 (공개 API)
 * GET /api/promotions/active
 *
 * 날짜 조건도 확인하여 현재 유효한 프로모션만 반환합니다.
 */
export async function GET() {
  try {
    const serviceClient = createServiceRoleClient()
    const now = new Date().toISOString()

    const { data, error } = await serviceClient
      .from('promotions')
      .select('id, type, name, description, min_order_amount, start_date, end_date')
      .eq('is_active', true)

    if (error) {
      console.error('[Promotions API] Error fetching active promotions:', error)
      return NextResponse.json({ promotions: [] })
    }

    // 날짜 범위 필터링 (start_date, end_date)
    const activePromotions = (data || []).filter(promo => {
      if (promo.start_date && new Date(promo.start_date) > new Date(now)) return false
      if (promo.end_date && new Date(promo.end_date) < new Date(now)) return false
      return true
    })

    return NextResponse.json({ promotions: activePromotions })
  } catch (error) {
    console.error('[Promotions API] Unexpected error:', error)
    return NextResponse.json({ promotions: [] })
  }
}
