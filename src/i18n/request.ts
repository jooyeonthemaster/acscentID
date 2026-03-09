import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import type { Locale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // requestLocale이 유효한 locale인지 확인
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale
  }

  // 해당 locale의 메시지 파일들을 동적으로 로드
  const messages = (await import(`../messages/${locale}.json`)).default

  return {
    locale,
    messages,
  }
})
