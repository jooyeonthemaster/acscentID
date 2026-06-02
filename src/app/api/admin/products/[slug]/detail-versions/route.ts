import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/require-admin'

interface RouteParams {
  params: Promise<{ slug: string }>
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isMissingVersionTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string }
  return (
    candidate.code === 'PGRST205' ||
    Boolean(candidate.message?.includes('admin_product_detail_versions'))
  )
}

async function deployHtml(slug: string, html: string, versionId?: string) {
  const client = createServiceRoleClient()
  const now = new Date().toISOString()

  const { error } = await client
    .from('admin_product_details')
    .upsert({
      slug,
      detail_mode: 'custom',
      custom_html: html,
      updated_at: now,
      published_detail_mode: 'custom',
      published_html: html,
      published_at: now,
    }, { onConflict: 'slug' })

  if (error) throw error

  if (versionId) {
    await client
      .from('admin_product_detail_versions')
      .update({ deployed_at: now })
      .eq('id', versionId)
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
    .from('admin_product_detail_versions')
    .select('id, product_slug, label, html, created_by, created_at, deployed_at')
    .eq('product_slug', slug)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingVersionTable(error)) {
      return NextResponse.json({ versions: [], unavailable: true })
    }
    console.error('[admin/product detail versions GET] DB error:', error)
    return NextResponse.json({ error: '수정본 목록 조회 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ versions: data ?? [] })
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { slug } = await params
  const body = await request.json().catch(() => ({}))
  const label = cleanText(body.label) || `수정본 ${new Date().toLocaleString('ko-KR')}`
  const html = typeof body.html === 'string' ? body.html : ''
  const deploy = body.deploy === true

  if (label.length > 80) {
    return NextResponse.json({ error: '수정본 이름은 80자 이하여야 합니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()
  const { data, error } = await client
    .from('admin_product_detail_versions')
    .insert({
      product_slug: slug,
      label,
      html,
      created_by: admin.email,
    })
    .select('id, product_slug, label, html, created_by, created_at, deployed_at')
    .single()

  if (error) {
    if (isMissingVersionTable(error)) {
      const now = new Date().toISOString()
      const fallbackPayload: Record<string, unknown> = {
        slug,
        detail_mode: 'custom',
        custom_html: html,
        updated_at: now,
      }

      if (deploy) {
        fallbackPayload.published_detail_mode = 'custom'
        fallbackPayload.published_html = html
        fallbackPayload.published_at = now
      }

      const { error: fallbackError } = await client
        .from('admin_product_details')
        .upsert(fallbackPayload, { onConflict: 'slug' })

      if (fallbackError) {
        console.error('[admin/product detail versions POST fallback] DB error:', fallbackError)
        return NextResponse.json({ error: '상세페이지 저장 실패', details: fallbackError.message }, { status: 500 })
      }

      return NextResponse.json({
        version: {
          id: `draft-${Date.now()}`,
          product_slug: slug,
          label,
          html,
          created_by: admin.email,
          created_at: now,
          deployed_at: deploy ? now : null,
        },
        unavailable: true,
      }, { status: 201 })
    }
    console.error('[admin/product detail versions POST] DB error:', error)
    return NextResponse.json({ error: '수정본 저장 실패', details: error.message }, { status: 500 })
  }

  if (deploy) {
    try {
      await deployHtml(slug, html, data.id)
      data.deployed_at = new Date().toISOString()
    } catch (deployError) {
      console.error('[admin/product detail versions POST deploy] DB error:', deployError)
      return NextResponse.json({ error: '수정본은 저장됐지만 배포에 실패했습니다' }, { status: 500 })
    }
  }

  return NextResponse.json({ version: data }, { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { slug } = await params
  const body = await request.json().catch(() => ({}))
  const versionId = cleanText(body.version_id)
  const html = typeof body.html === 'string' ? body.html : null

  if (!versionId && html === null) {
    return NextResponse.json({ error: '배포할 수정본 또는 HTML이 필요합니다' }, { status: 400 })
  }

  const client = createServiceRoleClient()
  let htmlToDeploy = html
  if (versionId) {
    const { data, error } = await client
      .from('admin_product_detail_versions')
      .select('html')
      .eq('id', versionId)
      .eq('product_slug', slug)
      .single()
    if (error || !data) {
      if (error && isMissingVersionTable(error)) {
        return NextResponse.json({ error: '수정본 저장소가 아직 준비되지 않았습니다' }, { status: 503 })
      }
      return NextResponse.json({ error: '수정본을 찾을 수 없습니다' }, { status: 404 })
    }
    htmlToDeploy = data.html
  }

  try {
    await deployHtml(slug, htmlToDeploy ?? '', versionId || undefined)
  } catch (error) {
    console.error('[admin/product detail versions PATCH deploy] DB error:', error)
    return NextResponse.json({ error: '배포 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
