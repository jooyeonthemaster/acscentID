"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ImageAnalysisResult } from '@/types/analysis'
import { generateTwitterName } from '../utils/twitterNameGenerator'
import type { Locale } from '@/i18n/config'

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
  const [figureChatData, setFigureChatData] = useState<any>(null)
  // 피규어 온라인 모드: 모델링 이미지 & 요청사항
  const [modelingImage, setModelingImage] = useState<string | null>(null)
  const [modelingRequest, setModelingRequest] = useState<string | null>(null)
  const [productType, setProductType] = useState<string | null>(null)
  // 서비스 모드 (online: 구매 버튼 / offline: 피드백 버튼)
  const [serviceMode, setServiceMode] = useState<'online' | 'offline' | null>(null)
  // 분석 대상 타입 (idol: 최애 / self: 나)
  const [targetType, setTargetType] = useState<'idol' | 'self'>('idol')

  useEffect(() => {
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

            setAnalysisResult(analysisData)
            setUserImage(dbResult.userImageUrl || null)
            setTwitterName(dbResult.twitterName || generateTwitterName(analysisData, locale))

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
            console.error('[useResultData] Failed to fetch from DB:', data.error)
            // DB에서 못 가져오면 localStorage 시도
          }
        }

        // localStorage에서 분석 결과 가져오기 (기존 로직)
        console.log('[useResultData] Using localStorage')
        const savedResult = localStorage.getItem('analysisResult')
        const savedUserImage = localStorage.getItem('userImage')

        if (savedUserImage) {
          setUserImage(savedUserImage)
        }

        const savedUserInfo = localStorage.getItem('userInfo')
        if (savedUserInfo) {
          try {
            const parsedUserInfo = JSON.parse(savedUserInfo)
            console.log('[useResultData] Loaded userInfo from localStorage:', parsedUserInfo)
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
            const parsedResult: ImageAnalysisResult = JSON.parse(savedResult)
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
  }, [resultId])

  // 피규어 모드 여부: productType뿐만 아니라 실제 피규어 데이터가 있어야 함
  const hasFigureData = Boolean(
    (analysisResult as any)?.memoryScene ||
    (analysisResult as any)?.scentStory ||
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
    // 서비스 모드 (online: 구매 버튼 / offline: 피드백 버튼)
    serviceMode,
    // 분석 대상 타입 (idol: 최애 / self: 나)
    targetType
  }
}
