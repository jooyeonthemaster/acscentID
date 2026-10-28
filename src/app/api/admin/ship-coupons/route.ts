import { randomBytes, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  SHIP_COUPON_CODE_ALPHABET,
  SHIP_COUPON_CODE_LENGTH,
  SHIP_COUPON_MAX_ISSUE,
  SHIP_COUPON_TABLE,
  isShipCouponTableMissing,
} from '@/lib/offline-shipping-coupons'

export const runtime = 'nodejs'

const SETUP_REQUIRED = {
  setupRequired: true,
  error: 'SQL을 먼저 실행해주세요: supabase/migrations/20261028_offline_shipping_coupons.sql',
}

const COUPON_COLUMNS =
  'id, code, product_name, batch_id, batch_name, status, used_at, created_at, shipping_request_id, request:offline_shipping_requests(request_number, name)'

/** PostgREST 한 번 응답 상한(1000줄)을 넘겨도 다 읽도록 나눠 읽는다 */
const PAGE_SIZE = 1000
const MAX_ROWS = 10000

// 알파벳이 32자라 byte % 32 가 치우치지 않는다
function createCode(used: Set<string>): string {
  let code = ''
  do {
    code = Array.from(randomBytes(SHIP_COUPON_CODE_LENGTH))
      .map((byte) => SHIP_COUPON_CODE_ALPHABET[byte % SHIP_COUPON_CODE_ALPHABET.length])
      .join('')
  } while (used.has(code))
  used.add(code)
  return code
}

/**
 * 관리자 - 택배 교환권 전체 (최근 발급 순)
 * GET /api/admin/ship-coupons
 */
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()
    const coupons: unknown[] = []
    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const { data, error } = await serviceClient
        .from(SHIP_COUPON_TABLE)
        .select(COUPON_COLUMNS)
        .order('created_at', { ascending: false })
        .order('code', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (isShipCouponTableMissing(error)) {
        return NextResponse.json({ ...SETUP_REQUIRED, coupons: [] })
      }
      if (error) {
        console.error('Ship coupons fetch failed:', error)
        return NextResponse.json({ error: '교환권 목록을 불러오지 못했습니다' }, { status: 500 })
      }
      coupons.push(...(data || []))
      if (!data || data.length < PAGE_SIZE) break
    }

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('Admin ship coupons GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 택배 교환권 발급
 * POST /api/admin/ship-coupons  { productName, quantity, memo? }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const productName = typeof body.productName === 'string' ? body.productName.trim() : ''
    const memo = typeof body.memo === 'string' ? body.memo.trim() : ''
    const quantity = Number(body.quantity)

    if (!productName) {
      return NextResponse.json({ error: '상품을 골라주세요' }, { status: 400 })
    }
    if (productName.length > 100 || memo.length > 100) {
      return NextResponse.json({ error: '상품 이름·메모는 100자 이내로 입력해주세요' }, { status: 400 })
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > SHIP_COUPON_MAX_ISSUE) {
      return NextResponse.json(
        { error: `발급 수량은 1부터 ${SHIP_COUPON_MAX_ISSUE} 사이여야 합니다` },
        { status: 400 }
      )
    }

    const serviceClient = createServiceRoleClient()
    const batchId = randomUUID()
    const dateLabel = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
    const batchName = memo || `${productName} ${dateLabel}`

    // 코드가 이미 있는 코드와 겹치면(23505) 새로 뽑아 다시 넣는다 — 묶음 전체가 한 번에 들어가거나 안 들어간다
    for (let attempt = 0; attempt < 3; attempt++) {
      const used = new Set<string>()
      const rows = Array.from({ length: quantity }, () => ({
        code: createCode(used),
        product_name: productName,
        batch_id: batchId,
        batch_name: batchName,
        status: 'active',
        issued_by_admin_email: admin.email,
      }))

      const { data, error } = await serviceClient
        .from(SHIP_COUPON_TABLE)
        .insert(rows)
        .select(COUPON_COLUMNS)

      if (!error) {
        return NextResponse.json({ success: true, batchId, batchName, coupons: data || [] })
      }
      if (isShipCouponTableMissing(error)) {
        return NextResponse.json(SETUP_REQUIRED, { status: 503 })
      }
      if (error.code !== '23505') {
        console.error('Ship coupon issue failed:', error)
        return NextResponse.json({ error: '교환권 발급에 실패했습니다', details: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ error: '교환권 발급에 실패했습니다. 다시 시도해주세요' }, { status: 500 })
  } catch (error) {
    console.error('Admin ship coupons POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 아직 안 쓴 교환권 취소 (낱장 또는 묶음 전체)
 * PATCH /api/admin/ship-coupons  { ids?: string[], batchId?: string }
 * 이미 접수에 쓰인 교환권은 건드리지 않는다.
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string') : []
    const batchId = typeof body.batchId === 'string' ? body.batchId : ''
    if (ids.length === 0 && !batchId) {
      return NextResponse.json({ error: '취소할 교환권을 골라주세요' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    let query = serviceClient
      .from(SHIP_COUPON_TABLE)
      .update({ status: 'void', updated_at: new Date().toISOString() })
      .eq('status', 'active')
    query = ids.length > 0 ? query.in('id', ids) : query.eq('batch_id', batchId)

    const { data, error } = await query.select('id')
    if (error) {
      console.error('Ship coupon void failed:', error)
      return NextResponse.json({ error: '교환권 취소에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: data?.length || 0 })
  } catch (error) {
    console.error('Admin ship coupons PATCH error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
