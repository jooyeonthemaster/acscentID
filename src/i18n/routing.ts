import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'
import { locales, defaultLocale } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // 기본 언어(ko)는 prefix 없이, 나머지는 /en/, /ja/ 등
  // 기본값은 세션 쿠키라 브라우저를 닫으면 언어 선택이 사라진다 — 1년 유지
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
