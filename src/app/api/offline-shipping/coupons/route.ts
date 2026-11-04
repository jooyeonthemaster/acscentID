import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import {
  SHIP_COUPON_MAX_PER_REQUEST,
  SHIP_COUPON_TABLE,
  isShipCouponCode,
  isShipCouponTableMissing,
  normalizeShipCouponCode,
} from '@/lib/offline-shipping-coupons'

export const runtime = 'nodejs'

type CheckStatus = 'active' | 'used' | 'void' | 'not_found'

/**
 * 택배 교환권 확인 (QR 폼 /ship 전용, 비로그인 공개)
 * POST /api/offline-shipping/coupons  { codes: string[] }
 * → 코드마다 상품 이름과 상태만 돌려준다 (접수 건 정보는 주지 않는다)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const rawCodes: unknown[] = Array.isArray(body?.codes) ? body.codes : []
    const codes = [...new Set(rawCodes.filter((c): c is string => typeof c === 'string').map(normalizeShipCouponCode))]
      .filter(Boolean)
      .slice(0, SHIP_COUPON_MAX_PER_REQUEST)

    if (codes.length === 0) {
      return NextResponse.json({ error: '교환권 코드를 입력해주세요' }, { status: 400 })
    }

    // 모양이 틀린 코드는 조회하지 않고 바로 '없는 교환권'
    const lookupCodes = codes.filter(isShipCouponCode)
    const rows: { code: string; product_name: string; status: string }[] = []

    if (lookupCodes.length > 0) {
      const serviceClient = createServiceRoleClient()
      const { data, error } = await serviceClient
        .from(SHIP_COUPON_TABLE)
        .select('code, product_name, status')
        .in('code', lookupCodes)

      if (isShipCouponTableMissing(error)) {
        return NextResponse.json({ error: '택배 접수를 준비하고 있어요. 매장 스태프에게 문의해주세요.' }, { status: 503 })
      }
      if (error) {
        console.error('Ship coupon lookup failed:', error)
        return NextResponse.json({ error: '교환권 확인에 실패했습니다. 잠시 후 다시 시도해주세요' }, { status: 500 })
      }
      rows.push(...(data || []))
    }

    const byCode = new Map(rows.map((row) => [row.code, row]))
    return NextResponse.json({
      coupons: codes.map((code) => {
        const row = byCode.get(code)
        return {
          code,
          productName: row?.product_name || null,
          status: (row?.status as CheckStatus | undefined) || 'not_found',
        }
      }),
    })
  } catch (error) {
    console.error('Ship coupon check error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
