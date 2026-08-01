"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ImageAnalysisResult } from '@/types/analysis'
import { generateTwitterName } from '../utils/twitterNameGenerator'
import { locales, type Locale } from '@/i18n/config'

const ENGLISH_LEAKAGE_PATTERN = /\b(the|and|with|that|this|your|you|image|scent|perfume|fresh|romantic|energy|style|mood|vibe|recommended|season|morning|evening|night|spray|layer|apply|before|after|because|totally|literally)\b/i
const KOREAN_PATTERN = /[가-힣]/
const JAPANESE_PATTERN = /[\u3040-\u30ff]/
const CJK_PATTERN = /[\u3400-\u9fff]/

function normalizeLocale(value: unknown): Locale | null {
  return typeof value === 'string' && locales.includes(value as Locale)
    ? value as Locale
    : null
}

function collectDisplayStrings(value: unknown, output: string[] = []): string[] {
  if (output.length > 160) return output
  if (typeof value === 'string') {
    const text = value.trim()
    if (
      text.length >= 12 &&
      !text.startsWith('#') &&
      !/^AC'SCENT\s+\d+/i.test(text) &&
      !/^https?:\/\//i.test(text) &&
      !/^#[0-9a-f]{3,8}$/i.test(text)
    ) {
      output.push(text)
    }
    return output
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectDisplayStrings(item, output))
    return output
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectDisplayStrings(item, output))
  }

  return output
}

function hasLikelyLanguageLeakage(result: ImageAnalysisResult | null, targetLocale: Locale) {
  if (!result) return false

  const strings = collectDisplayStrings(result)
  const englishCount = strings.filter((text) => ENGLISH_LEAKAGE_PATTERN.test(text)).length
  const koreanCount = strings.filter((text) => KOREAN_PATTERN.test(text)).length
  const japaneseCount = strings.filter((text) => JAPANESE_PATTERN.test(text)).length

  if (targetLocale !== 'ko' && koreanCount > 0) return true
  if (targetLocale !== 'ja' && japaneseCount > 0) return true
  if (targetLocale === 'ko' && englishCount >= 2) return true
  if ((targetLocale === 'ja' || targetLocale === 'zh' || targetLocale === 'es') && englishCount >= 2) return true
  if (targetLocale === 'en' && (koreanCount > 0 || japaneseCount > 0)) return true
  if (targetLocale === 'es' && strings.some((text) => CJK_PATTERN.test(text))) return true

  return false
}

function getResultCacheKey(resultId: string | null, locale: Locale) {
  return resultId
    ? `analysisResult:${resultId}:${locale}`
    : `analysisResult:${locale}`
}

function readCachedResult(resultId: string | null, locale: Locale) {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(getResultCacheKey(resultId, locale))
    return cached ? JSON.parse(cached) as ImageAnalysisResult : null
  } catch (error) {
    console.error('[useResultData] Cached result parse error:', error)
    return null
  }
}

function writeCachedResult(resultId: string | null, locale: Locale, result: ImageAnalysisResult) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(getResultCacheKey(resultId, locale), JSON.stringify(result))
  } catch (error) {
    console.error('[useResultData] Cached result write error:', error)
  }
}

async function waitForCachedTranslation(resultId: string | null, locale: Locale) {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    const cached = readCachedResult(resultId, locale)
    if (cached) return cached
  }
  return null
}

