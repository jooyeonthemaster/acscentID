/**
 * Client-side fetch wrapper that automatically adds X-Locale header
 * to all API requests, ensuring the server knows the user's language.
 */

'use client'

/**
 * Get current locale from the URL path.
 * URL structure: /[locale]/... (e.g., /ko/input, /en/result)
 */
function getCurrentLocale(): string {
  if (typeof window === 'undefined') return 'ko'

  const pathParts = window.location.pathname.split('/')
  // Path: /ko/... or /en/... etc.
  const possibleLocale = pathParts[1]
  const validLocales = ['ko', 'en', 'ja', 'zh', 'es']

  if (possibleLocale && validLocales.includes(possibleLocale)) {
    return possibleLocale
  }

  // Fallback: check cookie
  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/)
  return match?.[1] || 'ko'
}

/**
 * Enhanced fetch that auto-adds X-Locale header.
 * Drop-in replacement for `fetch` in client components.
 *
 * Usage:
 *   import { apiFetch } from '@/lib/api-client'
 *   const res = await apiFetch('/api/analyze', { method: 'POST', body: ... })
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const locale = getCurrentLocale()

  const headers = new Headers(options.headers)
  if (!headers.has('X-Locale')) {
    headers.set('X-Locale', locale)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
