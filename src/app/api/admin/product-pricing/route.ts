/**
 * 관리자 가격 관리 API
 * GET    /api/admin/product-pricing     — 전체 가격 목록 (활성/비활성 모두)
 * POST   /api/admin/product-pricing     — 새 가격 옵션 추가 (INSERT, 트리거가 initial 로그)
 * PATCH  /api/admin/product-pricing     — 단일 옵션 가격 수정 (트리거가 자동 로그)
 * DELETE /api/admin/product-pricing     — 단일 옵션 완전 삭제 (order_items 는 스냅샷이라 영향 없음)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { invalidatePricingCache } from '@/lib/products/pricing'
import type { ProductType } from '@/types/cart'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_product_pricing')
    .select('*')
    .order('product_type', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[admin/product-pricing GET] DB error:', error)
    return NextResponse.json({ error: '가격 목록 조회 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ pricing: data ?? [] })
}

interface PostBody {
  product_type: ProductType
  size: string
  label: string
  price: number
  original_price?: number | null
  is_active?: boolean
  sort_order?: number
  image_url?: string | null
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  let body: PostBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const product_type = body.product_type
  const size = typeof body.size === 'string' ? body.size.trim() : ''
  const label = typeof body.label === 'string' ? body.label.trim() : ''

  if (!product_type || !size || !label) {
    return NextResponse.json({ error: 'product_type, size, label 은 필수입니다' }, { status: 400 })
  }
  if (!Number.isInteger(body.price) || body.price < 0) {
    return NextResponse.json({ error: 'price 는 0 이상의 정수여야 합니다' }, { status: 400 })
  }
  let originalPrice: number | null = null
  if (body.original_price !== undefined && body.original_price !== null) {
    if (!Number.isInteger(body.original_price) || body.original_price < 0) {
      return NextResponse.json({ error: 'original_price 는 0 이상의 정수 또는 null 이어야 합니다' }, { status: 400 })
    }
    if (body.original_price < body.price) {
      return NextResponse.json({ error: 'original_price 는 price 이상이어야 합니다' }, { status: 400 })
    }
    originalPrice = body.original_price
  }

  const client = createServiceRoleClient()

  // 중복(PK) 사전 체크 — 같은 product_type 안에 동일 size 금지
  const { data: existing } = await client
    .from('admin_product_pricing')
    .select('size')
    .eq('product_type', product_type)
    .eq('size', size)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: `이미 "${size}" 옵션이 존재합니다` }, { status: 409 })
  }

  // sort_order 미지정 시 해당 상품의 맨 뒤로
  let sortOrder = body.sort_order
  if (typeof sortOrder !== 'number' || !Number.isInteger(sortOrder)) {
    const { data: rows } = await client
      .from('admin_product_pricing')
      .select('sort_order')
      .eq('product_type', product_type)
      .order('sort_order', { ascending: false })
      .limit(1)
    sortOrder = (rows?.[0]?.sort_order ?? -1) + 1
  }

  const { data, error } = await client
    .from('admin_product_pricing')
    .insert({
      product_type,
      size,
      label,
      price: body.price,
      original_price: originalPrice,
      is_active: body.is_active ?? true,
      sort_order: sortOrder,
      image_url: typeof body.image_url === 'string' && body.image_url.trim() ? body.image_url.trim() : null,
      updated_by: admin.email,
    })
    .select()
    .single()

  if (error) {
    console.error('[admin/product-pricing POST] DB error:', error)
    return NextResponse.json({ error: '옵션 추가 실패', details: error.message }, { status: 500 })
  }

  invalidatePricingCache()

  return NextResponse.json({ pricing: data }, { status: 201 })
}

interface PatchBody {
  product_type: ProductType
  size: string
  price?: number
  original_price?: number | null
  is_active?: boolean
  reason?: string
  image_url?: string | null
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const { product_type, size } = body
  if (!product_type || !size) {
    return NextResponse.json({ error: 'product_type 과 size 는 필수입니다' }, { status: 400 })
  }

  // 부분 업데이트 페이로드 구성
  const updates: Record<string, unknown> = { updated_by: admin.email }
  if (typeof body.price === 'number') {
    if (body.price < 0 || !Number.isFinite(body.price) || !Number.isInteger(body.price)) {
      return NextResponse.json({ error: 'price 는 0 이상의 정수여야 합니다' }, { status: 400 })
    }
    updates.price = body.price
  }
  if (body.original_price !== undefined) {
    if (body.original_price === null) {
      updates.original_price = null
    } else if (!Number.isInteger(body.original_price) || body.original_price < 0) {
      return NextResponse.json({ error: 'original_price 는 0 이상의 정수 또는 null 이어야 합니다' }, { status: 400 })
    } else {
      updates.original_price = body.original_price
    }
  }
  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active
  }
  if (body.image_url !== undefined) {
    updates.image_url =
      typeof body.image_url === 'string' && body.image_url.trim() ? body.image_url.trim() : null
  }

  if (Object.keys(updates).length === 1) {
    // updated_by 만 있고 변경 항목 없음
    return NextResponse.json({ error: '수정할 항목이 없습니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()

  // 사전 정합성: original_price >= price 보장 (DB CHECK 와 중복이지만 명확한 메시지 위해)
  if (typeof body.original_price === 'number' && typeof body.price === 'number') {
    if (body.original_price < body.price) {
      return NextResponse.json({ error: 'original_price 는 price 이상이어야 합니다' }, { status: 400 })
    }
  } else if (typeof body.price === 'number' && body.original_price === undefined) {
    // 한쪽만 갱신할 때 DB 의 기존 값과 비교
    const { data: existing } = await client
      .from('admin_product_pricing')
      .select('original_price')
      .eq('product_type', product_type)
      .eq('size', size)
      .maybeSingle()
    if (existing?.original_price !== null && existing?.original_price !== undefined && existing.original_price < body.price) {
      return NextResponse.json(
        { error: '새 price 가 기존 original_price 보다 큽니다. original_price 도 함께 조정하거나 null 로 설정하세요.' },
        { status: 400 },
      )
    }
  }

  const { data, error } = await client
    .from('admin_product_pricing')
    .update(updates)
    .eq('product_type', product_type)
    .eq('size', size)
    .select()
    .single()

  if (error) {
    console.error('[admin/product-pricing PATCH] DB error:', error)
    return NextResponse.json({ error: '가격 수정 실패', details: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '대상 옵션을 찾을 수 없습니다' }, { status: 404 })
  }

  // 변경 사유가 있으면 가장 최근 로그 row 에 reason 업데이트 (트리거가 사유 없이 INSERT 함)
  if (body.reason && body.reason.trim()) {
    const { data: latestLog } = await client
      .from('admin_product_pricing_log')
      .select('id')
      .eq('product_type', product_type)
      .eq('size', size)
      .order('changed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestLog?.id) {
      await client
        .from('admin_product_pricing_log')
        .update({ reason: body.reason.trim() })
        .eq('id', latestLog.id)
    }
  }

  invalidatePricingCache()

  return NextResponse.json({ pricing: data })
}

interface DeleteBody {
  product_type: ProductType
  size: string
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  let body: DeleteBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const { product_type, size } = body
  if (!product_type || !size) {
    return NextResponse.json({ error: 'product_type 과 size 는 필수입니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_product_pricing')
    .delete()
    .eq('product_type', product_type)
    .eq('size', size)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[admin/product-pricing DELETE] DB error:', error)
    return NextResponse.json({ error: '옵션 삭제 실패', details: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '대상 옵션을 찾을 수 없습니다' }, { status: 404 })
  }

  invalidatePricingCache()

  return NextResponse.json({ deleted: data })
}
