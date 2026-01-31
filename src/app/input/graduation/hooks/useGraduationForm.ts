"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { compressImage } from "@/lib/image/compressor"
import type { GraduationFormDataType, GraduationType } from "@/types/analysis"
import { INITIAL_GRADUATION_FORM_DATA, GRADUATION_TOTAL_STEPS } from "../constants"

export function useGraduationForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { showToast } = useToast()
    const mode = searchParams.get("mode") // "online" | "qr" | null
    const serviceMode = searchParams.get("service_mode") // QR 리다이렉트에서 사용: "online" | "offline"
    const qrCode = searchParams.get("qr_code") // QR 코드 ID

    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
    const [isCompressing, setIsCompressing] = useState(false)
    const [formData, setFormData] = useState<GraduationFormDataType>(INITIAL_GRADUATION_FORM_DATA as unknown as GraduationFormDataType)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [showImageGuide, setShowImageGuide] = useState(true)
    const [focusedField, setFocusedField] = useState<string | null>(null)

    // 이미지 변환 관련 상태
    const [isTransforming, setIsTransforming] = useState(false)
    const [transformedImagePreview, setTransformedImagePreview] = useState<string | null>(null)

    // 온라인 모드 판단: mode=online이거나 service_mode=online (QR 리다이렉트)
    // mode=qr 또는 service_mode=offline이면 오프라인
    const isOnline = mode === "online" || (serviceMode === "online" && mode !== "qr")
    const isOffline = mode === "qr" || serviceMode === "offline" || (!isOnline && !!qrCode)
    const totalSteps = GRADUATION_TOTAL_STEPS

    // 스텝 유효성 검사 (5단계: 기본정보 → 학창시절 → 지금감정 → 앞으로 → 이미지)
    const isStepValid = useCallback((step: number): boolean => {
        switch (step) {
            case 1:
                // 기본 정보: 이름, 성별, 졸업 유형 필수
                // 오프라인 모드에서는 PIN 4자리도 필수
                const basicValid = formData.name.length > 0 &&
                    formData.gender.length > 0 &&
                    formData.graduationType.length > 0
                if (isOffline) {
                    return basicValid && (formData.pin?.length === 4)
                }
                return basicValid
            case 2:
                // 학창 시절: 키워드 최소 1개
                return formData.pastStyles.length > 0
            case 3:
                // 현재: 감정 필수
                return formData.currentFeeling.length > 0
            case 4:
                // 미래: 키워드 최소 1개
                return formData.futureDreams.length > 0
            case 5:
                // 이미지: 필수
                return formData.image !== null
            default:
                return false
        }
    }, [formData, isOffline])

    // 토글 함수들 - 과거
    const togglePastStyle = useCallback((style: string) => {
        setFormData(prev => ({
            ...prev,
            pastStyles: prev.pastStyles.includes(style)
                ? prev.pastStyles.filter(s => s !== style)
                : prev.pastStyles.length < 3 ? [...prev.pastStyles, style] : prev.pastStyles
        }))
    }, [])

    const togglePastPersonality = useCallback((personality: string) => {
        setFormData(prev => ({
            ...prev,
            pastPersonalities: prev.pastPersonalities.includes(personality)
                ? prev.pastPersonalities.filter(p => p !== personality)
                : prev.pastPersonalities.length < 3 ? [...prev.pastPersonalities, personality] : prev.pastPersonalities
        }))
    }, [])

    // 토글 함수들 - 현재
    const setCurrentFeeling = useCallback((feeling: string) => {
        setFormData(prev => ({
            ...prev,
            currentFeeling: feeling
        }))
    }, [])

    const toggleCurrentGrowth = useCallback((growth: string) => {
        setFormData(prev => ({
            ...prev,
            currentGrowth: prev.currentGrowth.includes(growth)
                ? prev.currentGrowth.filter(g => g !== growth)
                : prev.currentGrowth.length < 4 ? [...prev.currentGrowth, growth] : prev.currentGrowth
        }))
    }, [])

    // 토글 함수들 - 미래
    const toggleFutureDream = useCallback((dream: string) => {
        setFormData(prev => ({
            ...prev,
            futureDreams: prev.futureDreams.includes(dream)
                ? prev.futureDreams.filter(d => d !== dream)
                : prev.futureDreams.length < 3 ? [...prev.futureDreams, dream] : prev.futureDreams
        }))
    }, [])

    const toggleFuturePersonality = useCallback((personality: string) => {
        setFormData(prev => ({
            ...prev,
            futurePersonality: prev.futurePersonality.includes(personality)
                ? prev.futurePersonality.filter(p => p !== personality)
                : prev.futurePersonality.length < 3 ? [...prev.futurePersonality, personality] : prev.futurePersonality
        }))
    }, [])

    // 기본 정보 설정
    const setName = useCallback((name: string) => {
        setFormData(prev => ({ ...prev, name }))
    }, [])

    const setGender = useCallback((gender: string) => {
        setFormData(prev => ({ ...prev, gender }))
    }, [])

    const setGraduationType = useCallback((graduationType: string) => {
        setFormData(prev => ({ ...prev, graduationType: graduationType as GraduationType }))
    }, [])

    const setSchoolName = useCallback((schoolName: string) => {
        setFormData(prev => ({ ...prev, schoolName }))
    }, [])

    // PIN 설정 (오프라인 모드용)
    const setPin = useCallback((pin: string) => {
        setFormData(prev => ({ ...prev, pin }))
    }, [])

    // 텍스트 필드 설정
    const setPastMemories = useCallback((memories: string) => {
        setFormData(prev => ({ ...prev, pastMemories: memories }))
    }, [])

    const setCurrentAchievements = useCallback((achievements: string) => {
        setFormData(prev => ({ ...prev, currentAchievements: achievements }))
    }, [])

    const setFutureWish = useCallback((wish: string) => {
        setFormData(prev => ({ ...prev, futureWish: wish }))
    }, [])

    // 네비게이션
    const handleNext = useCallback(() => {
        if (currentStep < totalSteps && isStepValid(currentStep)) {
            setCurrentStep(prev => prev + 1)
        }
    }, [currentStep, isStepValid, totalSteps])

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
            setFormData(prev => ({ ...prev, imagePreview: compressedBase64 }))
            setShowImageGuide(false)
        } catch (error) {
            console.error("이미지 압축 실패:", error)
            // 압축 실패 시 원본 사용
            const reader = new FileReader()
            reader.onload = (ev) => {
                const result = ev.target?.result as string
                setImagePreview(result)
                setFormData(prev => ({ ...prev, imagePreview: result }))
            }
            reader.readAsDataURL(file)
            setShowImageGuide(false)
        } finally {
            setIsCompressing(false)
        }
    }, [])

    const removeImage = useCallback(() => {
        setFormData(prev => ({ ...prev, image: null, imagePreview: null }))
        setImagePreview(null)
        setTransformedImagePreview(null)
    }, [])

    // 이미지 변환 (졸업사진 스타일)
    const handleTransformImage = useCallback(async () => {
        if (!imagePreview) return

        setIsTransforming(true)
        setFormData(prev => ({ ...prev, transformImage: true }))

        try {
            const response = await fetch('/api/graduation-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalImageBase64: imagePreview,
                    graduationType: formData.graduationType,
                    pastStyles: formData.pastStyles,
                    currentFeeling: formData.currentFeeling,
                    futureDreams: formData.futureDreams,
                    gender: formData.gender
                })
            })

            const result = await response.json()

            if (result.success && result.transformedImageBase64) {
                setTransformedImagePreview(result.transformedImageBase64)
                setFormData(prev => ({ ...prev, transformedImageUrl: result.transformedImageBase64 }))
                showToast('졸업사진 스타일로 변환되었습니다! 🎓', 'success', 3000)
            } else {
                showToast('이미지 변환에 실패했습니다. 원본으로 진행합니다.', 'info', 3000)
            }
        } catch (error) {
            console.error('이미지 변환 실패:', error)
            showToast('이미지 변환에 실패했습니다. 원본으로 진행합니다.', 'info', 3000)
        } finally {
            setIsTransforming(false)
        }
    }, [imagePreview, formData.graduationType, formData.pastStyles, formData.currentFeeling, formData.futureDreams, formData.gender, showToast])

    const skipTransform = useCallback(() => {
        setFormData(prev => ({ ...prev, transformImage: false }))
    }, [])

    // 폼 제출
    const handleComplete = useCallback(async () => {
        if (!isStepValid(5) || isSubmitting) return

        setIsSubmitting(true)
        showToast(`${formData.name}님의 졸업 기념 퍼퓸 분석을 시작합니다! 🎓`, "success", 4000)

        try {
            // 1. 먼저 이미지를 졸업사진 스타일로 변환
            let finalImageBase64 = imagePreview
            let graduationImageBase64: string | null = null

            if (imagePreview) {
                try {
                    console.log('[Graduation] 이미지 변환 시작...')
                    console.log('[Graduation] 과거:', formData.pastStyles, '현재:', formData.currentFeeling, '미래:', formData.futureDreams)
                    const transformResponse = await fetch('/api/graduation-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            originalImageBase64: imagePreview,
                            graduationType: formData.graduationType,
                            pastStyles: formData.pastStyles,
                            currentFeeling: formData.currentFeeling,
                            futureDreams: formData.futureDreams,
                            gender: formData.gender
                        })
                    })

                    const transformResult = await transformResponse.json()

                    if (transformResult.success && transformResult.transformedImageBase64) {
                        console.log('[Graduation] 이미지 변환 성공!')
                        graduationImageBase64 = transformResult.transformedImageBase64
                        finalImageBase64 = transformResult.transformedImageBase64
                        setTransformedImagePreview(transformResult.transformedImageBase64)
                    } else {
                        console.log('[Graduation] 이미지 변환 실패, 원본 사용:', transformResult.error)
                    }
                } catch (transformError) {
                    console.error('[Graduation] 이미지 변환 오류:', transformError)
                    // 변환 실패해도 원본으로 계속 진행
                }
            }

            // 2. 향수 분석 API 호출
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    programType: 'graduation',
                    formData: {
                        name: formData.name,
                        gender: formData.gender,
                        styles: [],
                        customStyle: '',
                        personalities: [],
                        customPersonality: '',
                        charmPoints: [],
                        customCharm: ''
                    },
                    graduationData: {
                        name: formData.name,
                        gender: formData.gender,
                        graduationType: formData.graduationType,
                        schoolName: formData.schoolName,
                        pastStyles: formData.pastStyles,
                        pastPersonalities: formData.pastPersonalities,
                        pastMemories: formData.pastMemories,
                        currentFeeling: formData.currentFeeling,
                        currentGrowth: formData.currentGrowth,
                        currentAchievements: formData.currentAchievements,
                        futureDreams: formData.futureDreams,
                        futurePersonality: formData.futurePersonality,
                        futureWish: formData.futureWish
                    },
                    imageBase64: finalImageBase64
                })
            })

            const result = await response.json()

            // 3. 저장 로직 - 변환된 이미지 우선 저장
            const saveToLocalStorage = (data: unknown) => {
                localStorage.removeItem('savedResultId')
                // 서비스 모드 저장: 오프라인 조건 확인
                const resolvedServiceMode = isOffline ? 'offline' : 'online'
                localStorage.setItem('serviceMode', resolvedServiceMode)
                localStorage.setItem('productType', 'graduation')
                localStorage.setItem('programType', 'graduation')
                localStorage.setItem('analysisResult', JSON.stringify(data))
                // 졸업사진 변환 이미지가 있으면 그걸 메인으로, 아니면 원본
                if (graduationImageBase64) {
                    localStorage.setItem('userImage', graduationImageBase64)
                    localStorage.setItem('transformedImage', graduationImageBase64)
                } else if (imagePreview) {
                    localStorage.setItem('userImage', imagePreview)
                }
                // userInfo 저장 - 오프라인 모드에서는 pin 포함
                const userInfoToSave = {
                    name: formData.name,
                    gender: formData.gender,
                    graduationType: formData.graduationType,
                    schoolName: formData.schoolName,
                    // 오프라인 모드에서만 pin 저장
                    ...(isOffline && { pin: formData.pin })
                }
                console.log('[useGraduationForm] Saving userInfo:', userInfoToSave, 'isOffline:', isOffline)
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
    }, [formData, imagePreview, isStepValid, isSubmitting, showToast, isOffline])

    // 문 열린 후 결과 페이지로 이동
    const navigateToResult = useCallback(() => {
        router.push('/result')
    }, [router])

    return {
        // 상태
        currentStep,
        totalSteps,
        formData,
        setFormData,
        imagePreview,
        transformedImagePreview,
        showImageGuide,
        setShowImageGuide,
        focusedField,
        setFocusedField,
        isSubmitting,
        isAnalysisComplete,
        isCompressing,
        isTransforming,
        isOnline,
        isOffline,

        // 유효성 검사
        isStepValid,

        // 기본 정보 함수
        setName,
        setGender,
        setGraduationType,
        setSchoolName,
        setPin,

        // 과거 토글 함수
        togglePastStyle,
        togglePastPersonality,
        setPastMemories,

        // 현재 토글 함수
        setCurrentFeeling,
        toggleCurrentGrowth,
        setCurrentAchievements,

        // 미래 토글 함수
        toggleFutureDream,
        toggleFuturePersonality,
        setFutureWish,

        // 네비게이션
        handleNext,
        handlePrev,
        navigateToResult,

        // 이미지 함수
        handleImageUpload,
        removeImage,
        handleTransformImage,
        skipTransform,

        // 제출
        handleComplete
    }
}
