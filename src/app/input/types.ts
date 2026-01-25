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
