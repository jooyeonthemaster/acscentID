/**
 * 가격 변경 로그 조회
 * GET /api/admin/product-pricing/log?product_type=&size=&limit=
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const productType = searchParams.get('product_type')
  const size = searchParams.get('size')
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)

  const client = createServiceRoleClient()
  let query = client
    .from('admin_product_pricing_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit)

  if (productType) query = query.eq('product_type', productType)
  if (size) query = query.eq('size', size)

  const { data, error } = await query

  if (error) {
    console.error('[admin/product-pricing/log GET] DB error:', error)
    return NextResponse.json({ error: '로그 조회 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data ?? [] })
}
