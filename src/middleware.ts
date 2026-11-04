import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import { KIOSK_PC_EVENT_HOSTS, KIOSK_PC_HUBS } from '@/lib/kiosk/pc'

// next-intl 미들웨어 생성
const intlMiddleware = createMiddleware(routing)

const PUBLIC_METADATA_PATHS = new Set([
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/opengraph-image',
  '/icon',
  '/apple-icon',
])

// wasm/tflite/onnx/js = 부스 인물 오려내기용 MediaPipe·ONNX 런타임과 모델
// (public/mediapipe, public/onnxruntime, public/models).
// 여기에 없으면 i18n 미들웨어가 로케일 경로로 재작성해 404가 난다.
const PUBLIC_FILE_PATTERN =
  /\.(png|jpg|jpeg|svg|gif|ico|webp|avif|woff|woff2|ttf|eot|stl|glb|gltf|bin|txt|xml|webmanifest|wasm|tflite|task|onnx|js|mjs|ps1)$/

/**
 * Middleware - 다국어 라우팅 + 쿠키 정리 및 세션 관리
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 행사 전용 주소(jbnu-major-fair.vercel.app 등, src/lib/kiosk/pc.ts) — 첫 화면은 그 행사 랜딩, 사이트의 다른 페이지(브랜드)는 열지 않는다.
  // 체험(/kiosk/…)·API·받기 페이지·정적 파일만 지나간다
  // 주소는 Host 머리글로 본다(개발 서버의 nextUrl 은 자기 이름 localhost 라 행사 주소를 시험할 수 없다)
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.hostname).split(':')[0].toLowerCase()
  const eventHub = KIOSK_PC_EVENT_HOSTS[host]
  if (eventHub) {
    if (pathname === '/') return NextResponse.rewrite(new URL(KIOSK_PC_HUBS[eventHub].href, request.url))
    const allowed =
      pathname.startsWith('/kiosk/') || pathname.startsWith('/api/') || pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') || PUBLIC_METADATA_PATHS.has(pathname) || PUBLIC_FILE_PATTERN.test(pathname)
    if (!allowed) return NextResponse.redirect(new URL('/', request.url))
  }

  // API, admin, auth, _next, 정적 파일 및 SEO 메타 파일은 i18n 미들웨어 제외
  const shouldSkipIntl =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/c/') ||
    pathname === '/ship' ||
    pathname === '/proof' ||
    pathname === '/booth' ||
    pathname.startsWith('/booth/') ||
    pathname === '/kiosk' ||
    pathname.startsWith('/kiosk/') ||
    pathname === '/kiosk-demo' ||
    pathname === '/kiosk-demo/clean' ||
    pathname === '/booth-demo' ||
    pathname === '/booth-demo/clean' ||
    pathname.startsWith('/kiosk-display/') ||
    pathname === '/coupon/claim' ||
    pathname === '/coupon/register' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    PUBLIC_METADATA_PATHS.has(pathname) ||
    PUBLIC_FILE_PATTERN.test(pathname)

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
    // next-intl + 기존 매처 통합 — 정적 영상·소리(mp4·webm·mp3 등)도 로케일 처리에서 뺀다(포토부스 프로그램 영상)
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|icon|apple-icon|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|avif|woff|woff2|ttf|eot|stl|glb|gltf|bin|txt|xml|webmanifest|mp4|webm|mov|mp3|m4a|wav|ogg)$).*)',
  ],
}
