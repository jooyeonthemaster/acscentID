import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { getKakaoSession } from '@/lib/auth-session'

// 간단한 랜덤 코드 생성 함수
function generateQRCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 관리자 이메일 목록
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'nadr110619@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

// 관리자 인증 확인
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

// QR 코드 목록 조회
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const productType = searchParams.get('product_type')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    const supabase = await createServerSupabaseClientWithCookies()

    let query = supabase
      .from('qr_codes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (productType && productType !== 'all') {
      query = query.eq('product_type', productType)
    }

    if (isActive !== null && isActive !== 'all') {
      query = query.eq('is_active', isActive === 'true')
    }

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,location.ilike.%${search}%`)
    }

    const { data: qrCodes, error, count } = await query

    if (error) {
      console.error('Error fetching QR codes:', error)
      return NextResponse.json({ error: 'QR 코드 목록을 불러오는데 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({
      data: qrCodes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error in admin QR GET:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// QR 코드 생성
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = await request.json()
    const { product_type, name, location, custom_url } = body

    if (!product_type) {
      return NextResponse.json({ error: '상품 타입은 필수입니다' }, { status: 400 })
    }

    // 고유 QR 코드 생성 (8자리 영숫자)
    const code = generateQRCode(8)

    const supabase = await createServerSupabaseClientWithCookies()

    const { data, error } = await supabase
      .from('qr_codes')
      .insert({
        code,
        product_type,
        service_mode: 'offline', // QR은 기본적으로 오프라인
        name: name || null,
        location: location || null,
        custom_url: custom_url || null,
        is_active: true,
        scan_count: 0,
        analysis_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating QR code:', error)
      return NextResponse.json({ error: 'QR 코드 생성에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json({
      data,
      message: 'QR 코드가 생성되었습니다',
    })
  } catch (error) {
    console.error('Error in admin QR POST:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
