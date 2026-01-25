import { supabase } from './client'

/**
 * Google OAuth 로그인
 */
export async function signInWithGoogle(nextPath?: string) {
  // nextPath: 로그인 후 이동할 경로 (예: /input?type=idol_image, /mypage)
  const callbackUrl = new URL('/auth/callback', window.location.origin)
  if (nextPath) {
    callbackUrl.searchParams.set('next', nextPath)
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })

  if (error) {
    console.error('Google sign in error:', error)
    throw error
  }

  return data
}

/**
 * Kakao OAuth 로그인 (Custom Provider via API Route)
 */
export async function signInWithKakao(redirectTo?: string) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
  const next = redirectTo || currentPath

  // Kakao 로그인 API 라우트로 리다이렉트
  window.location.href = `/api/auth/kakao?next=${encodeURIComponent(next)}`
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

/**
 * 현재 유저 정보 조회
 */
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Get user error:', error)
    return null
  }

  return user
}

/**
 * 현재 세션 조회
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Get session error:', error)
    return null
  }

  return session
}

/**
 * Fingerprint 데이터를 유저 계정에 연동
 */
export async function linkFingerprintData(userId: string, fingerprint: string) {
  const { data, error } = await supabase.rpc('link_fingerprint_data', {
    p_user_id: userId,
    p_fingerprint: fingerprint
  })

  if (error) {
    console.error('Link fingerprint error:', error)
    throw error
  }

  return data
}

/**
 * 유저 프로필 조회
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Get user profile error:', error)
    return null
  }

  return data
}

/**
 * 유저 프로필 업데이트
 */
export async function updateUserProfile(userId: string, updates: {
  name?: string
  avatar_url?: string
  preferences?: object
}) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Update user profile error:', error)
    throw error
  }

  return data
}
