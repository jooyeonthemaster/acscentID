import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { getKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { linkFingerprintRows } from '@/lib/user/fingerprint-link'

/**
 * 게스트(fingerprint) 분석 데이터를 로그인 계정에 귀속.
 * 클라이언트가 직접 호출하던 link_fingerprint_data RPC를 대체 —
 * 최근 24시간 내 생성분만 귀속해 공용 기기에서의 계정 뒤섞임을 막는다.
 */
export async function POST(request: NextRequest) {
  try {
    const { fingerprint } = await request.json().catch(() => ({}))

    if (!fingerprint || typeof fingerprint !== 'string' || !fingerprint.startsWith('fp_')) {
      return NextResponse.json({ error: '유효한 fingerprint가 필요합니다' }, { status: 400 })
    }

    // 세션 확인 (카카오 + Supabase 통합 — /api/user/data와 동일)
    const kakaoSession = await getKakaoSession()
    let userId: string | null = null

    if (kakaoSession?.user) {
      userId = kakaoSession.user.id
    } else {
      const supabase = await createServerSupabaseClientWithCookies()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const linked = await linkFingerprintRows(supabase, userId, fingerprint)

    return NextResponse.json({ success: true, linked })
  } catch (error) {
    console.error('[link-fingerprint] error:', error)
    return NextResponse.json({ error: '연동에 실패했습니다' }, { status: 500 })
  }
}
