// ===== Input Form 타입 정의 =====

export interface FormDataType {
    pin: string
    name: string
    gender: string
    styles: string[]
    customStyle: string
    personalities: string[]
    customPersonality: string
    charmPoints: string[]
    customCharm: string
    image: File | null
    // 피규어 온라인 모드 전용 - 3D 모델링용
    modelingImage: File | null
    modelingRequest: string
}

export interface StepProps {
    formData: FormDataType
    setFormData: React.Dispatch<React.SetStateAction<FormDataType>>
    isIdol: boolean
}

export interface Step1Props extends StepProps {
    focusedField: string | null
    setFocusedField: (field: string | null) => void
    isOnline: boolean
}

export interface Step2Props extends StepProps {
    toggleStyle: (style: string) => void
}

export interface Step3Props extends StepProps {
    togglePersonality: (personality: string) => void
}

export interface Step4Props extends StepProps {
    toggleCharmPoint: (point: string) => void
}

export interface Step5Props {
    imagePreview: string | null
    showImageGuide: boolean
    setShowImageGuide: (show: boolean) => void
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    removeImage: () => void
    isIdol: boolean
    isCompressing?: boolean
    // 피규어 온라인 모드 전용
    isFigureOnline?: boolean
    modelingImagePreview?: string | null
    modelingRequest?: string
    setModelingRequest?: (request: string) => void
    handleModelingImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
    removeModelingImage?: () => void
    isModelingCompressing?: boolean
}

export interface InputFieldProps {
    label: string
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    isFocused?: boolean
    onFocus?: () => void
    onBlur?: () => void
    type?: string
    center?: boolean
    letterSpacing?: boolean
}
