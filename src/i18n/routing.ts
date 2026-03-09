import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'
import { locales, defaultLocale } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // 기본 언어(ko)는 prefix 없이, 나머지는 /en/, /ja/ 등
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
