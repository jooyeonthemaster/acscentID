const LOCALE_PREFIX_RE = /^\/(ko|en|ja|zh|es)(?=\/|$)/

export function stripLocaleFromPathname(pathname?: string | null) {
  if (!pathname) return '/'

  const stripped = pathname.replace(LOCALE_PREFIX_RE, '')
  return stripped || '/'
}

export function isFocusedExperiencePath(pathname?: string | null) {
  const path = stripLocaleFromPathname(pathname)

  return (
    path === '/input' ||
    path.startsWith('/input/') ||
    path === '/qr/input' ||
    path.startsWith('/qr/input/') ||
    path === '/result' ||
    path.startsWith('/result/') ||
    path === '/checkout' ||
    path.startsWith('/checkout/')
  )
}

// 자체 하단 고정 바(구매바 등)를 가진 페이지. 전역 하단 네비/푸터를 숨겨 겹침을 막는다.
export function hasOwnBottomBar(pathname?: string | null) {
  const path = stripLocaleFromPathname(pathname)

  return path === '/programs/today-scent' || path.startsWith('/products/')
}
