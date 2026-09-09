import { locales, defaultLocale } from '@/i18n/config'

/**
 * 현재 URL의 로케일 접두사를 유지한 채 내부 경로를 조립한다.
 * localePrefix: 'as-needed' 기준 — 기본 언어(ko)는 접두사 없음, 나머지는 /en 등.
 *
 * @/i18n/routing의 useRouter/Link를 쓸 수 없는 곳
 * (window.location 하드 이동, OAuth next 파라미터, [locale] 세그먼트 밖 라우트) 전용.
 * 클라이언트 컴포넌트에서만 사용할 것.
 */
export function withLocalePrefix(path: string): string {
  if (typeof window === 'undefined') return path
  const seg = window.location.pathname.split('/')[1]
  if (!(locales as readonly string[]).includes(seg) || seg === defaultLocale) return path
  if (path === '/') return `/${seg}`
  return `/${seg}${path.startsWith('/') ? path : `/${path}`}`
}
