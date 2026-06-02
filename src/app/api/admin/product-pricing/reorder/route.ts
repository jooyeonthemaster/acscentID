/**
 * 관리자 가격 옵션 순서 변경 API
 * PATCH /api/admin/product-pricing/reorder
 *   body: { product_type, sizes: string[] }  — sizes 배열 순서대로 sort_order 0,1,2... 재할당
 *
 * sort_order 만 갱신하므로 가격 변경 로그(trigger)는 발생하지 않습니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { invalidatePricingCache } from '@/lib/products/pricing'
import type { ProductType } from '@/types/cart'

interface ReorderBody {
  product_type: ProductType
  sizes: string[]
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  let body: ReorderBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const { product_type, sizes } = body
  if (!product_type || !Array.isArray(sizes) || sizes.length === 0) {
    return NextResponse.json({ error: 'product_type 과 sizes 배열은 필수입니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()

  // 각 size 의 sort_order 를 배열 인덱스로 갱신
  for (let i = 0; i < sizes.length; i++) {
    const { error } = await client
      .from('admin_product_pricing')
      .update({ sort_order: i, updated_by: admin.email })
      .eq('product_type', product_type)
      .eq('size', sizes[i])
    if (error) {
      console.error('[admin/product-pricing/reorder PATCH] DB error:', error)
      return NextResponse.json({ error: '순서 변경 실패', details: error.message }, { status: 500 })
    }
  }

  invalidatePricingCache()

  return NextResponse.json({ ok: true })
}
