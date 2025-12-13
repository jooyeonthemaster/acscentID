// ===== Input Form 상수 정의 =====

export const STYLES = [
    "귀여운", "섹시한", "시크한", "우아한",
    "활발한", "청량한", "레트로", "캐주얼"
] as const

export const PERSONALITIES = [
    "밝은", "차분한", "유머러스한", "수줍은",
    "자신감 있는", "사려 깊은", "열정적인", "다정한"
] as const

export const CHARM_POINTS = [
    "눈웃음", "목소리", "손", "분위기",
    "눈빛", "미소", "말투", "제스처"
] as const

export const TOTAL_STEPS = 5

export const GENDER_OPTIONS = [
    { key: "Male", label: "남성" },
    { key: "Female", label: "여성" },
    { key: "Other", label: "기타" }
] as const
