import { NextRequest, NextResponse } from 'next/server'
import { getKakaoSession, createKakaoSession } from '@/lib/auth-session'
import { createServerSupabaseClientWithCookies } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

const MAX_NAME_LENGTH = 30

/**
 * PATCH /api/user/profile - 본인 회원정보(표시 이름) 수정
 * - 카카오: user_profiles 갱신 + 세션 쿠키 재발급(즉시 반영)
 * - Supabase(Google 등): user_profiles 갱신. auth 메타데이터는 클라이언트의
 *   supabase.auth.updateUser 로 즉시 반영한다.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
    }
    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해주세요.` },
        { status: 400 },
      )
    }

    const service = createServiceRoleClient()

    // 1) 카카오 커스텀 세션
    const kakao = await getKakaoSession()
    if (kakao?.user?.id) {
      const { error } = await service
        .from('user_profiles')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', kakao.user.id)
      if (error) throw error

      // 세션 쿠키에 박혀있는 이름도 갱신해 즉시 반영
      await createKakaoSession({ ...kakao.user, name })

      return NextResponse.json({ name, provider: 'kakao' })
    }

    // 2) Supabase Auth (Google 등)
    const supabase = await createServerSupabaseClientWithCookies()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.id) {
      const { error } = await service.from('user_profiles').upsert(
        {
          id: user.id,
          name,
          email: user.email ?? null,
          provider: user.app_metadata?.provider || 'google',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      if (error) throw error

      return NextResponse.json({ name, provider: user.app_metadata?.provider || 'google' })
    }

    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  } catch (error) {
    console.error('Profile update failed:', error)
    return NextResponse.json({ error: '프로필 수정에 실패했습니다.' }, { status: 500 })
  }
}
