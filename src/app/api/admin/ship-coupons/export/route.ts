import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  SHIP_COUPON_TABLE,
  groupShipCouponRequests,
  isShipCouponTableMissing,
} from '@/lib/offline-shipping-coupons'
import {
  buildOfflineShippingWorkbook,
  type OfflineShippingExcelRequest,
} from '@/lib/admin/offline-shipping-excel'

export const runtime = 'nodejs'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const PAGE_SIZE = 1000
const MAX_ROWS = 20000

/**
 * 관리자 - 택배 교환권으로 들어온 접수 엑셀 (배송 약식 + 교환권 코드 열)
 * GET /api/admin/ship-coupons/export?batch=<batch_id>
 *
 * batch 가 없으면 교환권으로 들어온 접수 전체, 있으면 그 묶음 교환권이 쓰인 접수만.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const batchId = new URL(request.url).searchParams.get('batch')
    const serviceClient = createServiceRoleClient()

    type Row = { code: string; batch_id: string; product_name: string; request: OfflineShippingExcelRequest | OfflineShippingExcelRequest[] | null }
    const rows: Row[] = []
    for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
      const { data, error } = await serviceClient
        .from(SHIP_COUPON_TABLE)
        .select('code, batch_id, product_name, request:offline_shipping_requests(*)')
        .not('shipping_request_id', 'is', null)
        .order('created_at', { ascending: true })
        .order('code', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (isShipCouponTableMissing(error)) {
        return NextResponse.json({ error: '교환권 테이블이 아직 없어요' }, { status: 503 })
      }
      if (error) {
        console.error('Ship coupon export fetch failed:', error)
        return NextResponse.json({ error: '접수 조회에 실패했습니다' }, { status: 500 })
      }
      rows.push(...((data || []) as unknown as Row[]))
      if (!data || data.length < PAGE_SIZE) break
    }

    const requests = groupShipCouponRequests(rows, batchId)
    const buffer = await buildOfflineShippingWorkbook(requests, { withCouponCodes: true })

    const today = new Date(Date.now() + KST_OFFSET_MS).toISOString().split('T')[0]
    const batchProduct = batchId ? rows.find((row) => row.batch_id === batchId)?.product_name : null
    const label = batchProduct ? `_${batchProduct.replace(/[\\/:*?"<>|\s]+/g, '')}` : ''
    const fileName = `택배교환권_접수${label}_${today}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(buffer.byteLength),
        'X-Request-Count': String(requests.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Ship coupon export error:', error)
    return NextResponse.json({ error: '엑셀 생성에 실패했습니다' }, { status: 500 })
  }
}
