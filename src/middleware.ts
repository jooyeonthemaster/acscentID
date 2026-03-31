import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

// next-intl 미들웨어 생성
const intlMiddleware = createMiddleware(routing)

/**
 * Middleware - 다국어 라우팅 + 쿠키 정리 및 세션 관리
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API, admin, auth, _next, 정적 파일은 i18n 미들웨어 제외
  const shouldSkipIntl =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf|eot)$/.test(pathname)

  // i18n 미들웨어 적용 또는 기본 응답
  const response = shouldSkipIntl
    ? NextResponse.next()
    : intlMiddleware(request)

  // === 기존 쿠키 정리 로직 유지 ===

  // 이전 쿠키 이름들 (삭제 대상)
  const OLD_COOKIE_NAMES = [
    'acscent_kakao_session', // 이전 카카오 세션 쿠키
  ]

  // 이전 쿠키 삭제
  for (const cookieName of OLD_COOKIE_NAMES) {
    const oldCookie = request.cookies.get(cookieName)
    if (oldCookie) {
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
      const binary = atob(sessionCookie.value)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const decoder = new TextDecoder()
      const decoded = decoder.decode(bytes)
      const sessionData = JSON.parse(decoded)

      if (Date.now() > sessionData.expiresAt) {
        response.cookies.set(SESSION_COOKIE_NAME, '', {
          expires: new Date(0),
          path: '/',
        })
      }
    } catch {
      console.log('Invalid session cookie detected, removing...')
      response.cookies.set(SESSION_COOKIE_NAME, '', {
        expires: new Date(0),
        path: '/',
      })
    }
  }

  return response
}

export const config = {
  matcher: [
    // next-intl + 기존 매처 통합
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.webp$|.*\\.avif$).*)',
  ],
}
