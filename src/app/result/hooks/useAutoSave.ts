'use client'

/**
 * 분석 결과 자동 저장 훅
 *
 * - 분석 완료 시 자동으로 Storage에 이미지 업로드 + DB 저장
 * - 로그인 사용자: user_id로 저장
 * - 익명 사용자: fingerprint로 저장 + 로그인 유도
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { ImageAnalysisResult } from '@/types/analysis'

interface UseAutoSaveProps {
  analysisResult: ImageAnalysisResult | null
  userImage: string | null
  twitterName: string
  userId: string | null  // 통합 사용자 ID (Supabase Auth + 카카오)
  authLoading?: boolean  // AuthContext 로딩 상태 (타이밍 문제 해결용)
  existingResultId?: string | null  // URL에서 가져온 기존 결과 ID (있으면 저장 스킵)
  idolName?: string | null  // 최애 이름 (입력 폼에서 입력한 이름)
  idolGender?: string | null  // 최애 성별 (입력 폼에서 입력한 성별)
  // 피규어 온라인 모드 전용
  modelingImage?: string | null  // 3D 모델링용 참조 이미지
  modelingRequest?: string | null  // 모델링 요청사항
  productType?: string | null  // 상품 타입 (figure_diffuser 등)
}

interface UseAutoSaveReturn {
  isSaved: boolean
  isSaving: boolean
  savedResultId: string | null
  saveError: string | null
  showLoginPrompt: boolean
  setShowLoginPrompt: (show: boolean) => void
  retryCount: number
}

/**
 * fingerprint 가져오기 또는 생성
 */
function getOrCreateFingerprint(): string {
  if (typeof window === 'undefined') return ''

  let fp = localStorage.getItem('user_fingerprint')
  if (!fp) {
    fp = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('user_fingerprint', fp)
  }
  return fp
}

/**
 * 이미 저장된 결과 ID 가져오기
 */
function getSavedResultId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('savedResultId')
}

/**
 * 저장된 결과 ID 저장
 */
function setSavedResultIdToStorage(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('savedResultId', id)
}

