"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/contexts/AuthContext"
import { compressImage, base64ToBlob } from "@/lib/image/compressor"
import { apiFetch } from "@/lib/api-client"
import type { FormDataType } from "../types"

const INITIAL_FORM_DATA: FormDataType = {
    pin: "",
    name: "",
    gender: "",
    styles: [],
    customStyle: "",
    personalities: [],
    customPersonality: "",
    charmPoints: [],
    customCharm: "",
    image: null,
    // 피규어 온라인 모드 전용
    modelingImage: null,
    modelingRequest: ""
}

export function useInputForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { showToast } = useToast()
    const type = searchParams.get("type")
    const mode = searchParams.get("mode") // "online" | "qr" | null
    const serviceMode = searchParams.get("service_mode") // QR 리다이렉트에서 사용: "online" | "offline"
    const qrCode = searchParams.get("qr_code") // QR 코드 ID
    const from = searchParams.get("from") // "hero" - 히어로 섹션에서 이미지 업로드 후 이동

    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
    const [isCompressing, setIsCompressing] = useState(false)
    const [formData, setFormData] = useState<FormDataType>(INITIAL_FORM_DATA)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [showImageGuide, setShowImageGuide] = useState(true)
    const [focusedField, setFocusedField] = useState<string | null>(null)

    // 피규어 모델링용 상태
    const [modelingImagePreview, setModelingImagePreview] = useState<string | null>(null)
    const [isModelingCompressing, setIsModelingCompressing] = useState(false)

    // Auth 상태 (QR 모드 로그인 게이트용)
    const { user, unifiedUser, loading: authLoading } = useAuth()
    const isLoggedIn = !!(user || unifiedUser)

    const isIdol = type === "idol_image" || type === "figure"
    const isGraduation = type === "graduation"
    // 온라인 모드 판단: mode=online이거나 service_mode=online (QR 리다이렉트)
    // mode=qr 또는 service_mode=offline이면 오프라인
    const isOnline = mode === "online" || (serviceMode === "online" && mode !== "qr")
    const isOffline = mode === "qr" || serviceMode === "offline" || (!isOnline && qrCode)
    const isFigureOnline = type === "figure" && isOnline
    const isGraduationOnline = isGraduation && isOnline

    // QR 모드 로그인 게이트: 오프라인(QR)인데 로그인 안 된 상태면 차단
    const showQrAuthGate = !!isOffline && !isLoggedIn && !authLoading

    // QR 리다이렉트 무한 루프 방지
    // QR 코드 스캔 → /qr/[code] (서버 리다이렉트) → /input 으로 오면
    // 브라우저 뒤로가기 시 /qr/[code]로 돌아가서 다시 리다이렉트 되는 루프 발생
    const currentStepRef = useRef(currentStep)
    useEffect(() => {
        currentStepRef.current = currentStep
    }, [currentStep])

    useEffect(() => {
        if (!qrCode || typeof window === 'undefined') return

        // 추가 히스토리 엔트리를 push하여 뒤로가기 시 QR 페이지 대신 이 엔트리가 pop됨
        window.history.pushState({ qrGuard: true }, '', window.location.href)

        const handlePopState = () => {
            if (currentStepRef.current <= 1) {
                // Step 1에서 뒤로가기 → 홈으로 이동 (QR 루프 차단)
                window.location.replace('/')
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qrCode])

    // 히어로 섹션에서 업로드된 이미지 불러오기
    useEffect(() => {
        if (from === "hero") {
            const heroImage = sessionStorage.getItem('hero_uploaded_image')
            if (heroImage) {
                // base64를 File 객체로 변환
                const blob = base64ToBlob(heroImage)
                const file = new File([blob], 'hero_upload.jpg', { type: 'image/jpeg' })

                setFormData(prev => ({ ...prev, image: file }))
                setImagePreview(heroImage)
                setShowImageGuide(false)

                // 사용한 이미지는 sessionStorage에서 제거
                sessionStorage.removeItem('hero_uploaded_image')

                showToast('이미지가 업로드되었습니다! 정보를 입력해주세요 ✨', 'success', 3000)
            }
        }
    }, [from, showToast])

    // 스텝 유효성 검사
    const isStepValid = useCallback((step: number): boolean => {
        switch (step) {
            // 온라인 모드에서는 인증 번호 불필요
            case 1: return isOnline
                ? formData.name.length > 0
                : (formData.pin.length === 4 && formData.name.length > 0)
            case 2: return formData.styles.length > 0 || formData.customStyle.length > 0
            case 3: return formData.personalities.length > 0 || formData.customPersonality.length > 0
            case 4: return formData.charmPoints.length > 0 || formData.customCharm.length > 0
            case 5:
                // 피규어 온라인 모드: AI 향 추천용 이미지 + 모델링용 이미지 둘 다 필요
                if (isFigureOnline) {
                    return formData.image !== null && formData.modelingImage !== null
                }
                return formData.image !== null
            default: return false
        }
    }, [formData, isOnline, isFigureOnline])

    // 토글 함수들
    const toggleStyle = useCallback((style: string) => {
        setFormData(prev => ({
            ...prev,
            styles: prev.styles.includes(style)
                ? prev.styles.filter(s => s !== style)
                : [...prev.styles, style]
        }))
    }, [])

    const togglePersonality = useCallback((personality: string) => {
        setFormData(prev => ({
            ...prev,
            personalities: prev.personalities.includes(personality)
                ? prev.personalities.filter(p => p !== personality)
                : [...prev.personalities, personality]
        }))
    }, [])

    const toggleCharmPoint = useCallback((point: string) => {
        setFormData(prev => ({
            ...prev,
            charmPoints: prev.charmPoints.includes(point)
                ? prev.charmPoints.filter(p => p !== point)
                : [...prev.charmPoints, point]
        }))
    }, [])

    // 네비게이션 (QR 인증 게이트 활성화 시 차단)
    const handleNext = useCallback(() => {
        if (showQrAuthGate) return
        if (currentStep < 5 && isStepValid(currentStep)) {
            setCurrentStep(prev => prev + 1)
        }
    }, [currentStep, isStepValid, showQrAuthGate])

    const handlePrev = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1)
        }
    }, [currentStep])

    // 이미지 업로드 (압축 적용)
    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsCompressing(true)
        setFormData(prev => ({ ...prev, image: file }))

        try {
            // 이미지 압축 (최대 800x960, 품질 80%)
            const compressedBase64 = await compressImage(file, {
                maxWidth: 800,
                maxHeight: 960,
                quality: 0.8
            })

            setImagePreview(compressedBase64)
            setShowImageGuide(false)
        } catch (error) {
            console.error("이미지 압축 실패:", error)
            // 압축 실패 시 원본 사용
            const reader = new FileReader()
            reader.onload = (ev) => setImagePreview(ev.target?.result as string)
            reader.readAsDataURL(file)
            setShowImageGuide(false)
        } finally {
            setIsCompressing(false)
        }
    }, [])

    const removeImage = useCallback(() => {
        setFormData(prev => ({ ...prev, image: null }))
        setImagePreview(null)
    }, [])

    // 모델링 이미지 업로드 (피규어 온라인 모드 전용)
    const handleModelingImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsModelingCompressing(true)
        setFormData(prev => ({ ...prev, modelingImage: file }))

        try {
            // 이미지 압축 (최대 800x960, 품질 80%)
            const compressedBase64 = await compressImage(file, {
                maxWidth: 800,
                maxHeight: 960,
                quality: 0.8
            })

            setModelingImagePreview(compressedBase64)
        } catch (error) {
            console.error("모델링 이미지 압축 실패:", error)
            // 압축 실패 시 원본 사용
            const reader = new FileReader()
            reader.onload = (ev) => setModelingImagePreview(ev.target?.result as string)
            reader.readAsDataURL(file)
        } finally {
            setIsModelingCompressing(false)
        }
    }, [])

    const removeModelingImage = useCallback(() => {
        setFormData(prev => ({ ...prev, modelingImage: null }))
        setModelingImagePreview(null)
    }, [])

    // 모델링 요청사항 설정
    const setModelingRequest = useCallback((request: string) => {
        setFormData(prev => ({ ...prev, modelingRequest: request }))
    }, [])

    // 폼 제출 (QR 인증 게이트 활성화 시 차단)
    const handleComplete = useCallback(async () => {
        if (showQrAuthGate) return
        if (!isStepValid(5) || isSubmitting) return

        setIsSubmitting(true)
        showToast(`${formData.name}님의 향수 분석을 시작합니다!`, "success", 4000)

        try {
            const response = await apiFetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formData: {
                        name: formData.name,
                        gender: formData.gender,
                        styles: formData.styles,
                        customStyle: formData.customStyle,
                        personalities: formData.personalities,
                        customPersonality: formData.customPersonality,
                        charmPoints: formData.charmPoints,
                        customCharm: formData.customCharm,
                        // 오프라인 모드에서만 pin 포함
                        ...(isOffline && { pin: formData.pin })
                    },
                    imageBase64: imagePreview,
                    // 피규어 온라인 모드 전용 데이터
                    ...(isFigureOnline && {
                        modelingImageBase64: modelingImagePreview,
                        modelingRequest: formData.modelingRequest,
                        productType: 'figure_diffuser'
                    })
                })
            })

            const result = await response.json()

            // 이미지를 먼저 Storage에 업로드 (base64를 localStorage에 넣으면 모바일에서 용량 초과 위험)
            // 병렬로 업로드하여 대기 시간 최소화
            const fingerprint = typeof window !== 'undefined' ? localStorage.getItem('user_fingerprint') : null
            let userImageUploadedUrl: string | null = null
            let modelingImageUploadedUrl: string | null = null

            const uploadImage = async (base64: string): Promise<string | null> => {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64, fingerprint })
                })
                const data = await res.json()
                return data.success && data.url ? data.url : null
            }

            const uploadPromises: Promise<void>[] = []

            if (imagePreview) {
                uploadPromises.push(
                    uploadImage(imagePreview)
                        .then(url => { userImageUploadedUrl = url })
                        .catch(e => console.error('[useInputForm] 유저 이미지 선업로드 에러:', e))
                )
            }
            if (isFigureOnline && modelingImagePreview) {
                uploadPromises.push(
                    uploadImage(modelingImagePreview)
                        .then(url => { modelingImageUploadedUrl = url })
                        .catch(e => console.error('[useInputForm] 모델링 이미지 선업로드 에러:', e))
                )
            }

            if (uploadPromises.length > 0) {
                await Promise.all(uploadPromises)
            }

            // 공통 저장 로직
            const saveToLocalStorage = (data: unknown) => {
                localStorage.removeItem('savedResultId')

                // 서비스 모드 저장: 오프라인 조건 확인
                const resolvedServiceMode = isOffline ? 'offline' : 'online'
                localStorage.setItem('serviceMode', resolvedServiceMode)

                // QR 코드 ID 저장 (QR 스캔 추적용)
                if (qrCode) {
                    localStorage.setItem('qrCode', qrCode)
                } else {
                    localStorage.removeItem('qrCode')
                }

                // 프로그램 타입에 따른 productType/programType 설정
                if (isFigureOnline) {
                    localStorage.setItem('productType', 'figure_diffuser')
                    localStorage.setItem('programType', 'figure')
                } else if (type === 'figure') {
                    localStorage.setItem('productType', 'figure_diffuser')
                    localStorage.setItem('programType', 'figure')
                } else if (isGraduation) {
                    localStorage.setItem('productType', 'graduation')
                    localStorage.setItem('programType', 'graduation')
                } else {
                    // 일반 분석 (idol_image 등): 이전 값 초기화
                    localStorage.setItem('productType', 'image_analysis')
                    localStorage.removeItem('programType')
                }

                localStorage.setItem('analysisResult', JSON.stringify(data))
                // 선업로드된 URL 저장 (작은 문자열이라 용량 문제 없음)
                if (userImageUploadedUrl) {
                    localStorage.setItem('userImage', userImageUploadedUrl)
                } else if (imagePreview) {
                    // 선업로드 실패 시 base64 폴백
                    localStorage.setItem('userImage', imagePreview)
                }
                if (isFigureOnline) {
                    if (modelingImageUploadedUrl) {
                        localStorage.setItem('modelingImage', modelingImageUploadedUrl)
                    } else if (modelingImagePreview) {
                        // 선업로드 실패 시 base64 폴백
                        try {
                            localStorage.setItem('modelingImage', modelingImagePreview)
                        } catch (e) {
                            console.error('[useInputForm] modelingImage base64 폴백 저장 실패:', e)
                        }
                    }
                    localStorage.setItem('modelingRequest', formData.modelingRequest || '')
                }
                const userInfoToSave = {
                    name: formData.name,
                    gender: formData.gender,
                    // 오프라인 모드에서만 pin 저장
                    ...(isOffline && { pin: formData.pin })
                }
                console.log('[useInputForm] Saving userInfo:', userInfoToSave, 'isOffline:', isOffline)
                localStorage.setItem('userInfo', JSON.stringify(userInfoToSave))
            }

            if (result.success) {
                saveToLocalStorage(result.data)
                showToast('분석 완료! 🎉', 'success', 2000)
            } else {
                saveToLocalStorage(result.fallback)
                showToast('분석에 문제가 있어 샘플 결과를 보여드립니다.', 'info', 3000)
            }

            // 분석 완료 상태로 변경 (문 열림 애니메이션 트리거)
            setIsAnalysisComplete(true)
        } catch (error) {
            console.error('분석 오류:', error)
            showToast('오류가 발생했습니다. 다시 시도해주세요.', 'error', 3000)
            setIsSubmitting(false)
        }
    }, [formData, imagePreview, modelingImagePreview, isFigureOnline, isStepValid, isSubmitting, showToast, isOffline, isGraduation, type, showQrAuthGate])

    // 문 열린 후 결과 페이지로 이동
    // QR/오프라인에서 온 경우 replace 사용 → 뒤로가기 시 input 페이지로 돌아가지 않음
    const navigateToResult = useCallback(() => {
        if (qrCode || isOffline) {
            router.replace('/result')
        } else {
            router.push('/result')
        }
    }, [router, qrCode, isOffline])

    return {
        // 상태
        currentStep,
        formData,
        setFormData,
        imagePreview,
        showImageGuide,
        setShowImageGuide,
        focusedField,
        setFocusedField,
        isSubmitting,
        isAnalysisComplete,
        isCompressing,
        isIdol,
        isOnline,
        isOffline,
        isGraduation,
        isGraduationOnline,
        // QR 로그인 게이트
        showQrAuthGate,
        authLoading,

        // 피규어 온라인 모드 전용
        isFigureOnline,
        modelingImagePreview,
        isModelingCompressing,

        // 함수들
        isStepValid,
        navigateToResult,
        toggleStyle,
        togglePersonality,
        toggleCharmPoint,
        handleNext,
        handlePrev,
        handleImageUpload,
        removeImage,
        handleModelingImageUpload,
        removeModelingImage,
        setModelingRequest,
        handleComplete
    }
}
