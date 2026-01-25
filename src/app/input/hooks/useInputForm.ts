"use client"

import { useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"
import { compressImage } from "@/lib/image/compressor"
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
    image: null
}

export function useInputForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { showToast } = useToast()
    const type = searchParams.get("type")
    const mode = searchParams.get("mode") // "online" | null (오프라인)

    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCompressing, setIsCompressing] = useState(false)
    const [formData, setFormData] = useState<FormDataType>(INITIAL_FORM_DATA)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [showImageGuide, setShowImageGuide] = useState(true)
    const [focusedField, setFocusedField] = useState<string | null>(null)

    const isIdol = type === "idol_image" || type === "figure"
    const isOnline = mode === "online"

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
            case 5: return formData.image !== null
            default: return false
        }
    }, [formData, isOnline])

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
                    imageBase64: imagePreview
                })
            })

            const result = await response.json()

            if (result.success) {
                // 새 분석 시작 시 이전 저장 ID 초기화 (중복 저장 방지 로직 리셋)
                localStorage.removeItem('savedResultId')
                // 서비스 모드 저장 (online/offline - 결과 페이지에서 버튼 분기용)
                localStorage.setItem('serviceMode', mode || 'offline')
                localStorage.setItem('analysisResult', JSON.stringify(result.data))
                if (imagePreview) {
                    localStorage.setItem('userImage', imagePreview)
                }
                // 사용자 정보 저장 (이름, 성별)
                localStorage.setItem('userInfo', JSON.stringify({
                    name: formData.name,
                    gender: formData.gender
                }))
                showToast('분석 완료! 🎉', 'success', 2000)
                setTimeout(() => router.push('/result'), 1000)
            } else {
                // 새 분석 시작 시 이전 저장 ID 초기화 (중복 저장 방지 로직 리셋)
                localStorage.removeItem('savedResultId')
                // 서비스 모드 저장 (online/offline - 결과 페이지에서 버튼 분기용)
                localStorage.setItem('serviceMode', mode || 'offline')
                localStorage.setItem('analysisResult', JSON.stringify(result.fallback))
                if (imagePreview) {
                    localStorage.setItem('userImage', imagePreview)
                }
                localStorage.setItem('userInfo', JSON.stringify({
                    name: formData.name,
                    gender: formData.gender
                }))
                showToast('분석에 문제가 있어 샘플 결과를 보여드립니다.', 'info', 3000)
                setTimeout(() => router.push('/result'), 1500)
            }
        } catch (error) {
            console.error('분석 오류:', error)
            showToast('오류가 발생했습니다. 다시 시도해주세요.', 'error', 3000)
            setIsSubmitting(false)
        }
    }, [formData, imagePreview, isStepValid, isSubmitting, router, showToast, mode])

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
        isCompressing,
        isIdol,
        isOnline,

        // 함수들
        isStepValid,
        toggleStyle,
        togglePersonality,
        toggleCharmPoint,
        handleNext,
        handlePrev,
        handleImageUpload,
        removeImage,
        handleComplete
    }
}
