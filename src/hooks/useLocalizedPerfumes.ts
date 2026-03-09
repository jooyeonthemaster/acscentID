'use client'

import { useLocale } from 'next-intl'
import { useMemo, useCallback } from 'react'
import { perfumes, type Perfume } from '@/data/perfumes'
import { getLocalizedPerfumeText } from '@/data/perfumes-i18n'
import type { Locale } from '@/i18n/config'

/**
 * 현재 로케일에 맞는 향수 이름/키워드를 반환하는 훅
 * - ko: 원본 데이터 그대로 사용
 * - en/ja/zh/es: perfumes-i18n.ts에서 번역 데이터 사용
 */
export function useLocalizedPerfumes() {
  const locale = useLocale() as Locale

  // 특정 향수의 로컬라이즈된 이름
  const getLocalizedName = useCallback(
    (perfumeId: string, fallbackName?: string): string => {
      if (locale === 'ko') return perfumes.find((p) => p.id === perfumeId)?.name || fallbackName || perfumeId
      const localized = getLocalizedPerfumeText(perfumeId, locale)
      return localized?.name || fallbackName || perfumeId
    },
    [locale]
  )

  // 특정 향수의 로컬라이즈된 키워드
  const getLocalizedKeywords = useCallback(
    (perfumeId: string): string[] => {
      if (locale === 'ko') return perfumes.find((p) => p.id === perfumeId)?.keywords || []
      const localized = getLocalizedPerfumeText(perfumeId, locale)
      return localized?.keywords || perfumes.find((p) => p.id === perfumeId)?.keywords || []
    },
    [locale]
  )

  // 전체 향수 목록 로컬라이즈
  const localizedPerfumes = useMemo(() => {
    if (locale === 'ko') return perfumes
    return perfumes.map((p) => {
      const localized = getLocalizedPerfumeText(p.id, locale)
      if (!localized) return p
      return {
        ...p,
        name: localized.name,
        keywords: localized.keywords,
        description: localized.description,
        mood: localized.mood,
        personality: localized.personality,
        recommendation: localized.recommendation,
        mainScent: { ...p.mainScent, name: localized.mainScent },
        subScent1: { ...p.subScent1, name: localized.subScent1 },
        subScent2: { ...p.subScent2, name: localized.subScent2 },
      }
    })
  }, [locale])

  return {
    locale,
    localizedPerfumes,
    getLocalizedName,
    getLocalizedKeywords,
  }
}
