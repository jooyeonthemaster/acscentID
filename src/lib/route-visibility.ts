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
