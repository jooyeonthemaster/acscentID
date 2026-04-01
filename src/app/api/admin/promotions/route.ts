import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com').split(',').map(e => e.trim().toLowerCase())

async function isAdmin(): Promise<{ isAdmin: boolean; email: string | null }> {
  const kakaoSession = await getKakaoSession()

  if (kakaoSession?.user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(kakaoSession.user.email.toLowerCase()),
      email: kakaoSession.user.email
    }
  }

  const supabase = await createServerSupabaseClientWithCookies()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email) {
    return {
      isAdmin: ADMIN_EMAILS.includes(user.email.toLowerCase()),
      email: user.email
    }
  }

  return { isAdmin: false, email: null }
}

/**
 * 프로모션 목록 조회 (관리자용)
 * GET /api/admin/promotions
 */
export async function GET() {
  const adminCheck = await isAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: '프로모션 조회 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ promotions: data })
}

/**
 * 프로모션 생성
 * POST /api/admin/promotions
 */
export async function POST(request: NextRequest) {
  const adminCheck = await isAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json()
  const { type, name, description, is_active, min_order_amount, start_date, end_date } = body

  if (!name || !type) {
    return NextResponse.json({ error: '프로모션 이름과 타입은 필수입니다' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('promotions')
    .insert({
      type,
      name,
      description: description || null,
      is_active: is_active ?? false,
      min_order_amount: min_order_amount || null,
      start_date: start_date || null,
      end_date: end_date || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: '프로모션 생성 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ promotion: data })
}

/**
 * 프로모션 수정
 * PUT /api/admin/promotions
 */
export async function PUT(request: NextRequest) {
  const adminCheck = await isAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await request.json()
  const { id, ...updateData } = body

  if (!id) {
    return NextResponse.json({ error: '프로모션 ID가 필요합니다' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { data, error } = await serviceClient
    .from('promotions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: '프로모션 수정 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ promotion: data })
}

/**
 * 프로모션 삭제
 * DELETE /api/admin/promotions
 */
export async function DELETE(request: NextRequest) {
  const adminCheck = await isAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: '프로모션 ID가 필요합니다' }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient
    .from('promotions')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: '프로모션 삭제 실패', details: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
