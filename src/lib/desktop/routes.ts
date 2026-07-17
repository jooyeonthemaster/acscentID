import { stripLocaleFromPathname } from '@/lib/route-visibility'

/**
 * 데스크탑 버전 라우트 레지스트리.
 *
 * 모바일(<1024px) 렌더링은 어떤 경우에도 변하지 않는다 — 이 모듈은
 * lg(64rem) 이상에서만 의미를 갖는 스위치들의 단일 출처다.
 *
 * - isDesktopReadyPath: 전용 데스크탑 레이아웃이 완성되어 455px 셸을
 *   해제할 라우트 (단계별로 하나씩 옵트인).
 * - isDesktopChromeExcludedPath: 데스크탑 헤더/푸터 크롬을 씌우지 않는
 *   라우트. /input*은 56px compact 모바일 헤더를 쓰는 유일한 라우트
 *   패밀리라 84px 데스크탑 헤더와 오프셋이 충돌한다.
 */

/** Tailwind v4 기본 lg 브레이크포인트. rem 단위까지 일치시켜야 CSS와 JS가 같은 픽셀에서 전환된다. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 64rem)'

/** 마스터 킬스위치. false면 사이트 전체가 현행(모바일 전용)과 동일하게 동작한다. */
export const DESKTOP_CHROME_ENABLED = true

const DESKTOP_READY_EXACT = new Set<string>([
  '/',
  '/products',
  // 위자드는 자체 455 셸을 갖지만 ShellColumn 클램프 해제는 별도로 필요.
  // 크롬(헤더/푸터)은 계속 제외 — 집중 경험 유지 (isDesktopChromeExcludedPath)
  '/input',
  // 결과 페이지 3종 (idol/chemistry/saju) — /result/[id] 공유 페이지는 exact 미매칭이라 무영향
  '/result',
  '/about/brand',
  '/about/how-it-works',
  '/collaboration',
  '/faq',
  '/terms',
  '/privacy',
  '/refund-policy',
])

const DESKTOP_READY_PREFIXES: string[] = ['/products', '/programs']

const CHROME_EXCLUDED_EXACT = new Set<string>(['/reviewer'])

const CHROME_EXCLUDED_PREFIXES = ['/input', '/qr/input', '/dev', '/today-scent-og']

function normalize(pathname?: string | null): string {
  const stripped = stripLocaleFromPathname(pathname)
  try {
    return decodeURIComponent(stripped)
  } catch {
    return stripped
  }
}

export function isDesktopReadyPath(pathname?: string | null): boolean {
  const p = normalize(pathname)
  if (DESKTOP_READY_EXACT.has(p)) return true
  return DESKTOP_READY_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))
}

export function isDesktopChromeExcludedPath(pathname?: string | null): boolean {
  if (!DESKTOP_CHROME_ENABLED) return true
  const p = normalize(pathname)
  if (CHROME_EXCLUDED_EXACT.has(p)) return true
  return CHROME_EXCLUDED_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))
}
