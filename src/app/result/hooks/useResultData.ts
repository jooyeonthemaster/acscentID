"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ImageAnalysisResult } from '@/types/analysis'
import { generateTwitterName } from '../utils/twitterNameGenerator'
import { perfumes } from '@/data/perfumes'

export const useResultData = () => {
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
            setTwitterName(dbResult.twitterName || generateTwitterName(analysisData))

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

        if (savedResult) {
          try {
            const parsedResult: ImageAnalysisResult = JSON.parse(savedResult)
            setAnalysisResult(parsedResult)

            // 트위터스타일 이름 생성
            const twitterNameResult = generateTwitterName(parsedResult)
            setTwitterName(twitterNameResult)

            setLoading(false)
            setTimeout(() => setIsLoaded(true), 100)
          } catch (parseError) {
            console.error('JSON 파싱 오류:', parseError)
            // 목업 데이터로 대체
            const mockResult = generateMockResult()
            setAnalysisResult(mockResult)
            setTwitterName(generateTwitterName(mockResult))
            setLoading(false)
            setTimeout(() => setIsLoaded(true), 100)
          }
        } else {
          // 결과가 없으면 목업 데이터 생성
          const mockResult = generateMockResult()
          setAnalysisResult(mockResult)
          setTwitterName(generateTwitterName(mockResult))
          setLoading(false)
          setTimeout(() => setIsLoaded(true), 100)
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
    serviceMode
  }
}

// 목업 결과 데이터 생성
function generateMockResult(): ImageAnalysisResult {
  // 랜덤 향수 선택
  const randomPerfume = perfumes[Math.floor(Math.random() * perfumes.length)]

  return {
    traits: {
      sexy: Math.floor(Math.random() * 5) + 3,
      cute: Math.floor(Math.random() * 5) + 4,
      charisma: Math.floor(Math.random() * 5) + 3,
      darkness: Math.floor(Math.random() * 4) + 2,
      freshness: Math.floor(Math.random() * 5) + 4,
      elegance: Math.floor(Math.random() * 5) + 3,
      freedom: Math.floor(Math.random() * 5) + 4,
      luxury: Math.floor(Math.random() * 4) + 3,
      purity: Math.floor(Math.random() * 5) + 4,
      uniqueness: Math.floor(Math.random() * 5) + 5
    },
    scentCategories: {
      citrus: Math.floor(Math.random() * 5) + 3,
      floral: Math.floor(Math.random() * 5) + 4,
      woody: Math.floor(Math.random() * 4) + 3,
      musky: Math.floor(Math.random() * 4) + 2,
      fruity: Math.floor(Math.random() * 5) + 4,
      spicy: Math.floor(Math.random() * 3) + 2
    },
    dominantColors: ['#A8785A', '#784B33', '#212121', '#F2E3D5'],
    personalColor: {
      season: 'autumn',
      tone: 'mute',
      palette: ['#A8785A', '#784B33', '#212121', '#F2E3D5'],
      description: '차분하고 부드러운 톤이 돋보이는 뮤트톤! 가을의 분위기를 물씬 풍기네요.'
    },
    analysis: {
      mood: '세상만사 귀찮은 듯 늘어진 모습! 몽환적인 분위기에 넋을 잃겠어! 하지만 여유는 놓치지 않는 센스!',
      style: '미니멀리즘의 정수! 군더더기 없이 깔끔한 실루엣이 돋보이는 놈코어룩의 새로운 지평을 열었어!',
      expression: '영혼 가출 직전의 멍한 표정! 마치 월요일 아침의 나를 보는 듯한 공감대 폭발!',
      concept: '지친 현대인의 초상을 담은 다큐멘터리 영화의 한 장면 같아! 힐링이 필요한 우리의 자화상!'
    },
    matchingKeywords: ['무기력', '피곤', '커피', '휴식', '일상'],
    matchingPerfumes: [
      {
        perfumeId: randomPerfume.id,
        score: 0.85 + Math.random() * 0.1,
        matchReason: `${randomPerfume.name}의 ${randomPerfume.mainScent.name} 향이 당신의 매력과 완벽하게 어울려요! ${randomPerfume.mood} 느낌이 물씬 풍기는 당신에게 딱 맞는 향수입니다.`,
        persona: {
          id: randomPerfume.id,
          name: randomPerfume.name,
          description: randomPerfume.description,
          traits: randomPerfume.traits,
          categories: randomPerfume.characteristics,
          keywords: randomPerfume.keywords,
          primaryColor: randomPerfume.primaryColor,
          secondaryColor: randomPerfume.secondaryColor,
          mainScent: randomPerfume.mainScent,
          subScent1: randomPerfume.subScent1,
          subScent2: randomPerfume.subScent2,
          recommendation: randomPerfume.recommendation,
          mood: randomPerfume.mood,
          personality: randomPerfume.personality
        }
      }
    ]
  }
}
