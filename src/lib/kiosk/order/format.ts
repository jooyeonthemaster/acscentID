// 가격·나라 이름·언어 이름 표시 — 원화 가격 옆에 손님 나라 통화(참고 환율)를 붙인다.

import type { Country, OrderLang } from './types'

export const LOCALE: Record<OrderLang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', fr: 'fr-FR' }

export const won = (n: number) => `₩${n.toLocaleString('en-US')}`

/** 손님 나라 통화로 바꾼 참고 가격 — 한국이면 null */
export function homePrice(krw: number, country: Country | null, lang: OrderLang): string | null {
  if (!country || country.currency.code === 'KRW' || !country.currency.krw) return null
  const value = krw / country.currency.krw
  const digits = country.currency.decimals
  try {
    return new Intl.NumberFormat(LOCALE[lang], {
      style: 'currency',
      currency: country.currency.code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
  } catch {
    return `${country.currency.symbol}${value.toFixed(digits)}`
  }
}

const regionNames = new Map<OrderLang, Intl.DisplayNames | null>()

/** 화면 언어로 쓴 나라 이름 — '일본', 'Japon'. 브라우저가 모르면 영어 이름 */
export function countryName(country: Country | null, lang: OrderLang): string {
  if (!country) return ''
  if (!regionNames.has(lang)) {
    try { regionNames.set(lang, new Intl.DisplayNames([LOCALE[lang]], { type: 'region' })) } catch { regionNames.set(lang, null) }
  }
  try {
    return regionNames.get(lang)?.of(country.code.toUpperCase()) ?? country.name
  } catch {
    return country.name
  }
}

/** 국기 그림 주소(Windows 에는 국기 이모지가 없다) */
export const flagSrc = (code: string) => `/assets/kiosk-order/flags/${code.toLowerCase()}.svg`

export const foodSrc = (id: string, small = false) => `/assets/kiosk-order/food/${id}${small ? '-sm' : ''}.webp`

/** 매운 음식에 익숙한 나라 — 매운맛 안내를 나라에 맞춘다 */
const SPICE_FRIENDLY = new Set(['th', 'in', 'mx', 'my', 'id', 'lk', 'bd', 'pk', 'kr', 'la', 'bt', 'pe', 'et', 'ng', 'gh', 'jm', 'tt', 'sg', 'vn', 'cn'])
const SPICE_SHY = new Set(['jp', 'fr', 'gb', 'de', 'nl', 'be', 'ch', 'at', 'se', 'no', 'dk', 'fi', 'is', 'ie', 'pl', 'cz', 'ru', 'it', 'es', 'pt', 'lu', 'ee', 'lv', 'lt', 'nz', 'au', 'ca', 'us', 'tw', 'hk', 'mo'])

export type SpicePalate = 'friendly' | 'shy' | 'neutral'
export function spicePalate(country: Country | null): SpicePalate {
  if (!country) return 'neutral'
  if (SPICE_FRIENDLY.has(country.code)) return 'friendly'
  if (SPICE_SHY.has(country.code)) return 'shy'
  return 'neutral'
}

/** 처음 고를 때 매운 정도 기본값 — 나라 입맛에 맞춘다 */
export function defaultSpiceFor(country: Country | null): 0 | 1 | 2 | 3 {
  const palate = spicePalate(country)
  return palate === 'friendly' ? 3 : palate === 'shy' ? 1 : 2
}
