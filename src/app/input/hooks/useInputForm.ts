"use client"

import { useState, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { compressImage, base64ToBlob } from "@/lib/image/compressor"
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
    const mode = searchParams.get("mode") // "online" | null (오프라인)
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

    const isIdol = type === "idol_image" || type === "figure"
    const isOnline = mode === "online"
    const isFigureOnline = type === "figure" && isOnline

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

    // 네비게이션
    const handleNext = useCallback(() => {
        if (currentStep < 5 && isStepValid(currentStep)) {
            setCurrentStep(prev => prev + 1)
        }
    }, [currentStep, isStepValid])

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

    // 폼 제출
    const handleComplete = useCallback(async () => {
        if (!isStepValid(5) || isSubmitting) return

        setIsSubmitting(true)
        showToast(`${formData.name}님의 향수 분석을 시작합니다!`, "success", 4000)

        try {
            const response = await fetch('/api/analyze', {
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
                        customCharm: formData.customCharm
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

            // 공통 저장 로직
            const saveToLocalStorage = (data: unknown) => {
                localStorage.removeItem('savedResultId')
                localStorage.setItem('serviceMode', mode === 'online' ? 'online' : 'offline')
                if (isFigureOnline) {
                    localStorage.setItem('productType', 'figure_diffuser')
                }
                localStorage.setItem('analysisResult', JSON.stringify(data))
                if (imagePreview) {
                    localStorage.setItem('userImage', imagePreview)
                }
                if (isFigureOnline && modelingImagePreview) {
                    localStorage.setItem('modelingImage', modelingImagePreview)
                    localStorage.setItem('modelingRequest', formData.modelingRequest || '')
                }
                localStorage.setItem('userInfo', JSON.stringify({
                    name: formData.name,
                    gender: formData.gender
                }))
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
    }, [formData, imagePreview, modelingImagePreview, isFigureOnline, isStepValid, isSubmitting, showToast, mode])

    // 문 열린 후 결과 페이지로 이동
    const navigateToResult = useCallback(() => {
        router.push('/result')
    }, [router])

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