export const useResultData = () => {
  const locale = useLocale() as Locale
  const searchParams = useSearchParams()
  const resultId = searchParams.get('id') // URL에서 id 파라미터 가져오기

  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [twitterName, setTwitterName] = useState<string>('')
  const [userInfo, setUserInfo] = useState<{ name: string; gender: string; pin?: string } | null>(null)
  // 피규어 모드 전용 상태
  const [programType, setProgramType] = useState<string | null>(null)
  const [figureImage, setFigureImage] = useState<string | null>(null)
  const [figureChatData, setFigureChatData] = useState<unknown>(null)
  // 피규어 온라인 모드: 모델링 이미지 & 요청사항
  const [modelingImage, setModelingImage] = useState<string | null>(null)
  const [modelingRequest, setModelingRequest] = useState<string | null>(null)
  const [productType, setProductType] = useState<string | null>(null)
  // 서비스 모드 (online: 구매 버튼 / offline: 피드백 버튼)
  const [serviceMode, setServiceMode] = useState<'online' | 'offline' | null>(null)
  // 분석 대상 타입 (idol: 최애 / self: 나)
  const [targetType, setTargetType] = useState<'idol' | 'self'>('idol')
  const translationRequestRef = useRef<string | null>(null)

  const translateResultIfNeeded = useCallback(async ({
    result,
    resultLocale,
    protectedNames,
  }: {
    result: ImageAnalysisResult
    resultLocale: Locale | null
    protectedNames: string[]
  }) => {
    const hasLocaleMismatch = resultLocale ? resultLocale !== locale : false
    const hasLanguageLeakage = hasLikelyLanguageLeakage(result, locale)

    if (!hasLocaleMismatch && !hasLanguageLeakage) {
      if (resultLocale) writeCachedResult(resultId, resultLocale, result)
      return { result, resultLocale }
    }

    const cached = readCachedResult(resultId, locale)
    if (cached) {
      return { result: cached, resultLocale: locale }
    }

    const requestKey = `${resultId || 'local'}:${resultLocale || 'unknown'}:${locale}:${JSON.stringify(result.matchingPerfumes?.map((match) => match.perfumeId) || [])}`
    if (translationRequestRef.current === requestKey) {
      return { result, resultLocale }
    }

    const lockKey = `analysisResultTranslation:${requestKey}`
    const lockRaw = sessionStorage.getItem(lockKey)
    if (lockRaw) {
      try {
        const lock = JSON.parse(lockRaw) as { expiresAt?: number }
        if (lock.expiresAt && lock.expiresAt > Date.now()) {
          const lockedCached = await waitForCachedTranslation(resultId, locale)
          if (lockedCached) {
            return { result: lockedCached, resultLocale: locale }
          }
        }
      } catch {
        sessionStorage.removeItem(lockKey)
      }
    }

    translationRequestRef.current = requestKey
    sessionStorage.setItem(lockKey, JSON.stringify({ expiresAt: Date.now() + 60_000 }))

    try {
      const response = await fetch('/api/translate/image-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Locale': locale,
        },
        body: JSON.stringify({
          result,
          sourceLocale: resultLocale,
          targetLocale: locale,
          protectedNames,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Image result translation failed')
      }

      const translated = data.data as ImageAnalysisResult
      writeCachedResult(resultId, locale, translated)
      return { result: translated, resultLocale: locale }
    } catch (error) {
      console.error('[useResultData] Image result translation failed:', error)
      return { result, resultLocale }
    } finally {
      sessionStorage.removeItem(lockKey)
      translationRequestRef.current = null
    }
  }, [locale, resultId])

  useEffect(() => {
    let cancelled = false

    const fetchResult = async () => {
      try {
        // URL에 id가 있으면 DB에서 가져오기
        if (resultId) {
          console.log('[useResultData] Fetching from DB, id:', resultId)
          const response = await fetch(`/api/results/${resultId}`)
          const data = await response.json()

          if (data.success && data.result) {
            // DB에서 가져온 데이터 설정
            const dbResult = data.result

            // API 응답은 camelCase (analysisData)
            const analysisData = typeof dbResult.analysisData === 'string'
              ? JSON.parse(dbResult.analysisData)
              : dbResult.analysisData

            const dbResultLocale = normalizeLocale(dbResult.locale)
            const protectedNames = [dbResult.idolName || ''].filter(Boolean)
            if (dbResultLocale) writeCachedResult(resultId, dbResultLocale, analysisData)
            const localized = await translateResultIfNeeded({
              result: analysisData,
              resultLocale: dbResultLocale,
              protectedNames,
            })
            if (cancelled) return

            setAnalysisResult(localized.result)
            setUserImage(dbResult.userImageUrl || null)
            setTwitterName(dbResult.twitterName || generateTwitterName(localized.result, locale))

            // DB에서 idol_name, idol_gender 설정
            if (dbResult.idolName || dbResult.idolGender) {
              setUserInfo({
                name: dbResult.idolName || '',
                gender: dbResult.idolGender || ''
              })
            }

            // DB에서 service_mode 설정
            if (dbResult.serviceMode) {
              setServiceMode(dbResult.serviceMode)
            }

            // DB에서 product_type 설정 (graduation, figure_diffuser, image_analysis 등)
            if (dbResult.productType) {
              setProductType(dbResult.productType)
            }

            // DB에서 target_type 설정 (최애/나)
            if (dbResult.targetType === 'idol' || dbResult.targetType === 'self') {
              setTargetType(dbResult.targetType)
            }

            // 피규어 모드 전용 데이터 (DB에서)
            if (dbResult.modelingImageUrl) {
              setModelingImage(dbResult.modelingImageUrl)
            }
            if (dbResult.modelingRequest) {
              setModelingRequest(dbResult.modelingRequest)
            }
            // 피규어 모드면 programType도 설정
            if (dbResult.productType === 'figure_diffuser') {
              setProgramType('figure')
            }

            setLoading(false)
            setTimeout(() => setIsLoaded(true), 100)
            return
          } else {
            // id로 조회했는데 실패하면 명확히 에러로 종료.
            // localStorage의 '최근 분석'으로 폴백하면 전혀 다른 분석(다른 캐릭터)이
            // 그 결과인 것처럼 표시되는 사고가 난다 — 절대 폴백하지 않는다.
            console.error('[useResultData] Failed to fetch from DB:', data.error)
            setError('분석 결과를 찾을 수 없습니다. 링크가 만료되었거나 삭제된 결과일 수 있습니다.')
            setLoading(false)
            return
          }
        }

        // localStorage에서 분석 결과 가져오기 (기존 로직)
        console.log('[useResultData] Using localStorage')
        const savedResult = localStorage.getItem('analysisResult')
        const savedUserImage = localStorage.getItem('userImage')

        if (savedUserImage) {
          setUserImage(savedUserImage)
        }

        let savedUserName: string | null = null
        const savedUserInfo = localStorage.getItem('userInfo')
        if (savedUserInfo) {
          try {
            const parsedUserInfo = JSON.parse(savedUserInfo)
            console.log('[useResultData] Loaded userInfo from localStorage:', parsedUserInfo)
            savedUserName = parsedUserInfo.name || null
            setUserInfo(parsedUserInfo)
          } catch (e) {
            console.error('User info parse error', e)
          }
        }

        // 피규어 모드 전용 데이터 로드
        const savedProgramType = localStorage.getItem('programType')
        if (savedProgramType) {
          setProgramType(savedProgramType)
        }

        const savedFigureImage = localStorage.getItem('figureImage')
        if (savedFigureImage) {
          setFigureImage(savedFigureImage)
        }

        const savedFigureChatData = localStorage.getItem('figureChatData')
        if (savedFigureChatData) {
          try {
            setFigureChatData(JSON.parse(savedFigureChatData))
          } catch (e) {
            console.error('Figure chat data parse error', e)
          }
        }

        // 피규어 온라인 모드: 모델링 이미지 & 요청사항
        const savedModelingImage = localStorage.getItem('modelingImage')
        if (savedModelingImage) {
          setModelingImage(savedModelingImage)
        }

        const savedModelingRequest = localStorage.getItem('modelingRequest')
        if (savedModelingRequest) {
          setModelingRequest(savedModelingRequest)
        }

        const savedProductType = localStorage.getItem('productType')
        if (savedProductType) {
          setProductType(savedProductType)
        }

        // localStorage에서 serviceMode 로드
        const savedServiceMode = localStorage.getItem('serviceMode')
        if (savedServiceMode === 'online' || savedServiceMode === 'offline') {
          setServiceMode(savedServiceMode)
        }

        // localStorage에서 targetType 로드 (최애/나)
        const savedTargetType = localStorage.getItem('analysisTargetType')
        if (savedTargetType === 'idol' || savedTargetType === 'self') {
          setTargetType(savedTargetType)
        }

        if (savedResult) {
          try {
            const savedLocale = normalizeLocale(localStorage.getItem('analysisResultLocale'))
            let parsedResult: ImageAnalysisResult = JSON.parse(savedResult)
            if (savedLocale) writeCachedResult(null, savedLocale, parsedResult)

            const cachedForLocale = savedLocale !== locale ? readCachedResult(null, locale) : null
            if (cachedForLocale) {
              parsedResult = cachedForLocale
              localStorage.setItem('analysisResult', JSON.stringify(parsedResult))
              localStorage.setItem('analysisResultLocale', locale)
            } else {
              const protectedNames = [savedUserName || ''].filter(Boolean)
              const localized = await translateResultIfNeeded({
                result: parsedResult,
                resultLocale: savedLocale,
                protectedNames,
              })
              parsedResult = localized.result

              if (localized.resultLocale === locale) {
                localStorage.setItem('analysisResult', JSON.stringify(parsedResult))
                localStorage.setItem('analysisResultLocale', locale)
                writeCachedResult(null, locale, parsedResult)
              }
            }

            if (cancelled) return

            setAnalysisResult(parsedResult)

            // 트위터스타일 이름 생성
            const twitterNameResult = generateTwitterName(parsedResult, locale)
            setTwitterName(twitterNameResult)

            setLoading(false)
            setTimeout(() => setIsLoaded(true), 100)
          } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError)
            setError('분석 결과 데이터가 손상되었습니다. 다시 분석을 진행해주세요.')
            setLoading(false)
          }
        } else {
          // 결과가 없으면 에러 상태로 설정 (mock 데이터 대신)
          console.log('[useResultData] No analysis result found in localStorage')
          setError('분석 결과를 찾을 수 없습니다. 다시 분석을 진행해주세요.')
          setLoading(false)
        }
      } catch (err) {
        console.error('결과 페이지 로딩 오류:', err)
        setError('결과를 불러오는 중 오류가 발생했습니다.')
        setLoading(false)
      }
    }

    fetchResult()
    return () => {
      cancelled = true
    }
  }, [resultId, locale, translateResultIfNeeded])

  // 피규어 모드 여부: productType뿐만 아니라 실제 피규어 데이터가 있어야 함
  const figureLikeResult = analysisResult as (ImageAnalysisResult & {
    memoryScene?: unknown
    scentStory?: unknown
  }) | null
  const hasFigureData = Boolean(
    figureLikeResult?.memoryScene ||
    figureLikeResult?.scentStory ||
    modelingImage
  )
  const isFigureModeComputed = (programType === 'figure' || productType === 'figure_diffuser') && hasFigureData

  return {
    analysisResult,
    loading,
    error,
    isLoaded,
    userImage,
    twitterName,
    userInfo,
    displayedAnalysis: analysisResult,
    existingResultId: resultId, // URL에서 가져온 기존 결과 ID
    idolName: userInfo?.name || null, // 최애 이름 (입력 폼에서 입력한 이름)
    // 피규어 모드 전용
    programType,
    figureImage,
    figureChatData,
    // isFigureMode: productType + 실제 피규어 데이터 존재 여부로 판단
    isFigureMode: isFigureModeComputed,
    // 피규어 온라인 모드: 모델링 이미지 & 요청사항
    modelingImage,
    modelingRequest,
    productType,
    isFigureOnlineMode: productType === 'figure_diffuser' && hasFigureData,
    // 졸업 모드
    isGraduationMode: productType === 'graduation',
    // 사주 모드 (analysis_data 전체가 그대로 로드되므로 sajuChart/sajuAnalysis는 analysisResult에 동승)
    isSajuMode: productType === 'saju_perfume' || programType === 'saju',
    // 서비스 모드 (online: 구매 버튼 / offline: 피드백 버튼)
    serviceMode,
    // 분석 대상 타입 (idol: 최애 / self: 나)
    targetType
  }
}
