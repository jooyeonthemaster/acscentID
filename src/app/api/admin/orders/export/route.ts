import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { applyAdminOrderFilters, parseAdminOrderFilters } from '@/lib/admin/order-filters'
import {
  buildSalesRows,
  buildSalesWorkbook,
  buildSalesFileName,
  type SalesExcelOrder,
  type SalesExcelRow,
} from '@/lib/admin/sales-excel'

export const runtime = 'nodejs'

/**
 * 관리자 - 주문 매출 엑셀 내보내기
 * GET /api/admin/orders/export?status=&influencer=&search=&date_from=&date_to=&ids=
 *
 * `ids` 가 있으면 선택한 주문만, 없으면 현재 필터(기간 포함) 전체를 내보낸다.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = parseAdminOrderFilters(searchParams)

    const serviceClient = createServiceRoleClient()

    const baseQuery = serviceClient
      .from('orders')
      .select('*')
      .neq('status', 'awaiting_payment')
      .order('created_at', { ascending: true })

    const { data: orders, error } = await applyAdminOrderFilters(baseQuery, filters)

    if (error) {
      console.error('Sales export orders fetch failed:', error)
      return NextResponse.json({ error: '주문 조회에 실패했습니다' }, { status: 500 })
    }

    const orderList = (orders || []) as SalesExcelOrder[]

    // 품목 단위 행을 만들기 위해 order_items 병합
    if (orderList.length > 0) {
      const { data: items } = await serviceClient
        .from('order_items')
        .select('order_id, product_type, perfume_name, size, unit_price, quantity, subtotal')
        .in('order_id', orderList.map(o => o.id))
        .order('created_at', { ascending: true })

      if (items) {
        const itemMap = new Map<string, SalesExcelOrder['order_items']>()
        for (const item of items) {
          const bucket = itemMap.get(item.order_id) ?? []
          bucket.push(item)
          itemMap.set(item.order_id, bucket)
        }
        for (const order of orderList) {
          order.order_items = itemMap.get(order.id) ?? []
        }
      }
    }

    const rows: SalesExcelRow[] = orderList.flatMap(buildSalesRows)
    const buffer = await buildSalesWorkbook(rows)
    const fileName = buildSalesFileName(filters.dateFrom, filters.dateTo)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(buffer.byteLength),
        'X-Order-Count': String(orderList.length),
        'X-Row-Count': String(rows.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Sales export error:', error)
    return NextResponse.json({ error: '엑셀 생성에 실패했습니다' }, { status: 500 })
  }
}
