import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/service'

// ============================================
// 커스텀 세션 시스템 (카카오 로그인용)
// ============================================

export interface KakaoUser {
  id: string
  kakao_id: string
  email: string | null
  name: string
  avatar_url: string | null
  provider: 'kakao'
  created_at: string
}

export interface SessionData {
  user: KakaoUser
  expiresAt: number
}

const SESSION_COOKIE_NAME = 'acscent_session_v2'
const OLD_SESSION_COOKIE_NAME = 'acscent_kakao_session' // 이전 쿠키 (삭제용)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

// ============================================
// Base64 인코딩/디코딩 (한글 지원)
// ============================================

function encodeBase64(str: string): string {
  // UTF-8 → Base64 (한글 등 유니코드 문자 지원)
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  let binary = ''
  bytes.forEach(byte => binary += String.fromCharCode(byte))
  return btoa(binary)
}

function decodeBase64(base64: string): string {
  // Base64 → UTF-8
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const decoder = new TextDecoder()
  return decoder.decode(bytes)
}

// ============================================
// 세션 관리
// ============================================

/**
 * 커스텀 세션 생성 (카카오 로그인용)
 */
export async function createKakaoSession(user: KakaoUser): Promise<void> {
  const cookieStore = await cookies()
  const sessionData: SessionData = {
    user,
    expiresAt: Date.now() + SESSION_DURATION,
  }

  // 이전 쿠키 삭제
  try {
    cookieStore.delete(OLD_SESSION_COOKIE_NAME)
  } catch {
    // 무시
  }

  // Base64 인코딩으로 한글 문자 처리
  const encodedSession = encodeBase64(JSON.stringify(sessionData))

  cookieStore.set(SESSION_COOKIE_NAME, encodedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  })
}

/**
 * 커스텀 세션 조회
 */
export async function getKakaoSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()

  // 이전 쿠키 삭제 (매 요청마다)
  try {
    const oldCookie = cookieStore.get(OLD_SESSION_COOKIE_NAME)
    if (oldCookie) {
      cookieStore.delete(OLD_SESSION_COOKIE_NAME)
    }
  } catch {
    // 무시
  }

  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    return null
  }

  try {
    // Base64 디코딩
    const decodedSession = decodeBase64(sessionCookie.value)
    const sessionData: SessionData = JSON.parse(decodedSession)

    // 세션 만료 체크
    if (Date.now() > sessionData.expiresAt) {
      await destroyKakaoSession()
      return null
    }

    return sessionData
  } catch (error) {
    // 잘못된 쿠키 (이전 형식) - 삭제
    console.error('Invalid session cookie, deleting:', error)
    try {
      cookieStore.delete(SESSION_COOKIE_NAME)
    } catch {
      // 무시
    }
    return null
  }
}

/**
 * 커스텀 세션 삭제
 */
export async function destroyKakaoSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

// ============================================
// 카카오 사용자 DB 관리
// ============================================

export interface KakaoUserInfo {
  kakaoId: string
  nickname: string
  avatarUrl?: string | null
}

/**
 * 카카오 ID로 사용자 조회
 */
export async function findUserByKakaoId(kakaoId: string): Promise<KakaoUser | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('kakao_id', kakaoId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    kakao_id: data.kakao_id,
    email: data.email,
    name: data.name || '카카오 사용자',
    avatar_url: data.avatar_url,
    provider: 'kakao',
    created_at: data.created_at,
  }
}

/**
 * 새 카카오 사용자 생성
 */
export async function createKakaoUser(kakaoUser: KakaoUserInfo): Promise<KakaoUser> {
  const supabase = createServiceRoleClient()

  // UUID 생성 (auth.users 없이 독립적으로)
  const { data: uuidData } = await supabase.rpc('gen_random_uuid')
  const newId = uuidData || crypto.randomUUID()

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: newId,
      kakao_id: kakaoUser.kakaoId,
      email: null,
      name: kakaoUser.nickname,
      avatar_url: kakaoUser.avatarUrl || null,
      provider: 'kakao',
    })
    .select()
    .single()

  if (error || !data) {
    console.error('카카오 사용자 생성 실패:', error)
    throw new Error('카카오 계정 생성에 실패했습니다.')
  }

  return {
    id: data.id,
    kakao_id: data.kakao_id,
    email: data.email,
    name: data.name || '카카오 사용자',
    avatar_url: data.avatar_url,
    provider: 'kakao',
    created_at: data.created_at,
  }
}

/**
 * 카카오 로그인 처리 (조회 또는 생성)
 */
export async function authenticateKakaoUser(kakaoUser: KakaoUserInfo): Promise<KakaoUser> {
  // 1. 기존 사용자 조회
  const existingUser = await findUserByKakaoId(kakaoUser.kakaoId)
  if (existingUser) {
    // 프로필 업데이트 (닉네임, 아바타 변경 가능)
    const supabase = createServiceRoleClient()
    await supabase
      .from('user_profiles')
      .update({
        name: kakaoUser.nickname,
        avatar_url: kakaoUser.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('kakao_id', kakaoUser.kakaoId)

    return {
      ...existingUser,
      name: kakaoUser.nickname,
      avatar_url: kakaoUser.avatarUrl || existingUser.avatar_url,
    }
  }

  // 2. 신규 사용자 생성
  return createKakaoUser(kakaoUser)
}
