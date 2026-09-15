import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SESSION_TTL_MS = 15 * 60 * 1000 // 15분

/** PB-XXXXXX 형식 세션 코드 생성 */
function generateSessionCode(): string {
  const rand = Array.from({ length: 6 }, () =>
    'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]
  ).join('')
  return `PB-${rand}`
}

/**
 * 폰 업로드 세션 생성 (부스 화면 전용)
 * POST /api/photobooth/session
 */
export async function POST() {
  try {
    const serviceClient = createServiceRoleClient()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

    // 코드 유니크 충돌(23505) 시 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateSessionCode()
      const { error } = await serviceClient
        .from('photobooth_sessions')
        .insert({ code, status: 'waiting', expires_at: expiresAt })

      if (!error) {
        return NextResponse.json({ success: true, code, expiresAt })
      }
      if (error.code !== '23505') {
        console.error('Photobooth session insert failed:', error)
        return NextResponse.json({ error: '세션 생성에 실패했습니다' }, { status: 500 })
      }
    }
    return NextResponse.json({ error: '세션 생성에 실패했습니다' }, { status: 500 })
  } catch (error) {
    console.error('Photobooth session POST error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

/**
 * 세션 상태 폴링 (부스 화면이 2.5초 간격 조회) / 폰 업로드 페이지 유효성 확인
 * GET /api/photobooth/session?code=PB-XXXXXX
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase()
    if (!code || !/^PB-[A-Z2-9]{6}$/.test(code)) {
      return NextResponse.json({ error: '잘못된 세션 코드입니다' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('photobooth_sessions')
      .select('status, photo_url, expires_at')
      .eq('code', code)
      .maybeSingle()

    if (error) {
      console.error('Photobooth session fetch failed:', error)
      return NextResponse.json({ error: '세션 조회에 실패했습니다' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 })
    }

    const expired =
      data.status === 'expired' ||
      (data.status === 'waiting' && new Date(data.expires_at).getTime() < Date.now())

    return NextResponse.json({
      success: true,
      status: expired ? 'expired' : data.status,
      photoUrl: data.photo_url,
    })
  } catch (error) {
    console.error('Photobooth session GET error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
