import { NextResponse } from 'next/server'
import { createKakaoSession } from '@/lib/auth-session'
import type { KakaoUser } from '@/lib/auth-session'
import { randomUUID } from 'crypto'

/**
 * POST /api/auth/guest-login
 * 비회원 게스트 로그인 - 임시 세션 생성
 */
export async function POST() {
  try {
    const guestId = `guest-${randomUUID()}`

    const guestUser: KakaoUser = {
      id: guestId,
      kakao_id: `guest_${Date.now()}`,
      email: `guest_${Date.now()}@guest.ppuduck.com`,
      name: '비회원',
      avatar_url: null,
      provider: 'kakao',
      created_at: new Date().toISOString(),
    }

    await createKakaoSession(guestUser)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Guest login error:', error)
    return NextResponse.json(
      { error: '비회원 로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
