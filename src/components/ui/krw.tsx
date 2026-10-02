'use client'

import { useLocale } from 'next-intl'
import { formatKrw } from '@/lib/format'

/** 현재 로케일에 맞춘 원화 표기 (ko "48,000원" / 그 외 "₩48,000") */
export function Krw({ amount }: { amount: number }) {
  const locale = useLocale()
  return <>{formatKrw(amount, locale)}</>
}
