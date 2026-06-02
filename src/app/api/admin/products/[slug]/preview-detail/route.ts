import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { createServiceRoleClient } from '@/lib/supabase/service'

interface RouteParams {
  params: Promise<{ slug: string }>
}

function mapDetail(data: {
  slug: string
  detail_mode: string | null
  custom_html: string | null
  published_detail_mode: string | null
  published_html: string | null
} | null, slug: string) {
  const draftHtml = data?.custom_html ?? data?.published_html ?? null

  return {
    slug,
    detail_mode: draftHtml ? 'custom' : 'default',
    custom_html: draftHtml,
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { slug } = await params
  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_product_details')
    .select('slug, detail_mode, custom_html, published_detail_mode, published_html')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[admin/products preview-detail GET] DB error:', error)
    return NextResponse.json({ error: '상세페이지 조회 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ detail: mapDetail(data, slug) })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { slug } = await params
  const body = await request.json().catch(() => ({}))
  const html = typeof body.html === 'string' ? body.html : ''
  const now = new Date().toISOString()
  const client = createServiceRoleClient()

  const { data, error } = await client
    .from('admin_product_details')
    .upsert({
      slug,
      detail_mode: 'custom',
      custom_html: html,
      updated_at: now,
    }, { onConflict: 'slug' })
    .select('slug, detail_mode, custom_html, published_detail_mode, published_html')
    .single()

  if (error) {
    console.error('[admin/products preview-detail PATCH] DB error:', error)
    return NextResponse.json({ error: '상세페이지 저장 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ detail: mapDetail(data, slug) })
}
