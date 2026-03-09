/**
 * Server-side utility to extract locale from API requests.
 * API routes live outside [locale] segment, so we detect locale from:
 * 1. X-Locale custom header (set by client-side fetch wrapper)
 * 2. Cookie 'NEXT_LOCALE' (set by middleware)
 * 3. Accept-Language header (browser default)
 * 4. Fallback to 'ko'
 */

import { NextRequest } from 'next/server'
import { locales, defaultLocale, type Locale } from '@/i18n/config'

/**
 * Extract locale from an API request.
 * Priority: X-Locale header > NEXT_LOCALE cookie > Accept-Language > default
 */
export function getApiLocale(request: NextRequest): Locale {
  // 1. Check X-Locale custom header (most reliable - set by client wrapper)
  const xLocale = request.headers.get('X-Locale')
  if (xLocale && isValidLocale(xLocale)) {
    return xLocale as Locale
  }

  // 2. Check NEXT_LOCALE cookie (set by next-intl middleware)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale as Locale
  }

  // 3. Parse Accept-Language header
  const acceptLang = request.headers.get('Accept-Language')
  if (acceptLang) {
    const parsed = parseAcceptLanguage(acceptLang)
    for (const lang of parsed) {
      if (isValidLocale(lang)) {
        return lang as Locale
      }
      // Try prefix match (e.g., 'en-US' -> 'en')
      const prefix = lang.split('-')[0]
      if (isValidLocale(prefix)) {
        return prefix as Locale
      }
    }
  }

  // 4. Default fallback
  return defaultLocale
}

function isValidLocale(value: string): boolean {
  return locales.includes(value as Locale)
}

/**
 * Parse Accept-Language header into sorted array of language codes.
 * e.g., "en-US,en;q=0.9,ko;q=0.8" -> ["en-US", "en", "ko"]
 */
function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [lang, qPart] = part.trim().split(';')
      const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1
      return { lang: lang.trim(), q }
    })
    .sort((a, b) => b.q - a.q)
    .map((item) => item.lang)
}
