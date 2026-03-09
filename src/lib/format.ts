/**
 * Locale-aware formatting utilities for dates, prices, and numbers.
 * Replaces hardcoded toLocaleString('ko-KR') calls throughout the codebase.
 */

import type { Locale } from '@/i18n/config'

// Currency settings per locale
const CURRENCY_CONFIG: Record<Locale, { currency: string; locale: string }> = {
  ko: { currency: 'KRW', locale: 'ko-KR' },
  en: { currency: 'KRW', locale: 'en-US' },
  ja: { currency: 'KRW', locale: 'ja-JP' },
  zh: { currency: 'KRW', locale: 'zh-CN' },
  es: { currency: 'KRW', locale: 'es-ES' },
}

// Currency suffix per locale (for display without Intl symbol)
const CURRENCY_SUFFIX: Record<Locale, string> = {
  ko: '원',
  en: ' KRW',
  ja: 'ウォン',
  zh: '韩元',
  es: ' KRW',
}

/**
 * Format price with locale-specific currency display.
 * ko: 24,000원 | en: ₩24,000 | ja: ₩24,000 | zh: ₩24,000 | es: 24.000 KRW
 */
export function formatPrice(amount: number, locale: Locale = 'ko'): string {
  const config = CURRENCY_CONFIG[locale]

  if (locale === 'ko') {
    // Korean style: number + 원
    return `${amount.toLocaleString('ko-KR')}${CURRENCY_SUFFIX.ko}`
  }

  // International style: use Intl.NumberFormat
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()}${CURRENCY_SUFFIX[locale]}`
  }
}

/**
 * Format price number only (no currency symbol).
 * ko: 24,000 | en: 24,000 | es: 24.000
 */
export function formatNumber(num: number, locale: Locale = 'ko'): string {
  const config = CURRENCY_CONFIG[locale]
  return num.toLocaleString(config.locale)
}

/**
 * Format date with locale-specific pattern.
 * ko: 2024년 3월 15일 | en: Mar 15, 2024 | ja: 2024年3月15日
 */
export function formatDate(
  date: string | Date,
  locale: Locale = 'ko',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const config = CURRENCY_CONFIG[locale]

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }

  return d.toLocaleDateString(config.locale, defaultOptions)
}

/**
 * Format short date (for tables, lists).
 * ko: 2024.03.15 | en: 03/15/2024 | ja: 2024/03/15
 */
export function formatShortDate(
  date: string | Date,
  locale: Locale = 'ko'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const config = CURRENCY_CONFIG[locale]

  return d.toLocaleDateString(config.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Format relative time (for reviews, orders).
 * ko: 3일 전 | en: 3 days ago | ja: 3日前
 */
export function formatRelativeTime(
  date: string | Date,
  locale: Locale = 'ko'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const config = CURRENCY_CONFIG[locale]

  try {
    const rtf = new Intl.RelativeTimeFormat(config.locale, { numeric: 'auto' })

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return rtf.format(-diffMinutes, 'minute')
      }
      return rtf.format(-diffHours, 'hour')
    }
    if (diffDays < 30) {
      return rtf.format(-diffDays, 'day')
    }
    if (diffDays < 365) {
      return rtf.format(-Math.floor(diffDays / 30), 'month')
    }
    return rtf.format(-Math.floor(diffDays / 365), 'year')
  } catch {
    return formatShortDate(d, locale)
  }
}

/**
 * Get currency suffix text for a locale.
 */
export function getCurrencySuffix(locale: Locale = 'ko'): string {
  return CURRENCY_SUFFIX[locale]
}
