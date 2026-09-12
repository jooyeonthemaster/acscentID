import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import {
  applyOfflineShippingFilters,
  parseOfflineShippingFilters,
  OFFLINE_SHIPPING_STATUSES,
} from '@/lib/admin/offline-shipping-filters'

/**
 * 관리자 - 오프라인 택배 접수 목록 조회
 * GET /api/admin/offline-shipping?status=&search=&date_from=&date_to=&page=&limit=
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = parseOfflineShippingFilters(searchParams)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const serviceClient = createServiceRoleClient()

    let query = serviceClient
      .from('offline_shipping_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    query = applyOfflineShippingFilters(query, filters)

    const { data: requests, error, count } = await query

    if (error) {
      console.error('Offline shipping list fetch failed:', error)
      return NextResponse.json({ error: '접수 목록 조회에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({
      requests: requests || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Admin offline shipping GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 접수 상태 변경
 * PATCH /api/admin/offline-shipping
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, status } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId가 필요합니다' }, { status: 400 })
    }
    if (!status || !(OFFLINE_SHIPPING_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태값입니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: shippingRequest, error } = await serviceClient
      .from('offline_shipping_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Offline shipping status update failed:', error)
      return NextResponse.json({ error: '상태 변경에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, request: shippingRequest })
  } catch (error) {
    console.error('Admin offline shipping PATCH error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 접수 관리자 메모 업데이트
 * PUT /api/admin/offline-shipping
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, admin_memo } = body

    if (!requestId) {
      return NextResponse.json({ error: 'requestId가 필요합니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: shippingRequest, error } = await serviceClient
      .from('offline_shipping_requests')
      .update({
        admin_memo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Offline shipping memo update failed:', error)
      return NextResponse.json({ error: '메모 저장에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, request: shippingRequest })
  } catch (error) {
    console.error('Admin offline shipping PUT error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 관리자 - 접수 삭제
 * DELETE /api/admin/offline-shipping
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const { requestIds } = body

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json({ error: '삭제할 접수 ID가 필요합니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { error, count } = await serviceClient
      .from('offline_shipping_requests')
      .delete({ count: 'exact' })
      .in('id', requestIds)

    if (error) {
      console.error('Offline shipping delete failed:', error)
      return NextResponse.json({ error: '접수 삭제에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedCount: count || requestIds.length })
  } catch (error) {
    console.error('Admin offline shipping DELETE error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