export function useAutoSave({
  analysisResult,
  userImage,
  twitterName,
  userId,
  authLoading = false,
  existingResultId = null,
  idolName = null,
  idolGender = null,
  // 피규어 온라인 모드 전용
  modelingImage = null,
  modelingRequest = null,
  productType = null
}: UseAutoSaveProps): UseAutoSaveReturn {
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedResultId, setSavedResultId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // 중복 저장 방지
  const saveAttemptedRef = useRef(false)
  const mountedRef = useRef(true)

  // 저장 함수
  const saveResult = useCallback(async () => {
    if (!analysisResult || isSaving) return
    if (saveAttemptedRef.current) return

    // URL에 기존 결과 ID가 있으면 스킩 (기존 저장된 결과를 보는 중)
    if (existingResultId) {
      console.log('[AutoSave] Viewing existing result, skipping save:', existingResultId)
      setSavedResultId(existingResultId)
      setIsSaved(true)
      saveAttemptedRef.current = true
      return
    }

    // localStorage에 이미 저장된 ID가 있으면 스킵
    const existingId = getSavedResultId()
    if (existingId) {
      setSavedResultId(existingId)
      setIsSaved(true)
      return
    }

    saveAttemptedRef.current = true
    setIsSaving(true)
    setSaveError(null)

    try {
      const fingerprint = getOrCreateFingerprint()

      // 향수 정보 추출
      const topPerfume = analysisResult.matchingPerfumes?.[0]
      const perfumeName = topPerfume?.persona?.name || '추천 향수'
      const perfumeBrand = topPerfume?.persona?.recommendation || "AC'SCENT"

      let imageUrl: string | null = null
      let modelingImageUrl: string | null = null

      // 1. 이미지가 있으면 Storage에 업로드
      if (userImage) {
        // 이미 URL인 경우 (Supabase Storage URL 등) 그대로 사용
        if (userImage.startsWith('http://') || userImage.startsWith('https://')) {
          imageUrl = userImage
          console.log('[AutoSave] Using existing image URL:', imageUrl)
        } else if (userImage.startsWith('data:image/')) {
          // base64인 경우 Storage에 업로드 (data:image/ 로 시작해야 함)
          try {
            // base64 데이터 유효성 간단 검사
            const base64Part = userImage.split(',')[1]
            if (!base64Part || base64Part.length < 100) {
              console.warn('[AutoSave] Invalid base64 data, skipping upload')
            } else {
              console.log('[AutoSave] Uploading image to Storage...')
              const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imageBase64: userImage,
                  userId: userId,
                  fingerprint
                })
              })

              const uploadData = await uploadResponse.json()

              if (uploadData.success && uploadData.url) {
                imageUrl = uploadData.url
                console.log('[AutoSave] Image uploaded:', imageUrl)
              } else {
                console.warn('[AutoSave] Image upload failed:', uploadData.error)
              }
            }
          } catch (uploadError) {
            console.error('[AutoSave] Image upload error:', uploadError)
            // 이미지 업로드 실패해도 계속 진행 (이미지 없이 저장)
          }
        } else if (userImage.startsWith('data:')) {
          // data:로 시작하지만 image가 아닌 경우 스킵
          console.warn('[AutoSave] Non-image data URL, skipping upload')
        } else {
          console.warn('[AutoSave] Unknown image format, skipping upload')
        }
      }

      // 1-2. 피규어 온라인 모드: 모델링 이미지 업로드
      if (modelingImage && productType === 'figure_diffuser') {
        if (modelingImage.startsWith('http://') || modelingImage.startsWith('https://')) {
          modelingImageUrl = modelingImage
          console.log('[AutoSave] Using existing modeling image URL:', modelingImageUrl)
        } else if (modelingImage.startsWith('data:image/')) {
          try {
            const base64Part = modelingImage.split(',')[1]
            if (!base64Part || base64Part.length < 100) {
              console.warn('[AutoSave] Invalid modeling image base64 data, skipping upload')
            } else {
              console.log('[AutoSave] Uploading modeling image to Storage...')
              const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  imageBase64: modelingImage,
                  userId: userId,
                  fingerprint,
                  subfolder: 'modeling'  // 모델링 이미지 전용 폴더
                })
              })

              const uploadData = await uploadResponse.json()

              if (uploadData.success && uploadData.url) {
                modelingImageUrl = uploadData.url
                console.log('[AutoSave] Modeling image uploaded:', modelingImageUrl)
              } else {
                console.warn('[AutoSave] Modeling image upload failed:', uploadData.error)
              }
            }
          } catch (uploadError) {
            console.error('[AutoSave] Modeling image upload error:', uploadError)
          }
        } else {
          console.warn('[AutoSave] Unknown modeling image format, skipping upload')
        }
      }

      // 2. 결과 데이터 저장
      console.log('[AutoSave] Saving analysis result...')

      // 서비스 모드 가져오기
      const serviceMode = typeof window !== 'undefined'
        ? localStorage.getItem('serviceMode') || 'offline'
        : 'offline'

      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userImageUrl: imageUrl,
          analysisData: analysisResult,
          twitterName,
          perfumeName,
          perfumeBrand,
          matchingKeywords: analysisResult.matchingKeywords || [],
          userId: userId,
          userFingerprint: fingerprint,
          idolName: idolName,
          idolGender: idolGender,
          // 피규어 온라인 모드 전용
          ...(productType === 'figure_diffuser' && {
            modelingImageUrl,
            modelingRequest,
            productType,
            serviceMode
          })
        })
      })

      const data = await response.json()

      if (!mountedRef.current) return

      if (data.success && data.id) {
        console.log('[AutoSave] Success! ID:', data.id)
        setSavedResultId(data.id)
        setSavedResultIdToStorage(data.id)
        setIsSaved(true)

        // 익명 사용자면 로그인 유도 (2초 후)
        if (!userId) {
          setTimeout(() => {
            if (mountedRef.current) {
              setShowLoginPrompt(true)
            }
          }, 2000)
        }
      } else {
        throw new Error(data.error || '저장 실패')
      }
    } catch (error) {
      console.error('[AutoSave] Error:', error)
      if (mountedRef.current) {
        setSaveError(error instanceof Error ? error.message : '저장 중 오류 발생')
        saveAttemptedRef.current = false // 재시도 허용
        setRetryCount(prev => prev + 1)
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false)
      }
    }
  }, [analysisResult, userImage, twitterName, userId, isSaving, existingResultId, idolName, idolGender, modelingImage, modelingRequest, productType])

  // 컴포넌트 마운트 시 자동 저장
  // authLoading이 완료된 후에만 저장 시작 (타이밍 문제 해결)
  useEffect(() => {
    mountedRef.current = true

    // authLoading이 true면 아직 사용자 정보 로딩 중 → 저장 대기
    if (authLoading) {
      return () => {
        mountedRef.current = false
      }
    }

    // twitterName이 생성될 때까지 대기 (빈 문자열로 저장 방지)
    if (analysisResult && twitterName && !saveAttemptedRef.current) {
      // 약간의 딜레이 후 저장 (UI가 먼저 렌더링되도록)
      const timer = setTimeout(() => {
        saveResult()
      }, 500)

      return () => clearTimeout(timer)
    }

    return () => {
      mountedRef.current = false
    }
  }, [analysisResult, twitterName, saveResult, authLoading])

  // 로그인 후 데이터 재연동은 AuthContext에서 처리됨 (linkFingerprintData)
  // 여기서는 로그인 프롬프트만 닫아줌
  useEffect(() => {
    if (userId && showLoginPrompt) {
      setShowLoginPrompt(false)
    }
  }, [userId, showLoginPrompt])

  return {
    isSaved,
    isSaving,
    savedResultId,
    saveError,
    showLoginPrompt,
    setShowLoginPrompt,
    retryCount
  }
}
