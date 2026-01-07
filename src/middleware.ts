import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware - 쿠키 정리 및 세션 관리
 *
 * 이 미들웨어는 요청마다 실행되며:
 * 1. 이전 형식의 쿠키(한글 직접 저장)를 삭제
 * 2. 잘못된 쿠키로 인한 ByteString 에러 방지
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 이전 쿠키 이름들 (삭제 대상)
  const OLD_COOKIE_NAMES = [
    'acscent_kakao_session',  // 이전 카카오 세션 쿠키
  ]

  // 이전 쿠키 삭제
  for (const cookieName of OLD_COOKIE_NAMES) {
    const oldCookie = request.cookies.get(cookieName)
    if (oldCookie) {
      // 쿠키 삭제 (만료 시간을 과거로 설정)
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
      })
    }
  }

  // 현재 세션 쿠키가 유효한지 확인
  const SESSION_COOKIE_NAME = 'acscent_session_v2'
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (sessionCookie) {
    try {
      // Base64 디코딩 시도 - 실패하면 잘못된 쿠키
      const binary = atob(sessionCookie.value)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const decoder = new TextDecoder()
      const decoded = decoder.decode(bytes)

      // JSON 파싱 시도
      const sessionData = JSON.parse(decoded)

      // 세션 만료 체크
      if (Date.now() > sessionData.expiresAt) {
        // 만료된 세션 삭제
        response.cookies.set(SESSION_COOKIE_NAME, '', {
          expires: new Date(0),
          path: '/',
        })
      }
    } catch {
      // 디코딩/파싱 실패 = 잘못된 쿠키 → 삭제
      console.log('Invalid session cookie detected, removing...')
      response.cookies.set(SESSION_COOKIE_NAME, '', {
        expires: new Date(0),
        path: '/',
      })
    }
  }

  return response
}

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    // API 라우트 및 페이지에 적용
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
