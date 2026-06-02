/**
 * 관리자 상품 기본정보 API
 * GET   /api/admin/products  - 상품 목록
 * POST  /api/admin/products  - 상품 추가
 * PATCH /api/admin/products  - 상품 수정 (slug 제외)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'
import { buildDefaultProductDetailTemplate } from '@/lib/products/detail-template'

interface ProductPayload {
  slug?: string
  name?: string
  is_active?: boolean
  display_order?: number
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOrder(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = Number(value)
  if (!Number.isInteger(num) || num < 0) return null
  return num
}

function validateSlug(slug: string): string | null {
  if (!slug) return 'slug는 필수입니다'
  if (slug.length > 64) return 'slug는 64자 이하여야 합니다'
  if (!SLUG_PATTERN.test(slug)) {
    return 'slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다'
  }
  return null
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_products')
    .select('slug, name, is_active, display_order, updated_at')
    .order('display_order', { ascending: true })
    .order('slug', { ascending: true })

  if (error) {
    console.error('[admin/products GET] DB error:', error)
    return NextResponse.json({ error: '상품 목록 조회 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data ?? [] })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  let body: ProductPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const slug = normalizeText(body.slug).toLowerCase()
  const name = normalizeText(body.name)
  const slugError = validateSlug(slug)
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 })
  if (!name) return NextResponse.json({ error: '상품명은 필수입니다' }, { status: 400 })
  if (name.length > 80) return NextResponse.json({ error: '상품명은 80자 이하여야 합니다' }, { status: 400 })
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active는 boolean이어야 합니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()
  const now = new Date().toISOString()
  let displayOrder = normalizeOrder(body.display_order)
  if (body.display_order !== undefined && displayOrder === null) {
    return NextResponse.json({ error: '정렬 순서는 0 이상의 정수여야 합니다' }, { status: 400 })
  }

  if (displayOrder === null) {
    const { data: existing } = await client
      .from('admin_products')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    displayOrder = (existing?.display_order ?? -1) + 1
  }

  const { data, error } = await client
    .from('admin_products')
    .insert({
      slug,
      name,
      is_active: body.is_active ?? false,
      display_order: displayOrder,
      updated_at: now,
    })
    .select('slug, name, is_active, display_order, updated_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 사용 중인 slug입니다' }, { status: 409 })
    }
    console.error('[admin/products POST] DB error:', error)
    return NextResponse.json({ error: '상품 추가 실패', details: error.message }, { status: 500 })
  }

  const templateHtml = buildDefaultProductDetailTemplate({ slug, name })
  const { error: detailError } = await client
    .from('admin_product_details')
    .upsert(
      {
        slug,
        detail_mode: 'custom',
        custom_html: templateHtml,
        published_detail_mode: 'default',
        published_html: null,
        updated_at: now,
        published_at: null,
      },
      { onConflict: 'slug' },
    )

  if (detailError) {
    console.error('[admin/products POST] detail template error:', detailError)
    return NextResponse.json({
      product: data,
      warning: '상품은 추가되었지만 상세페이지 기본 템플릿 생성에 실패했습니다',
      details: detailError.message,
    }, { status: 201 })
  }

  return NextResponse.json({ product: data, detail_template_created: true }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  let body: ProductPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문' }, { status: 400 })
  }

  const slug = normalizeText(body.slug).toLowerCase()
  const slugError = validateSlug(slug)
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) {
    const name = normalizeText(body.name)
    if (!name) return NextResponse.json({ error: '상품명은 비워둘 수 없습니다' }, { status: 400 })
    if (name.length > 80) return NextResponse.json({ error: '상품명은 80자 이하여야 합니다' }, { status: 400 })
    updates.name = name
  }
  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active
  }
  if (body.display_order !== undefined) {
    const displayOrder = normalizeOrder(body.display_order)
    if (displayOrder === null) {
      return NextResponse.json({ error: '정렬 순서는 0 이상의 정수여야 합니다' }, { status: 400 })
    }
    updates.display_order = displayOrder
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: '수정할 항목이 없습니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_products')
    .update(updates)
    .eq('slug', slug)
    .select('slug, name, is_active, display_order, updated_at')
    .single()

  if (error) {
    console.error('[admin/products PATCH] DB error:', error)
    return NextResponse.json({ error: '상품 수정 실패', details: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json({ product: data })
}
